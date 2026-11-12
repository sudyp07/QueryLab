import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import Papa from 'papaparse';
import { format as formatSql } from 'sql-formatter';
import { Activity, ArrowRight, BookOpen, BookOpenCheck, Braces, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Code2, Command, Database, Download, FileCode2, FileJson2, Files, GraduationCap, Info, Layers3, LayoutDashboard, Moon, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Play, Plus, RefreshCw, Save, Search, Settings2, Sun, Table2, TerminalSquare, Trash2, Upload, X } from 'lucide-react';
import type { Challenge, DatabaseRecord, EditorTab, ExecutionRecord, Mode, NoSqlResult, Page, SavedQuery, SchemaInfo, SqlResult } from './types';
import { sqlClient } from './engines/sqlClient';
import { inferDocumentSchema, runDocumentQuery } from './engines/documentEngine';
import { documentExamples, documentSamples, sqlExamples, sqlSamples } from './data/samples';
import { lessons } from './data/lessons';
import { addHistory, clearHistory, deleteDatabase, deleteQuery, getDatabases, getHistory, getPreference, getQueries, putDatabase, putQuery, resetStorage, setPreference } from './storage/db';
import { downloadFile, fileSafe, friendlyError, fromBase64, normalizeResult, quoteId, sqlValue, toBase64, toCSV, uid } from './lib/utils';
import CodeEditor from './components/CodeEditor';
import Explorer from './components/Explorer';
import Results from './components/Results';
import SchemaDiagram from './components/SchemaDiagram';
import Modal from './components/Modal';
import TableDesigner from './components/TableDesigner';
import HomeView from './views/HomeView';
import CompareView from './views/CompareView';
import SettingsView from './views/SettingsView';
import LearnView from './views/LearnView';
import HistoryView from './views/HistoryView';
import './styles/app.css';

type Theme = 'light'|'dark';
const freshTab = (mode:Mode,text?:string,title?:string):EditorTab => ({id:uid(),mode,title:title??(mode==='sql'?'Untitled SQL':'Untitled JSON'),text:text??(mode==='sql'?sqlExamples[0].query:documentExamples[0].query)});
const icons:Record<Page,typeof Database>={home:LayoutDashboard,sql:Code2,nosql:Braces,designer:Layers3,learn:GraduationCap,compare:Files,history:Clock3,settings:Settings2};
const labels:Record<Page,string>={home:'Overview',sql:'SQL editor',nosql:'Documents',designer:'Schema designer',learn:'Learning center',compare:'SQL vs NoSQL',history:'Query library',settings:'Settings'};
function initialTheme():Theme{return typeof localStorage!=='undefined'&&localStorage.getItem('querylab-theme')==='dark'?'dark':'light';}

// An error boundary deliberately wraps every view, including database explorer and editor.
class ReactBoundary extends Component<{children:ReactNode},{hasError:boolean}>{state={hasError:false};static getDerivedStateFromError(){return {hasError:true};}render(){return this.props.children;}}
class AppErrorBoundary extends ReactBoundary {
 render() { if(this.state.hasError)return <div className="fatal"><h1>QueryLab encountered an error</h1><p>The workspace is stored in your browser. Reload the application to try again.</p><button onClick={()=>location.reload()}>Reload</button></div>;return this.props.children; }
}

