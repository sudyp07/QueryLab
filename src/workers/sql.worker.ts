/// <reference lib="webworker" />
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { SchemaInfo, SqlResult, Cell } from '../types';
import { quoteId, normalizeResult, sqlValue } from '../lib/utils';
let engine: SqlJsStatic | undefined;
let db: Database | undefined;
const ensure = async () => { if (!engine) engine = await initSqlJs({locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`}); return engine; };
const getDB = () => { if (!db) throw new Error('No SQL database is open.'); return db; };
function inspect(): SchemaInfo {
  const conn = getDB();
  const records = conn.exec("SELECT name,type FROM sqlite_master WHERE (type='table' OR type='view') AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? [];
  const tables = records.map(([name, kind]) => {
    const tableName = String(name);
    const columns = (conn.exec(`PRAGMA table_info(${quoteId(tableName)})`)[0]?.values ?? []).map(row => ({name:String(row[1]),type:String(row[2] ?? ''),notnull:Boolean(row[3]),defaultValue:row[4] === null ? null : String(row[4]),pk:Number(row[5])}));
    const foreignKeys = (conn.exec(`PRAGMA foreign_key_list(${quoteId(tableName)})`)[0]?.values ?? []).map(row => ({table:String(row[2]),from:String(row[3]),to:String(row[4])}));
    const indexes = (conn.exec(`PRAGMA index_list(${quoteId(tableName)})`)[0]?.values ?? []).map(row => ({name:String(row[1]),unique:Boolean(row[2])}));
    const count = Number(conn.exec(`SELECT COUNT(*) FROM ${quoteId(tableName)}`)[0]?.values[0]?.[0] ?? 0);
    return {name:tableName,type:kind === 'view' ? 'view' as const : 'table' as const,columns,foreignKeys,indexes,count};
  });
  return {tables,triggers:(conn.exec("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")[0]?.values ?? []).map(r => String(r[0])),pageCount:Number(conn.exec('PRAGMA page_count')[0]?.values[0]?.[0] ?? 0),pageSize:Number(conn.exec('PRAGMA page_size')[0]?.values[0]?.[0] ?? 0)};
}
function execute(sql: string): SqlResult {
  const conn = getDB(); const start = performance.now();
  const sets = conn.exec(sql); const last = sets.at(-1);
  return {columns:last?.columns ?? [],values:(last?.values ?? []) as Cell[][],affected:conn.getRowsModified(),elapsed:performance.now()-start,statements:sets.length,message:last ? 'Query executed' : 'Statement completed'};
}
function dumpSql() {
  const conn = getDB();
  const rows = conn.exec("SELECT name,type,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 2 ELSE 3 END")[0]?.values ?? [];
  const lines = ['PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];
  for (const [name, type, statement] of rows) {
    if (type !== 'table') continue;
    lines.push(`${statement};`);
    const table = String(name);
    const items = conn.exec(`SELECT * FROM ${quoteId(table)}`)[0]?.values ?? [];
    for (const cells of items) lines.push(`INSERT INTO ${quoteId(table)} VALUES (${cells.map(sqlValue).join(', ')});`);
  }
  for (const [,type,statement] of rows) if (type !== 'table') lines.push(`${statement};`);
  lines.push('COMMIT;', 'PRAGMA foreign_keys=ON;');
  return lines.join('\n');
}
self.onmessage = async (event: MessageEvent<{id:number;action:string;data?:unknown}>) => {
  const {id,action,data} = event.data;
  try {
    const sql = await ensure(); let result: unknown;
    if (action === 'open') { db?.close(); db = data ? new sql.Database(new Uint8Array(data as ArrayBuffer)) : new sql.Database(); db.run('PRAGMA foreign_keys=ON;'); result = inspect(); }
    else if (action === 'execute') result = execute(String(data));
    else if (action === 'schema') result = inspect();
    else if (action === 'bytes') result = getDB().export();
    else if (action === 'dump') result = dumpSql();
    else if (action === 'evaluate') {
      const {candidate,solution} = data as {candidate:string;solution:string};
      if (!/^\s*(SELECT|WITH)\b/i.test(candidate.trim()) || /;\s*\S/.test(candidate.trim())) throw new Error('Challenges accept one SELECT or WITH query only.');
      const original = getDB(); const clone = new sql.Database(original.export());
      try { const expected = clone.exec(solution).at(-1); const actual = clone.exec(candidate).at(-1);
        result = {correct:normalizeResult(expected?.values ?? []) === normalizeResult(actual?.values ?? []) && normalizeResult(expected?.columns ?? []) === normalizeResult(actual?.columns ?? []), expectedRows:expected?.values.length ?? 0, returnedRows:actual?.values.length ?? 0};
      } finally { clone.close(); }
    } else throw new Error(`Unknown SQL action: ${action}`);
    if (result instanceof Uint8Array) self.postMessage({id,ok:true,result}, {transfer:[result.buffer as ArrayBuffer]});
    else self.postMessage({id,ok:true,result});
  } catch(error) { self.postMessage({id,ok:false,error:error instanceof Error ? error.message : String(error)}); }
};
