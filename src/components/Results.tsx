import { useMemo, useState } from 'react';
import { Download, Copy, Table2, Braces, AlertCircle, Check, CircleHelp } from 'lucide-react';
import type { SqlResult, NoSqlResult, Mode } from '../types';
import { showCell, toCSV, downloadFile, formatMs, fileSafe } from '../lib/utils';
interface Props {mode:Mode; result:SqlResult|NoSqlResult|null; error?:string; busy:boolean; databaseName:string; onClear:()=>void}
function JsonTree({value,label,level=0}:{value:unknown;label?:string;level?:number}){
 const complex=value!==null&&typeof value==='object';
 if(!complex)return <div className="json-tree-scalar" style={{paddingLeft:level*13}}>{label&&<span className="json-key">{label}: </span>}<span className={typeof value==='string'?'json-string':typeof value==='number'?'json-number':'json-other'}>{JSON.stringify(value)}</span></div>;
 const items=Array.isArray(value)?value.map((v,i)=>[String(i),v] as const):Object.entries(value as Record<string,unknown>);
 return <details className="json-tree-node" style={{marginLeft:level?13:0}} open={level<2}><summary><span className="json-key">{label??(Array.isArray(value)?'Array':'Object')}</span><span className="json-subtitle">{Array.isArray(value)?`[${items.length}]`:`{${items.length} fields}`}</span></summary><div className="json-tree-children">{items.map(([key,entry])=><JsonTree key={key} label={key} value={entry} level={level+1}/>)}</div></details>;
}
export default function Results({mode,result,error,busy,databaseName,onClear}:Props) {
 const [format,setFormat]=useState<'table'|'json'>('table');const [jsonStyle,setJsonStyle]=useState<'raw'|'tree'>('tree');const [page,setPage]=useState(0);const perPage=100;
 const {columns,rows,json}=useMemo(()=>{
  if(!result)return {columns:[] as string[],rows:[] as unknown[][],json:[] as Record<string,unknown>[]};
  if(mode==='sql'){const r=result as SqlResult;return {columns:r.columns,rows:r.values as unknown[][],json:r.values.map(line=>Object.fromEntries(r.columns.map((col,i)=>[col,line[i]])))};}
  const r=result as NoSqlResult;return {columns:r.columns,rows:r.documents.map(d=>r.columns.map(col=>d[col])),json:r.documents};
 },[mode,result]);
 const totalPages=Math.max(1,Math.ceil(rows.length/perPage));const currentPage=Math.min(page,totalPages-1);
 const copy=()=>{void navigator.clipboard?.writeText(format==='json'?JSON.stringify(json,null,2):toCSV(columns,rows));};
 const save=()=>{const text=format==='json'?JSON.stringify(json,null,2):toCSV(columns,rows);downloadFile(`${fileSafe(databaseName)}-result.${format==='json'?'json':'csv'}`,text,format==='json'?'application/json':'text/csv');};
 return <section className="results-panel" aria-label="Query results">
  <div className="panel-header"><div className="panel-heading"><Table2 size={14}/><strong>Results</strong>{result&&!error&&<span className="panel-count">{rows.length} rows</span>}</div>
   <div className="panel-actions">{result&&rows.length>0&&<><div className="segmented"><button onClick={()=>{setFormat('table');setPage(0);}} className={format==='table'?'selected':''} title="Table view"><Table2 size={14}/></button><button onClick={()=>setFormat('json')} className={format==='json'?'selected':''} title="JSON view"><Braces size={14}/></button></div><button className="icon-button" onClick={copy} title="Copy result"><Copy size={14}/></button><button className="icon-button" onClick={save} title="Download result"><Download size={14}/></button></>}{(result||error)&&<button className="muted-button small" onClick={onClear}>Clear</button>}</div>
  </div>
  {busy ? <div className="empty-state"><div className="loader"/><strong>Executing query</strong><p>The database engine is processing your request.</p></div>
  :error?<div className="error-box" role="alert"><AlertCircle size={18}/><div><strong>Execution failed</strong><pre>{error}</pre></div></div>
  :!result?<div className="empty-state"><CircleHelp size={23}/><strong>Run a query to see results</strong><p>Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> or select Run. All operations execute locally.</p></div>
  :<><div className="result-summary"><span className="success-marker"><Check size={12}/> {result.message}</span><span>{formatMs(result.elapsed)}</span>{result.affected>0&&<span>{result.affected} affected</span>}{mode==='nosql'&&<span>In-memory document operations</span>}</div>
   {rows.length===0?<div className="empty-state compact"><strong>No rows returned</strong><p>Your statement completed successfully. Try a SELECT or find operation to inspect records.</p></div>
   :format==='json'?<div className="json-area"><div className="json-display-toggle"><button className={jsonStyle==='tree'?'active':''} onClick={()=>setJsonStyle('tree')}>Tree</button><button className={jsonStyle==='raw'?'active':''} onClick={()=>setJsonStyle('raw')}>Raw JSON</button></div>{jsonStyle==='raw'?<pre className="json-output">{JSON.stringify(json,null,2)}</pre>:<div className="json-tree-scroll">{json.map((item,i)=><JsonTree key={i} label={`Document ${i+1}`} value={item}/>)}</div>}</div>
   :<div className="result-scroll"><table className="data-table"><thead><tr><th className="row-number">#</th>{columns.map((col,i)=><th key={`${col}-${i}`}>{col}</th>)}</tr></thead><tbody>{rows.slice(currentPage*perPage,(currentPage+1)*perPage).map((row,i)=><tr key={i}><td className="row-number">{currentPage*perPage+i+1}</td>{row.map((cell,j)=><td key={j} title={showCell(cell)} className={cell===null||cell===undefined?'null-value':''}>{showCell(cell)}</td>)}</tr>)}</tbody></table></div>}
   {format==='table'&&rows.length>perPage&&<div className="result-pages"><span>Rows {currentPage*perPage+1}–{Math.min((currentPage+1)*perPage,rows.length)} of {rows.length}</span><button disabled={currentPage===0} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={currentPage>=totalPages-1} onClick={()=>setPage(p=>p+1)}>Next</button></div>}
  </>}
 </section>;
}