export default function App(){
 const [page,setPage]=useState<Page>('sql');
 const [mode,setMode]=useState<Mode>('sql');
 const [theme,setTheme]=useState<Theme>(initialTheme);
 const [databases,setDatabases]=useState<DatabaseRecord[]>([]);
 const [activeId,setActiveId]=useState('');
 const [schema,setSchema]=useState<SchemaInfo|null>(null);
 const [tabs,setTabs]=useState<EditorTab[]>([freshTab('sql'),freshTab('nosql')]);
 const [tabId,setTabId]=useState('');
 const [history,setHistory]=useState<ExecutionRecord[]>([]);
 const [saved,setSaved]=useState<SavedQuery[]>([]);
 const [completed,setCompleted]=useState<string[]>([]);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<SqlResult|NoSqlResult|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState<{kind:'ok'|'error';text:string}|null>(null);
 const [sidebarOpen,setSidebarOpen]=useState(true);
 const [inspectorOpen,setInspectorOpen]=useState(true);
 const [commandOpen,setCommandOpen]=useState(false);
 const [commandText,setCommandText]=useState('');
 const [modal,setModal]=useState<'newdb'|'newtable'|'newcollection'|'shortcuts'|'savequery'|'addcolumn'|null>(null);
 const [newName,setNewName]=useState('');
 const [modalMode,setModalMode]=useState<Mode>('sql');
 const [menu,setMenu]=useState<'examples'|'export'|null>(null);
 const [lessonId,setLessonId]=useState('select');
 const [selectedChallenge,setSelectedChallenge]=useState<Challenge|null>(null);
 const [historySearch,setHistorySearch]=useState('');
 const [editorPct,setEditorPct]=useState(52);
 const [online,setOnline]=useState(navigator.onLine);
 const [addColumnTable,setAddColumnTable]=useState('');
 const [addColumnName,setAddColumnName]=useState('');
 const [addColumnType,setAddColumnType]=useState('TEXT');
 const [saveQueryTitle,setSaveQueryTitle]=useState('');
 const [saveQueryFolder,setSaveQueryFolder]=useState('General');
 const [saveQueryDesc,setSaveQueryDesc]=useState('');
 const [challengeFeedback,setChallengeFeedback]=useState<{ok:boolean;text:string}|null>(null);
 const editorRef=useRef<ReactCodeMirrorRef|null>(null);
 const workArea=useRef<HTMLDivElement|null>(null);
 const fileRef=useRef<HTMLInputElement|null>(null);
 const backupRef=useRef<HTMLInputElement|null>(null);
 const inited=useRef(false);
 const activeDb=databases.find(d=>d.id===activeId);
 const currentTab=tabs.find(t=>t.id===tabId)??tabs.find(t=>t.mode===mode);
 const activeQuery=currentTab?.text??'';
 const activeDbCount=mode==='sql'?schema?.tables.length??0:Object.keys(activeDb?.collections??{}).length;
 const currentDocuments=activeDb?.mode==='nosql'?activeDb.collections??{}:{};

 const pushNotice=(text:string,kind:'ok'|'error'='ok')=>{setNotice({text,kind});};
 const reloadMetadata=async()=>{const all=await getDatabases();setDatabases(all);};
 const refreshSchema=async()=>{if(mode==='sql'&&activeDb?.mode==='sql')setSchema(await sqlClient.inspect());else await reloadMetadata();};
 const persistSql=async()=>{const current=databases.find(d=>d.id===activeId);if(!current||current.mode!=='sql')return;const bytes=await sqlClient.bytes();const record={...current,sqlBytes:bytes,updated:Date.now()};await putDatabase(record);setDatabases(old=>old.map(d=>d.id===record.id?record:d));setSchema(await sqlClient.inspect());};
 useEffect(()=>{if(inited.current)return;inited.current=true;let cancelled=false;
  (async()=>{try{
   let all=await getDatabases();if(all.length===0){
    await sqlClient.open();await sqlClient.execute(sqlSamples.University);
    const sqlRecord:DatabaseRecord={id:uid(),name:'University',mode:'sql',created:Date.now(),updated:Date.now(),sqlBytes:await sqlClient.bytes()};
    const docsRecord:DatabaseRecord={id:uid(),name:'Campus',mode:'nosql',created:Date.now(),updated:Date.now(),collections:structuredClone(documentSamples.Campus)};
    await putDatabase(sqlRecord);await putDatabase(docsRecord);all=[sqlRecord,docsRecord];
   }
   const restoredTabs=await getPreference<EditorTab[]>('tabs',[]);
   const restoredActive=await getPreference<string>('activeDatabase','');
   const initialDb=all.find(d=>d.id===restoredActive&&d.mode==='sql')??all.find(d=>d.mode==='sql')??all[0];
   if(initialDb?.mode==='sql')setSchema(await sqlClient.open(initialDb.sqlBytes));
   if(cancelled)return;
   setDatabases(all);setActiveId(initialDb?.id??'');setMode(initialDb?.mode??'sql');setPage(initialDb?.mode??'sql');
   if(restoredTabs.length){const safe=restoredTabs.filter(t=>t.mode==='sql'||t.mode==='nosql');if(safe.length){setTabs(safe);setTabId(safe.find(t=>t.mode===(initialDb?.mode??'sql'))?.id??safe[0].id);}}else setTabs(prev=>{setTabId(prev[0].id);return prev;});
   setHistory(await getHistory());setSaved(await getQueries());setCompleted(await getPreference<string[]>('completed',[]));setReady(true);
  }catch(err){pushNotice(`Initialization failed: ${friendlyError(err)}`,'error');setReady(true);}})();return()=>{cancelled=true;};
 },[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('querylab-theme',theme);},[theme]);
 useEffect(()=>{const online=()=>setOnline(navigator.onLine);window.addEventListener('online',online);window.addEventListener('offline',online);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',online);};},[]);
 useEffect(()=>{if(!ready)return;const timeout=setTimeout(()=>{void setPreference('tabs',tabs);void setPreference('activeDatabase',activeId);void setPreference('completed',completed);},350);return()=>clearTimeout(timeout);},[tabs,activeId,completed,ready]);
 const updateTab=(text:string)=>setTabs(old=>old.map(t=>t.id===currentTab?.id?{...t,text}:t));
 const openNewTab=(targetMode:Mode,text?:string,title?:string)=>{const t=freshTab(targetMode,text,title);setTabs(old=>[...old,t]);setTabId(t.id);setMode(targetMode);setPage(targetMode);setResult(null);setError('');};
 const closeTab=(id:string)=>{const tab=tabs.find(t=>t.id===id);if(!tab)return;const remaining=tabs.filter(t=>t.id!==id);if(!remaining.length){const replacement=freshTab(tab.mode);setTabs([replacement]);setTabId(replacement.id);return;}setTabs(remaining);if(tabId===id)setTabId(remaining.find(t=>t.mode===mode)?.id??remaining[0].id);};
 const switchDb=async(id:string,showEditor=true)=>{const db=databases.find(d=>d.id===id);if(!db||busy)return;setBusy(true);try{if(db.mode==='sql')setSchema(await sqlClient.open(db.sqlBytes));else setSchema(null);setActiveId(db.id);setMode(db.mode);if(showEditor)setPage(db.mode);const tab=tabs.find(t=>t.mode===db.mode);if(tab)setTabId(tab.id);else openNewTab(db.mode);setResult(null);setError('');}catch(err){pushNotice(friendlyError(err),'error');}finally{setBusy(false);}};
 const goPage=(target:Page)=>{setMenu(null);setPage(target);if(target==='sql'||target==='nosql'){setMode(target);const db=databases.find(d=>d.mode===target);if(db&&activeDb?.mode!==target){void switchDb(db.id,false);}const tab=tabs.find(t=>t.mode===target);if(tab)setTabId(tab.id);else openNewTab(target);}if(target==='learn'&&!lessons.find(l=>l.id===lessonId))setLessonId('select');};
 const execute=async(textOverride?:string,explain=false)=>{
  if(busy)return;const selection=editorRef.current?.view?.state.selection.main;const doc=editorRef.current?.view?.state.doc;
  const selected=(selection&&!selection.empty&&doc)?doc.sliceString(selection.from,selection.to):'';
  const query=(textOverride??(selected||activeQuery)).trim();if(!query){pushNotice('Enter a query before running it.','error');return;}
  if(!activeDb||activeDb.mode!==mode){pushNotice(`Select a ${mode==='sql'?'SQL':'document'} database first.`,'error');return;}
  setBusy(true);setError('');setResult(null);setChallengeFeedback(null);const start=performance.now();let success=false;let rows=0;let execError='';
  try{
   if(mode==='sql'){
    const code=explain?`EXPLAIN QUERY PLAN ${query.replace(/;\s*$/,'')}`:query;
    const output=await sqlClient.execute(code);setResult(output);rows=output.values.length;success=true;
    if(!explain)await persistSql();
   }else{
    let request;try{request=JSON.parse(query);}catch{throw new Error('Invalid JSON. Check commas, quotes and brackets.');}
    const run=runDocumentQuery(activeDb.collections??{},request);setResult(run.result);rows=run.result.documents.length;success=true;
    if(run.changed){const record={...activeDb,collections:run.state,updated:Date.now()};await putDatabase(record);setDatabases(old=>old.map(d=>d.id===record.id?record:d));}
   }
  }catch(err){execError=friendlyError(err);setError(execError);
   if(mode==='sql'&&!explain){try{await persistSql();}catch{/* preserve original error */}}
  }finally{setBusy(false);const record:ExecutionRecord={id:uid(),databaseId:activeDb.id,databaseName:activeDb.name,mode,query,at:Date.now(),elapsed:performance.now()-start,rows,success,error:execError||undefined};void addHistory(record).then(()=>getHistory()).then(setHistory).catch(()=>{});}
 };
 const formatQuery=()=>{if(!activeQuery.trim())return;try{updateTab(mode==='sql'?formatSql(activeQuery,{language:'sqlite',keywordCase:'upper',tabWidth:2}):JSON.stringify(JSON.parse(activeQuery),null,2));pushNotice('Query formatted');}catch(err){pushNotice(`Cannot format: ${friendlyError(err)}`,'error');}};
 const openSaveQuery=()=>{setSaveQueryTitle(currentTab?.title.replace(/Untitled /,'')||'My query');setSaveQueryFolder('General');setSaveQueryDesc('');setModal('savequery');};
 const saveQuery=async()=>{if(!activeQuery.trim())return pushNotice('There is no query to save.','error');const record:SavedQuery={id:uid(),title:saveQueryTitle.trim()||'Untitled query',folder:saveQueryFolder.trim()||'General',description:saveQueryDesc,mode,query:activeQuery,updated:Date.now()};await putQuery(record);setSaved(await getQueries());setTabs(old=>old.map(t=>t.id===tabId?{...t,title:record.title}:t));setModal(null);pushNotice('Query saved to your local library');};
 const addDatabase=async()=>{
  const name=newName.trim();if(!name||name.length>60)return pushNotice('Enter a database name (1–60 characters).','error');if(databases.some(d=>d.name.toLowerCase()===name.toLowerCase()&&d.mode===modalMode))return pushNotice('A database with this name already exists.','error');
  setBusy(true);try{const record:DatabaseRecord={id:uid(),name,mode:modalMode,created:Date.now(),updated:Date.now()};if(modalMode==='sql'){await sqlClient.open();record.sqlBytes=await sqlClient.bytes();setSchema(await sqlClient.inspect());}else record.collections={};await putDatabase(record);setDatabases(old=>[...old,record]);setActiveId(record.id);setMode(modalMode);setPage(modalMode);const tab=tabs.find(t=>t.mode===modalMode);if(tab)setTabId(tab.id);else openNewTab(modalMode);setResult(null);setModal(null);pushNotice(`Database "${name}" created`);}catch(err){pushNotice(friendlyError(err),'error');}finally{setBusy(false);}
 };
 const deleteDb=async(id:string)=>{const selected=databases.find(d=>d.id===id);if(!selected||!window.confirm(`Delete "${selected.name}" and all its local data? This cannot be undone.`))return;await deleteDatabase(id);const next=databases.filter(d=>d.id!==id);setDatabases(next);if(id===activeId){const fallback=next.find(d=>d.mode===mode)??next[0];if(fallback){setActiveId(fallback.id);setMode(fallback.mode);if(fallback.mode==='sql')setSchema(await sqlClient.open(fallback.sqlBytes));else setSchema(null);}else{setActiveId('');setSchema(null);}}pushNotice('Database deleted');};
 const deleteObject=async(name:string)=>{if(!activeDb||!window.confirm(`Delete ${mode==='sql'?'table or view':'collection'} "${name}"? All records will be deleted.`))return;
  try{if(mode==='sql'){const item=schema?.tables.find(t=>t.name===name);await sqlClient.execute(`DROP ${item?.type==='view'?'VIEW':'TABLE'} ${quoteId(name)};`);await persistSql();}
  else {const updated={...activeDb,collections:{...activeDb.collections}};delete updated.collections![name];await putDatabase(updated);setDatabases(old=>old.map(d=>d.id===updated.id?updated:d));}pushNotice(`${name} deleted`);}catch(err){pushNotice(friendlyError(err),'error');}
 };
 const openObject=(name:string)=>{if(mode==='sql')openNewTab('sql',`SELECT *\nFROM ${quoteId(name)}\nLIMIT 100;`,name);else openNewTab('nosql',JSON.stringify({collection:name,operation:'find',limit:100},null,2),name);};
 const createObject=()=>{if(!activeDb){pushNotice('Create a database first.','error');return;}if(mode==='sql')setModal('newtable');else{setNewName('new_collection');setModal('newcollection');}};
 const createCollection=async()=>{if(!activeDb||activeDb.mode!=='nosql')return;try{const output=runDocumentQuery(activeDb.collections??{},{collection:newName.trim(),operation:'createCollection'});const updated={...activeDb,collections:output.state,updated:Date.now()};await putDatabase(updated);setDatabases(old=>old.map(d=>d.id===updated.id?updated:d));setModal(null);pushNotice('Collection created');}catch(err){pushNotice(friendlyError(err),'error');}};
 const createTable=async(sql:string)=>{await sqlClient.execute(sql);await persistSql();setModal(null);pushNotice('Table created in SQLite');};
 const renameObject=async(name:string)=>{const proposed=window.prompt(`Rename ${name} to:`,name)?.trim();if(!proposed||proposed===name)return;if(!/^[a-z_][\w]*$/i.test(proposed))return pushNotice('Names must contain letters, numbers and underscores.','error');try{
  if(mode==='sql'){await sqlClient.execute(`ALTER TABLE ${quoteId(name)} RENAME TO ${quoteId(proposed)};`);await persistSql();}
  else if(activeDb?.mode==='nosql'){const collections={...activeDb.collections};if(collections[proposed])throw new Error('A collection with that name already exists.');collections[proposed]=collections[name];delete collections[name];const updated={...activeDb,collections,updated:Date.now()};await putDatabase(updated);setDatabases(old=>old.map(d=>d.id===updated.id?updated:d));}
  pushNotice(`Renamed to ${proposed}`);
 }catch(err){pushNotice(friendlyError(err),'error');}};
 const addColumn=async()=>{if(!/^[a-z_][\w]*$/i.test(addColumnName))return pushNotice('Enter a valid column name.','error');try{await sqlClient.execute(`ALTER TABLE ${quoteId(addColumnTable)} ADD COLUMN ${quoteId(addColumnName)} ${addColumnType};`);await persistSql();setModal(null);pushNotice('Column added');}catch(err){pushNotice(friendlyError(err),'error');}};
 const showExamples=()=>setMenu(menu==='examples'?null:'examples');
 const loadExample=(code:string,title:string,selectedMode:Mode=mode)=>{if(mode!==selectedMode){const db=databases.find(d=>d.mode===selectedMode);if(db)void switchDb(db.id,false);}openNewTab(selectedMode,code,title);setMenu(null);};
 const loadSample=async(sample:string,selectedMode:Mode)=>{
  if(busy)return;const same=databases.find(d=>d.name===sample&&d.mode===selectedMode);
  if(same){await switchDb(same.id);pushNotice(`Opened ${sample}`);return;}
  setBusy(true);try{const record:DatabaseRecord={id:uid(),name:sample,mode:selectedMode,created:Date.now(),updated:Date.now()};
   if(selectedMode==='sql'){await sqlClient.open();await sqlClient.execute(sqlSamples[sample]);record.sqlBytes=await sqlClient.bytes();setSchema(await sqlClient.inspect());}
   else record.collections=structuredClone(documentSamples[sample]);
   await putDatabase(record);setDatabases(old=>[...old,record]);setActiveId(record.id);setMode(selectedMode);setPage(selectedMode);const existing=tabs.find(t=>t.mode===selectedMode);if(existing)setTabId(existing.id);else openNewTab(selectedMode);setResult(null);pushNotice(`${sample} sample loaded`);
  }catch(err){pushNotice(friendlyError(err),'error');}finally{setBusy(false);}
 };
 const exportCurrent=async(kind:'database'|'schema'|'result'|'collection'|'workspace')=>{
  setMenu(null);try{
   if(kind==='workspace'){const all=await getDatabases();const payload={format:'querylab-workspace',version:1,exportedAt:new Date().toISOString(),databases:all.map(({sqlBytes,...rest})=>({...rest,sqlBase64:sqlBytes?toBase64(sqlBytes):undefined})),queries:await getQueries(),history:await getHistory(),completed};downloadFile('querylab-workspace.json',JSON.stringify(payload,null,2),'application/json');return;}
   if(!activeDb)throw new Error('Select a database to export.');const filename=fileSafe(activeDb.name);
   if(kind==='database'&&mode==='sql'){const bytes=await sqlClient.bytes();const buffer=new ArrayBuffer(bytes.byteLength);new Uint8Array(buffer).set(bytes);downloadFile(`${filename}.sqlite`,buffer,'application/x-sqlite3');return;}
   if(kind==='schema'&&mode==='sql'){downloadFile(`${filename}.sql`,await sqlClient.dump(),'text/sql');return;}
   if(kind==='collection'&&mode==='nosql'){downloadFile(`${filename}.json`,JSON.stringify(activeDb.collections??{},null,2),'application/json');return;}
   if(kind==='result'&&result){const cols=result.columns;const lines=mode==='sql'?(result as SqlResult).values:(result as NoSqlResult).documents.map(d=>cols.map(c=>d[c]));downloadFile(`${filename}-results.csv`,toCSV(cols,lines),'text/csv');return;}
   throw new Error('This export is not available for the current workspace.');
  }catch(err){pushNotice(friendlyError(err),'error');}
 };
 const importFile=async(file:File)=>{
  if(file.size>18*1024*1024)throw new Error('Import file is larger than 18 MB. Please split the data into smaller files.');
  const ext=file.name.split('.').at(-1)?.toLowerCase();
  if(ext==='sqlite'||ext==='db'){
   const buffer=new Uint8Array(await file.arrayBuffer());const name=file.name.replace(/\.(db|sqlite)$/i,'');const chosen=databases.some(d=>d.name===name&&d.mode==='sql')?`${name} copy`:name;
   await sqlClient.open(buffer);const record:DatabaseRecord={id:uid(),name:chosen,mode:'sql',sqlBytes:await sqlClient.bytes(),created:Date.now(),updated:Date.now()};await putDatabase(record);setDatabases(old=>[...old,record]);setActiveId(record.id);setMode('sql');setPage('sql');setSchema(await sqlClient.inspect());setResult(null);pushNotice(`Imported SQLite database "${chosen}"`);return;
  }
  if(ext==='sql'){
   if(mode!=='sql')throw new Error('Switch to the SQL editor to import SQL scripts.');try{await sqlClient.execute(await file.text());}finally{await persistSql();}pushNotice(`Executed ${file.name}`);return;
  }
  if(ext==='csv'){
   const content=await file.text();const parsed=Papa.parse<Record<string,string>>(content,{header:true,skipEmptyLines:'greedy',transformHeader:(s:string)=>s.trim()});
   if(parsed.errors.length)throw new Error(parsed.errors.slice(0,3).map(e=>e.message).join('; '));const fields=parsed.meta.fields??[];if(!fields.length||!parsed.data.length)throw new Error('CSV must contain a header row and at least one data row.');if(fields.some(f=>!f))throw new Error('CSV headers must not be empty.');
   const raw=file.name.replace(/\.csv$/i,'');const table=(window.prompt(mode==='sql'?'Import CSV as table:':'Import CSV as collection:',fileSafe(raw))??'').trim();if(!table)return;
   if(mode==='sql'){const statements=[`CREATE TABLE ${quoteId(table)} (${fields.map(f=>`${quoteId(f)} TEXT`).join(', ')});`];for(const item of parsed.data)statements.push(`INSERT INTO ${quoteId(table)} (${fields.map(quoteId).join(', ')}) VALUES (${fields.map(f=>sqlValue(item[f]??null)).join(', ')});`);
     await sqlClient.execute(statements.join('\n'));await persistSql();
   }else if(activeDb?.mode==='nosql'){
    const data=parsed.data.map((row)=>({_id:uid(),...row}));const output=runDocumentQuery(activeDb.collections??{},{collection:table,operation:'insertMany',documents:data});const updated={...activeDb,collections:output.state,updated:Date.now()};await putDatabase(updated);setDatabases(old=>old.map(d=>d.id===updated.id?updated:d));
   }else throw new Error('Select a document database first.');
   pushNotice(`Imported ${parsed.data.length} CSV rows`);return;
  }
  if(ext==='json'){
   if(mode!=='nosql'||activeDb?.mode!=='nosql')throw new Error('Switch to a document database to import JSON.');
   const parsed:unknown=JSON.parse(await file.text());let input:Record<string,unknown[]>;
   if(Array.isArray(parsed))input={[fileSafe(file.name.replace(/\.json$/i,''))]:parsed};
   else if(parsed&&typeof parsed==='object'&&Object.values(parsed).every(Array.isArray))input=parsed as Record<string,unknown[]>;
   else if(parsed&&typeof parsed==='object')input={[fileSafe(file.name.replace(/\.json$/i,''))]:[parsed]};
   else throw new Error('JSON must contain an object, an array of documents, or an object of collection arrays.');
   let current={...activeDb.collections};for(const [key,records] of Object.entries(input)){
    if(!/^[\w-]+$/.test(key)||['__proto__','prototype','constructor'].includes(key))throw new Error(`Invalid collection name: ${key}`);
    const normalized=records.map(record=>{if(!record||typeof record!=='object'||Array.isArray(record))throw new Error(`Collection ${key} contains a non-object value.`);return record as Record<string,unknown>});
    if(!current[key])current={...current,[key]:[]};if(normalized.length)current=runDocumentQuery(current,{collection:key,operation:'insertMany',documents:normalized as never}).state;
   }
   const updated={...activeDb,collections:current,updated:Date.now()};await putDatabase(updated);setDatabases(old=>old.map(d=>d.id===updated.id?updated:d));pushNotice('JSON imported successfully');return;
  }
  throw new Error('Supported files: .sql, .sqlite, .db, .csv and .json.');
 };
 const onFilePicked=async(e:React.ChangeEvent<HTMLInputElement>)=>{const items=Array.from(e.target.files??[]);e.target.value='';for(const file of items){setBusy(true);try{await importFile(file);}catch(err){pushNotice(`${file.name}: ${friendlyError(err)}`,'error');}finally{setBusy(false);}}};
 const importBackup=async(file:File)=>{try{
  const data=JSON.parse(await file.text()) as {format:string;version:number;databases:Array<DatabaseRecord&{sqlBase64?:string}>;queries:SavedQuery[];history:ExecutionRecord[];completed:string[]};
  if(data.format!=='querylab-workspace'||data.version!==1||!Array.isArray(data.databases))throw new Error('This is not a supported QueryLab workspace backup.');
  if(!window.confirm('Import workspace backup? Databases from the backup will be added using new local IDs. Existing data will not be deleted.'))return;
  const prepared=data.databases.map(d=>({id:uid(),name:d.name,mode:d.mode,created:Date.now(),updated:Date.now(),sqlBytes:d.sqlBase64?fromBase64(d.sqlBase64):undefined,collections:d.collections} as DatabaseRecord));
  for(const d of prepared){if(d.mode==='sql'&&d.sqlBytes){await sqlClient.open(d.sqlBytes);}await putDatabase(d);}for(const q of data.queries??[])await putQuery({...q,id:uid()});for(const item of data.history??[])await addHistory({...item,id:uid()});
  setDatabases(await getDatabases());setSaved(await getQueries());setHistory(await getHistory());setCompleted(old=>Array.from(new Set([...old,...(data.completed??[])])));pushNotice(`Imported ${prepared.length} database(s). Select one from the explorer.`);
  if(activeDb?.mode==='sql')setSchema(await sqlClient.open(activeDb.sqlBytes));
 }catch(err){pushNotice(friendlyError(err),'error');}};
 const startChallenge=async(challenge:Challenge)=>{setSelectedChallenge(challenge);setChallengeFeedback(null);const existing=databases.find(d=>d.name===challenge.sample&&d.mode===challenge.mode);if(existing){await switchDb(existing.id);}else await loadSample(challenge.sample,challenge.mode);openNewTab(challenge.mode,challenge.starter,`Challenge: ${challenge.title}`);};
 const validateChallenge=async()=>{const challenge=selectedChallenge;if(!challenge||busy)return;setBusy(true);try{
  if(challenge.mode!==mode||activeDb?.name!==challenge.sample)throw new Error(`Open the ${challenge.sample} sample database to validate this challenge.`);
  let correct=false;let message='';
  if(mode==='sql'){const checked=await sqlClient.evaluate(activeQuery,challenge.solution);correct=checked.correct;message=correct?`Correct. Your result matches ${checked.expectedRows} expected rows.`:`Not quite. Your query returned ${checked.returnedRows} rows. Recheck your columns and values.`;}
  else{const expected=runDocumentQuery(activeDb.collections??{},JSON.parse(challenge.solution));const candidate=runDocumentQuery(activeDb.collections??{},JSON.parse(activeQuery));correct=normalizeResult(expected.result.documents)===normalizeResult(candidate.result.documents);message=correct?'Correct. Your document results match the expected output.':'Not quite. Compare your returned documents with the task.';}
  setChallengeFeedback({ok:correct,text:message});if(correct&&!completed.includes(challenge.id))setCompleted(old=>[...old,challenge.id]);
  }catch(err){setChallengeFeedback({ok:false,text:friendlyError(err)});}finally{setBusy(false);}
 };
 const clearAll=async()=>{if(!window.confirm('Reset QueryLab? This deletes every local database, saved query, history entry, and learning progress. Export a backup first if you need it.'))return;await resetStorage();location.reload();};
 const clearOnlyHistory=async()=>{if(!window.confirm('Delete all query history?'))return;await clearHistory();setHistory([]);pushNotice('History cleared');};
 const duplicateSaved=async(item:SavedQuery)=>{await putQuery({...item,id:uid(),title:`${item.title} (copy)`,updated:Date.now()});setSaved(await getQueries());};
 const renameQuery=async(item:SavedQuery)=>{const title=window.prompt('Rename saved query:',item.title)?.trim();if(!title)return;await putQuery({...item,title,updated:Date.now()});setSaved(await getQueries());};
 const deleteSaved=async(item:SavedQuery)=>{if(!window.confirm(`Delete saved query "${item.title}"?`))return;await deleteQuery(item.id);setSaved(await getQueries());};
 const runShortcut=useRef<()=>void>(()=>{});const saveShortcut=useRef<()=>void>(()=>{});const formatShortcut=useRef<()=>void>(()=>{});
 runShortcut.current=()=>{void execute();};saveShortcut.current=openSaveQuery;formatShortcut.current=formatQuery;
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{const mod=e.ctrlKey||e.metaKey;const target=e.target as HTMLElement;const typing=target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target.isContentEditable;
  if(mod&&e.key.toLowerCase()==='k'){e.preventDefault();setCommandOpen(v=>!v);return;}
  if(mod&&e.key==='Enter'){e.preventDefault();runShortcut.current();return;}
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveShortcut.current();return;}
  if(mod&&e.shiftKey&&e.key.toLowerCase()==='f'){e.preventDefault();formatShortcut.current();return;}
  if(e.key==='Escape'&&!typing){setCommandOpen(false);setMenu(null);}
 };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 const selectSection=(item:Page)=>goPage(item);
 const startResize=(e:React.PointerEvent<HTMLDivElement>)=>{e.preventDefault();const container=workArea.current;if(!container)return;const top=container.getBoundingClientRect().top;const height=container.getBoundingClientRect().height;const change=(ev:PointerEvent)=>setEditorPct(Math.max(24,Math.min(76,(ev.clientY-top)/height*100)));const done=()=>{window.removeEventListener('pointermove',change);window.removeEventListener('pointerup',done);document.body.classList.remove('resizing');};document.body.classList.add('resizing');window.addEventListener('pointermove',change);window.addEventListener('pointerup',done);};
 const sqlExamplesForDb=activeDb?.name==='E-commerce'?[{name:'Orders and customers',query:'SELECT c.name, o.id, o.status FROM orders o JOIN customers c ON c.id = o.customer_id;'},{name:'Product revenue',query:'SELECT p.name, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN products p ON p.id=oi.product_id GROUP BY p.id ORDER BY revenue DESC;'}]:activeDb?.name==='Library'?[{name:'Books and authors',query:'SELECT b.title,a.name AS author FROM books b JOIN authors a ON a.id=b.author_id;' }]:activeDb?.name==='Hospital'?[{name:'Appointments',query:'SELECT p.name AS patient,d.name AS doctor,a.day FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id;' }]:sqlExamples;
 const actions=[...(['sql','nosql','designer','learn','compare','history','settings','home'] as Page[]).map(target=>({label:`Open ${labels[target]}`,detail:'Navigate',action:()=>goPage(target)})),{label:'Create database',detail:'Workspace',action:()=>{setModalMode(mode);setNewName('');setModal('newdb');}},{label:'Create table or collection',detail:'Database',action:createObject},{label:'Run query',detail:'Ctrl + Enter',action:()=>{void execute();}},{label:'Format query',detail:'Ctrl + Shift + F',action:formatQuery},{label:'Save query',detail:'Ctrl + S',action:openSaveQuery},{label:'Import data',detail:'SQL, CSV, JSON or SQLite',action:()=>fileRef.current?.click()}].filter(a=>`${a.label} ${a.detail}`.toLowerCase().includes(commandText.toLowerCase()));
 return <AppErrorBoundary><div className="app-shell">
  <header className="topbar"><div className="brand"><div className="brand-mark"><Database size={18}/></div><div className="brand-name">QueryLab<span className="brand-suffix"> / studio</span></div></div>
   <div className="topbar-divider"/><button className="project-switch" onClick={()=>goPage('home')}><span className="project-caption">WORKSPACE</span><span className="project-title">Local laboratory</span><ChevronDown size={13}/></button>
   <div className="topbar-spacer"/><button className="top-plain" onClick={()=>setCommandOpen(true)} title="Search commands"><Search size={15}/><span>Search commands</span><kbd>Ctrl K</kbd></button><div className="topbar-divider"/>
   <button className="icon-button top-theme" title={`Switch to ${theme==='light'?'dark':'light'} theme`} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<Moon size={17}/>:<Sun size={17}/>}</button>
   <button className="top-help" onClick={()=>setModal('shortcuts')} title="Keyboard shortcuts"><CircleHelp size={17}/></button>
   <a className="top-github" href="https://github.com/sudyp07" target="_blank" rel="noreferrer">GitHub <ArrowRight size={13}/></a>
  </header>
  <div className="app-body">
   <nav className="navrail" aria-label="Main navigation"><div className="nav-primary">{(['home','sql','nosql','designer','learn','compare','history'] as Page[]).map(target=>{const Icon=icons[target];return <button key={target} title={labels[target]} aria-label={labels[target]} aria-current={page===target?'page':undefined} className={`rail-button ${page===target?'current':''}`} onClick={()=>selectSection(target)}><Icon size={19}/></button>;})}</div><div className="nav-bottom"><button title="Settings" aria-label="Settings" aria-current={page==='settings'?'page':undefined} className={`rail-button ${page==='settings'?'current':''}`} onClick={()=>goPage('settings')}><Settings2 size={19}/></button></div></nav>
   {sidebarOpen&&<Explorer mode={mode} databases={databases} activeId={activeId} schema={schema} onSelect={id=>{void switchDb(id);if(window.innerWidth<=820)setSidebarOpen(false);}} onOpen={name=>{openObject(name);if(window.innerWidth<=820)setSidebarOpen(false);}} onClose={()=>setSidebarOpen(false)} onCreateDb={()=>{setModalMode(mode);setNewName('');setModal('newdb');}} onCreateObject={createObject} onRefresh={()=>void refreshSchema()} onDeleteDb={id=>void deleteDb(id)} onDeleteObject={name=>void deleteObject(name)}/>}
   <main className="main-stage" id="main" aria-label="QueryLab workspace">
    {page==='sql'||page==='nosql'?<div className="workbench">
     <div className="workspace-head"><div className="workspace-heading"><button className="icon-button sidebar-toggle" title={sidebarOpen?'Hide database explorer':'Show database explorer'} onClick={()=>setSidebarOpen(v=>!v)}>{sidebarOpen?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button><span className="crumb-muted">{mode==='sql'?'SQL laboratory':'Document laboratory'}</span><ChevronRight size={13}/><select aria-label="Active database" className="database-picker" value={activeDb?.mode===mode?activeId:''} onChange={e=>void switchDb(e.target.value)}>{databases.filter(d=>d.mode===mode).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><span className="engine-badge">{mode==='sql'?'SQLite WASM':'Mingo simulator'}</span></div><div className="workspace-head-right"><button className="icon-button" onClick={()=>{setInspectorOpen(v=>!v);}} title={inspectorOpen?'Hide inspector':'Show inspector'}>{inspectorOpen?<PanelRightClose size={17}/>:<PanelRightOpen size={17}/>}</button></div></div>
     <div className="tab-strip"><div className="tabs-scroller">{tabs.filter(t=>t.mode===mode).map(tab=><div className={`editor-tab ${tab.id===tabId?'selected':''}`} key={tab.id}><button onClick={()=>setTabId(tab.id)}>{mode==='sql'?<FileCode2 size={14}/>:<FileJson2 size={14}/>}<span>{tab.title}</span></button><button title="Close tab" aria-label={`Close ${tab.title}`} className="close-tab" onClick={()=>closeTab(tab.id)}><X size={12}/></button></div>)}</div><button className="new-tab icon-button" title="New query tab" onClick={()=>openNewTab(mode,'',`Query ${tabs.filter(t=>t.mode===mode).length+1}`)}><Plus size={16}/></button></div>
     <div className="editor-toolbar"><div className="left-tools"><button className="primary-button run-button" disabled={busy||!activeDb} onClick={()=>void execute()}><Play size={13} fill="currentColor"/> Run <span className="short-key">⌘↵</span></button>{mode==='sql'&&<button className="muted-button" title="Show real SQLite query plan" disabled={busy||!activeDb} onClick={()=>void execute(undefined,true)}><Activity size={14}/> Explain</button>}<div className="toolbar-divider"/><div className="drop-anchor"><button className="muted-button" onClick={showExamples}><BookOpen size={14}/> Examples <ChevronDown size={13}/></button>{menu==='examples'&&<div className="dropdown-menu menu-examples"><div className="dropdown-title">Load into a new tab</div>{(mode==='sql'?sqlExamplesForDb:documentExamples).map(ex=><button key={ex.name} onClick={()=>loadExample(ex.query,ex.name)}>{ex.name}</button>)}</div>}</div></div>
      <div className="right-tools"><button className="muted-button mobile-hide" onClick={formatQuery}>Format</button><button className="muted-button" onClick={openSaveQuery}><Save size={14}/> <span className="mobile-hide">Save</span></button><div className="toolbar-divider"/><button className="muted-button" onClick={()=>fileRef.current?.click()} title="Import SQL, SQLite, CSV or JSON"><Upload size={14}/><span className="mobile-hide">Import</span></button><div className="drop-anchor"><button className="muted-button" onClick={()=>setMenu(menu==='export'?null:'export')}><Download size={14}/><span className="mobile-hide">Export</span><ChevronDown size={13}/></button>{menu==='export'&&<div className="dropdown-menu export-menu"><div className="dropdown-title">DOWNLOAD</div>{mode==='sql'?<><button onClick={()=>void exportCurrent('database')}>SQLite database (.sqlite)</button><button onClick={()=>void exportCurrent('schema')}>SQL schema and data (.sql)</button></>:<button onClick={()=>void exportCurrent('collection')}>Collections (.json)</button>}<button disabled={!result||result.columns.length===0} onClick={()=>void exportCurrent('result')}>Query results (.csv)</button><div className="dropdown-rule"/><button onClick={()=>void exportCurrent('workspace')}>Entire workspace backup (.json)</button></div>}</div></div>
     </div>
     <div className="work-area" ref={workArea}><div className="code-pane" style={{height:`${editorPct}%`}}><div className="editor-meta"><div className="editor-meta-label"><TerminalSquare size={13}/>{mode==='sql'?'SQL query':'JSON command'}<span className="text-muted">{mode==='sql'?'SQLite 3':'MongoDB-style JSON'}</span></div><span className="editor-meta-count">{activeQuery.split('\n').length} lines · {activeQuery.length} chars</span></div><div className="code-wrapper"><CodeEditor key={`${mode}-${tabId}`} mode={mode} value={activeQuery} onChange={updateTab} theme={theme} schema={mode==='sql'?schema??undefined:undefined} onRun={()=>void execute()} onSave={openSaveQuery} onFormat={formatQuery} editorRef={editorRef}/></div></div><div className="work-splitter" onPointerDown={startResize} role="separator" aria-label="Resize editor and results" aria-orientation="horizontal"><div className="split-handle"/></div><Results mode={mode} result={result} error={error} busy={busy} databaseName={activeDb?.name??'query'} onClear={()=>{setResult(null);setError('');}}/></div>
    </div>:null}
    {page==='home'&&<HomeView completedCount={completed.length} databases={databases} history={history} saved={saved} goPage={goPage} switchDb={id=>switchDb(id)} loadSample={loadSample} onNewDb={()=>{setModalMode('sql');setNewName('');setModal('newdb');}} loadExample={loadExample}/>}
    {page==='designer'&&<div className="content-page designer-page"><div className="page-eyebrow">DATABASE / STRUCTURE</div><div className="page-title-row"><div><h1>Schema designer</h1><p>{mode==='sql'?'Explore actual table definitions and foreign-key relationships. Drag a table to rearrange the diagram.':'Explore the fields inferred from your locally stored JSON documents.'}</p></div><div className="page-actions"><button className="muted-button" onClick={()=>void refreshSchema()}><RefreshCw size={14}/> Refresh</button><button className="primary-button" onClick={createObject}><Plus size={14}/>{mode==='sql'?'New table':'New collection'}</button></div></div><div className="designer-mode"><button className={mode==='sql'?'active':''} onClick={()=>{goPage('sql');setPage('designer');}}>Relational schema</button><button className={mode==='nosql'?'active':''} onClick={()=>{goPage('nosql');setPage('designer');}}>Document structure</button></div>
     {mode==='sql'?<>{schema?.tables.length?<><div className="diagram-caption"><span><span className="color-key key-pk"/> Primary key</span><span><span className="color-key key-fk"/> Foreign key</span><span><Info size={13}/> Drag cards to move</span></div><SchemaDiagram schema={schema} onOpen={openObject}/></>:<div className="content-empty">No tables in this database yet. <button className="text-link" onClick={createObject}>Create the first table</button></div>}
      <div className="designer-details"><div className="home-section-head"><h2>Objects</h2><span>{schema?.tables.length??0} tables and views</span></div><div className="structure-list">{schema?.tables.map(t=><div className="structure-row" key={t.name}><Table2 size={15}/><div><strong>{t.name}</strong><small>{t.columns.length} columns · {t.count} records · {t.indexes.length} indexes</small></div><button className="muted-button small" onClick={()=>openObject(t.name)}>Query</button><button className="muted-button small" disabled={t.type==='view'} onClick={()=>{setAddColumnTable(t.name);setAddColumnName('');setModal('addcolumn');}}>Add field</button><button className="muted-button small" onClick={()=>void renameObject(t.name)}>Rename</button><button className="icon-button" title="Delete table" onClick={()=>void deleteObject(t.name)}><Trash2 size={14}/></button></div>)}</div></div>
     </>:<div className="document-schema-grid">{inferDocumentSchema(currentDocuments).map(col=><section className="document-schema-card" key={col.name}><header><Braces size={16}/><button onClick={()=>openObject(col.name)}>{col.name}</button><span>{col.count} docs</span></header>{col.fields.map(field=><div className="document-schema-field" key={field.name}><span>{field.name}</span><code>{field.types.join(' | ')}</code></div>)}<footer><button onClick={()=>openObject(col.name)}>Browse collection <ArrowRight size={13}/></button><button onClick={()=>void renameObject(col.name)}>Rename</button><button onClick={()=>void deleteObject(col.name)}>Delete</button></footer></section>)}{!Object.keys(currentDocuments).length&&<div className="content-empty">No collections. Create one to begin exploring.</div>}</div>}
    </div>}
    {page==='learn'&&<LearnView lessonId={lessonId} setLessonId={setLessonId} setSelectedChallenge={setSelectedChallenge} completed={completed} loadExample={loadExample} startChallenge={startChallenge}/>}
    {page==='compare'&&<CompareView loadSample={loadSample} loadExample={loadExample}/>}
    {page==='history'&&<HistoryView history={history} saved={saved} historySearch={historySearch} setHistorySearch={setHistorySearch} clearOnlyHistory={clearOnlyHistory} loadExample={loadExample} duplicateSaved={duplicateSaved} renameQuery={renameQuery} deleteSaved={deleteSaved}/>}
    {page==='settings'&&<SettingsView theme={theme} setTheme={setTheme} inspectorOpen={inspectorOpen} setInspectorOpen={setInspectorOpen} exportWorkspace={()=>void exportCurrent('workspace')} backupRef={backupRef} clearOnlyHistory={clearOnlyHistory} clearAll={clearAll}/>}
   </main>
   {inspectorOpen&&(page==='sql'||page==='nosql')&&<aside className="inspector" aria-label="Workspace inspector"><div className="inspector-head"><strong>INSPECTOR</strong><button className="icon-button" aria-label="Close inspector" onClick={()=>setInspectorOpen(false)}><X size={14}/></button></div><div className="inspector-section"><div className="inspector-caption">CONNECTION</div><div className="inspect-name"><Database size={17}/><strong>{activeDb?.name??'No database selected'}</strong></div><div className="detail-pair"><span>Engine</span><b>{mode==='sql'?'SQLite WASM':'Mingo'}</b></div><div className="detail-pair"><span>Scope</span><b>Local browser</b></div><div className="detail-pair"><span>{mode==='sql'?'Tables / views':'Collections'}</span><b>{activeDbCount}</b></div>{mode==='sql'&&<div className="detail-pair"><span>Allocated pages</span><b>{schema?schema.pageCount.toLocaleString():'-'}</b></div>}</div><div className="inspector-section"><div className="inspector-caption">SCHEMA</div>{mode==='sql'?(schema?.tables.length?schema.tables.slice(0,18).map(t=><button className="inspector-object" key={t.name} onClick={()=>openObject(t.name)}><Table2 size={13}/><span className="truncate">{t.name}</span><span>{t.count}</span></button>):<p className="inspector-empty">No tables yet.</p>):Object.entries(currentDocuments).map(([name,docs])=><button className="inspector-object" key={name} onClick={()=>openObject(name)}><Braces size={13}/><span className="truncate">{name}</span><span>{docs.length}</span></button>)}<button className="inspector-text-link" onClick={()=>goPage('designer')}>View database structure <ArrowRight size={12}/></button></div><div className="inspector-section"><div className="inspector-caption">QUICK REFERENCE</div>{mode==='sql'?<><p>SQL uses SQLite syntax. Run a statement or select part of the editor first.</p><div className="reference-line"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> <span>Run query</span></div><div className="reference-line"><kbd>Ctrl</kbd> + <kbd>S</kbd><span>Save query</span></div><div className="reference-line"><kbd>Ctrl</kbd> + <kbd>K</kbd><span>Command menu</span></div></>:<><p>JSON commands use collection, operation, filter and optional update or pipeline fields.</p><button className="inspector-text-link" onClick={()=>loadExample(documentExamples[0].query,'Find example','nosql')}>Open a query example</button></>}</div><div className="inspector-bottom"><Info size={14}/>{mode==='sql'?'Actual SQLite engine':'Educational simulator · No MongoDB server'}</div></aside>}
  </div>
  <footer className="statusbar"><div><span className={`status-circle ${online?'online':'offline'}`}/>{online?'Browser online':'Browser offline'}</div><div className="statusbar-separator"/><div>{ready?'Workspace ready':'Loading local workspace...'}</div><div className="statusbar-spacer"/><div>{activeDb?.name??'No database'}</div><div className="statusbar-separator"/><div>{mode==='sql'?'SQLite / WASM':'JSON / Mingo'}</div><div className="statusbar-separator"/><div>© 2026 Sudip Nepal</div></footer>
  <input ref={fileRef} type="file" className="sr-only" accept=".sql,.sqlite,.db,.csv,.json" multiple onChange={e=>void onFilePicked(e)}/><input ref={backupRef} type="file" className="sr-only" accept=".json" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importBackup(file);}}/>
  {notice&&<div className={`toast ${notice.kind}`} role="status"><span>{notice.kind==='ok'?<Check size={16}/>:<Info size={16}/>}</span><span>{notice.text}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss notification"><X size={14}/></button></div>}
  {commandOpen&&<div className="command-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCommandOpen(false);}}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Command palette"><div className="command-input"><Search size={18}/><input autoFocus placeholder="Type a command or navigate..." value={commandText} onChange={e=>setCommandText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&actions.length){actions[0].action();setCommandOpen(false);setCommandText('');}if(e.key==='Escape')setCommandOpen(false);}}/><kbd>Esc</kbd></div><div className="command-items">{actions.slice(0,12).map(a=><button key={a.label} onClick={()=>{a.action();setCommandOpen(false);setCommandText('');}}><Command size={15}/><span>{a.label}</span><small>{a.detail}</small></button>)}{actions.length===0&&<p>No commands match. Try “SQL”, “save”, or “import”.</p>}</div><div className="command-footer">QueryLab · Keyboard-first navigation</div></div></div>}
  {modal==='newdb'&&<Modal title="Create local database" onClose={()=>setModal(null)}><div className="dialog-fields"><label className="field-label">Database name<input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} placeholder="My database" onKeyDown={e=>{if(e.key==='Enter')void addDatabase();}}/></label><label className="field-label">Database engine<select value={modalMode} onChange={e=>setModalMode(e.target.value as Mode)}><option value="sql">SQLite / Relational SQL</option><option value="nosql">Local MongoDB-style documents</option></select></label><p className="form-hint">The database is saved to IndexedDB on this device. No server or account is needed.</p><div className="modal-footer"><button className="muted-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" onClick={()=>void addDatabase()} disabled={busy}>Create database</button></div></div></Modal>}
  {modal==='newtable'&&<Modal title="Create SQLite table" onClose={()=>setModal(null)} wide><TableDesigner schema={schema} onCancel={()=>setModal(null)} onCreate={createTable}/></Modal>}
  {modal==='newcollection'&&<Modal title="Create document collection" onClose={()=>setModal(null)}><label className="field-label">Collection name<input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void createCollection();}}/></label><p className="form-hint">Creates an empty local collection. Add documents using insertOne or insertMany.</p><div className="modal-footer"><button className="muted-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" onClick={()=>void createCollection()}>Create collection</button></div></Modal>}
  {modal==='savequery'&&<Modal title="Save query" onClose={()=>setModal(null)}><div className="dialog-fields"><label className="field-label">Query name<input autoFocus value={saveQueryTitle} onChange={e=>setSaveQueryTitle(e.target.value)}/></label><label className="field-label">Folder<input value={saveQueryFolder} onChange={e=>setSaveQueryFolder(e.target.value)}/></label><label className="field-label">Description (optional)<textarea rows={3} value={saveQueryDesc} onChange={e=>setSaveQueryDesc(e.target.value)}/></label><div className="modal-footer"><button className="muted-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" onClick={()=>void saveQuery()}>Save query</button></div></div></Modal>}
  {modal==='addcolumn'&&<Modal title={`Add column to ${addColumnTable}`} onClose={()=>setModal(null)}><div className="dialog-fields"><label className="field-label">Column name<input autoFocus value={addColumnName} onChange={e=>setAddColumnName(e.target.value)}/></label><label className="field-label">SQLite type<select value={addColumnType} onChange={e=>setAddColumnType(e.target.value)}>{['TEXT','INTEGER','REAL','NUMERIC','BLOB','BOOLEAN','DATE','DATETIME'].map(t=><option key={t}>{t}</option>)}</select></label><div className="modal-footer"><button className="muted-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" onClick={()=>void addColumn()}>Add column</button></div></div></Modal>}
  {modal==='shortcuts'&&<Modal title="Keyboard shortcuts" onClose={()=>setModal(null)}><div className="shortcuts-list">{[['Ctrl / Cmd + Enter','Run selected SQL or complete query'],['Ctrl / Cmd + S','Save current query'],['Ctrl / Cmd + Shift + F','Format SQL or JSON'],['Ctrl / Cmd + K','Open command palette'],['Escape','Close dialogs and menus']].map(([key,text])=><div key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</div></Modal>}
  {selectedChallenge&&<div className="challenge-float"><div><BookOpenCheck size={17}/><strong>{selectedChallenge.title}</strong><span>{selectedChallenge.level}</span><button aria-label="Close challenge" onClick={()=>setSelectedChallenge(null)}><X size={16}/></button></div><p>{selectedChallenge.description}</p><details><summary>Show hint</summary>{selectedChallenge.hint}</details>{challengeFeedback&&<p className={challengeFeedback.ok?'challenge-pass':'challenge-fail'}>{challengeFeedback.text}</p>}<div className="challenge-buttons"><button className="muted-button" onClick={()=>updateTab(selectedChallenge.solution)}>Show solution</button><button className="primary-button" disabled={busy} onClick={()=>void validateChallenge()}><Check size={14}/> Check answer</button></div></div>}
 </div></AppErrorBoundary>;
}
