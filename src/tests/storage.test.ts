import 'fake-indexeddb/auto';
import { describe,it,expect,beforeEach } from 'vitest';
import { addHistory, clearHistory, deleteDatabase, getDatabase, getDatabases, getHistory, getPreference, getQueries, putDatabase, putQuery, resetStorage, setPreference } from '../storage/db';
import type { ExecutionRecord } from '../types';
beforeEach(async()=>{await resetStorage();});
describe('IndexedDB workspace storage',()=>{
 it('stores and retrieves local databases',async()=>{await putDatabase({id:'s1',name:'DB',mode:'sql',created:1,updated:1,sqlBytes:new Uint8Array([1,2,3])});const db=await getDatabase('s1');expect(db?.sqlBytes).toEqual(new Uint8Array([1,2,3]));expect(await getDatabases()).toHaveLength(1);await deleteDatabase('s1');expect(await getDatabases()).toEqual([]);});
 it('stores local document collections',async()=>{await putDatabase({id:'d1',name:'Docs',mode:'nosql',created:1,updated:1,collections:{items:[{_id:'1',name:'Test'}]}});expect((await getDatabase('d1'))?.collections?.items[0].name).toBe('Test');});
 it('persists saved queries and preferences',async()=>{await putQuery({id:'q1',mode:'sql',title:'Example',query:'SELECT 1',folder:'General',description:'',updated:1});await setPreference('theme','dark');expect((await getQueries())[0].query).toBe('SELECT 1');expect(await getPreference('theme','light')).toBe('dark');});
 it('records query history and clears it',async()=>{const record:ExecutionRecord={id:'h1',databaseId:'d1',databaseName:'DB',mode:'sql',query:'SELECT 1',elapsed:1,rows:1,at:100,success:true};await addHistory(record);expect(await getHistory()).toHaveLength(1);await clearHistory();expect(await getHistory()).toHaveLength(0);});
 it('fully resets local data',async()=>{await setPreference('completed',['q1']);await putDatabase({id:'x',name:'X',mode:'nosql',created:1,updated:1,collections:{}});await resetStorage();expect(await getDatabases()).toEqual([]);expect(await getPreference('completed',[])).toEqual([]);});
});
