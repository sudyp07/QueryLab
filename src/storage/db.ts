import { openDB } from 'idb';
import type { DatabaseRecord, ExecutionRecord, SavedQuery } from '../types';
const database = openDB('querylab-local-v1', 1, { upgrade(db) {
  for (const name of ['databases', 'history', 'queries', 'preferences']) db.createObjectStore(name, { keyPath: 'id' });
} });
export async function getDatabases(): Promise<DatabaseRecord[]> { return (await (await database).getAll('databases')) as DatabaseRecord[]; }
export async function putDatabase(record: DatabaseRecord) { await (await database).put('databases', record); }
export async function deleteDatabase(id: string) { await (await database).delete('databases', id); }
export async function getDatabase(id: string): Promise<DatabaseRecord | undefined> { return (await (await database).get('databases', id)) as DatabaseRecord | undefined; }
export async function getHistory(): Promise<ExecutionRecord[]> { return ((await (await database).getAll('history')) as ExecutionRecord[]).sort((a,b) => b.at - a.at); }
export async function addHistory(record: ExecutionRecord) { const db = await database; await db.put('history', record); const all = await getHistory(); if (all.length > 250) { const tx = db.transaction('history', 'readwrite'); for (const item of all.slice(250)) tx.store.delete(item.id); await tx.done; } }
export async function clearHistory() { await (await database).clear('history'); }
export async function getQueries(): Promise<SavedQuery[]> { return ((await (await database).getAll('queries')) as SavedQuery[]).sort((a,b) => b.updated - a.updated); }
export async function putQuery(query: SavedQuery) { await (await database).put('queries', query); }
export async function deleteQuery(id: string) { await (await database).delete('queries', id); }
export async function getPreference<T>(id: string, defaultValue: T): Promise<T> { const v = await (await database).get('preferences', id) as {id:string;value:T} | undefined; return v?.value ?? defaultValue; }
export async function setPreference<T>(id: string, value: T) { await (await database).put('preferences', { id, value }); }
export async function resetStorage() { const db = await database; for (const store of ['databases','history','queries','preferences']) await db.clear(store); }
export async function exportWorkspace() { return { format:'querylab-workspace', version:1, exportedAt:new Date().toISOString(), databases:await getDatabases(), queries:await getQueries(), history:await getHistory(), completed:await getPreference<string[]>('completed',[]) }; }
