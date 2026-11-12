import { useState } from 'react';
import { ChevronDown, ChevronRight, X, Database, FolderClosed, Table2, KeyRound, Link2, Columns3, Eye, Plus, RefreshCw, MoreHorizontal, Trash2 } from 'lucide-react';
import type { DatabaseRecord, Mode, SchemaInfo } from '../types';
import { titleCase } from '../lib/utils';
interface Props {mode:Mode;databases:DatabaseRecord[];activeId:string;schema:SchemaInfo|null;onSelect:(id:string)=>void;onOpen:(name:string)=>void;onCreateDb:()=>void;onCreateObject:()=>void;onRefresh:()=>void;onDeleteDb:(id:string)=>void;onDeleteObject:(name:string)=>void;onClose:()=>void}
export default function Explorer({mode,databases,activeId,schema,onSelect,onOpen,onCreateDb,onCreateObject,onRefresh,onDeleteDb,onDeleteObject,onClose}:Props) {
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [context,setContext]=useState<string|null>(null);
 const relevant=databases.filter(d=>d.mode===mode);
 const active=relevant.find(d=>d.id===activeId);
 const objects=mode==='sql'?(schema?.tables??[]).map(t=>({name:t.name,count:t.count,subtitle:t.type})):Object.entries(active?.collections??{}).map(([name,records])=>({name,count:records.length,subtitle:'collection'}));
 return <aside className="explorer" aria-label="Database explorer">
  <div className="sidebar-label">EXPLORER <span className="explorer-header-actions"><button title="Refresh explorer" className="icon-button" onClick={onRefresh}><RefreshCw size={13}/></button><button title="Close explorer" className="icon-button mobile-explorer-close" onClick={onClose}><X size={15}/></button></span></div>
  <div className="explorer-section-header"><span>DATABASES</span><button className="icon-button" title="New database" onClick={onCreateDb}><Plus size={15}/></button></div>
  <div className="explorer-databases">{relevant.map(db=><div key={db.id} className="db-line-group"><button className={`tree-row db-item ${db.id===activeId?'active':''}`} onClick={()=>onSelect(db.id)}><Database size={15}/><span className="truncate">{db.name}</span>{db.id===activeId&&<span className="tiny-dot"/>}</button>{db.id===activeId&&<button className="context-trigger icon-button" onClick={()=>setContext(context===db.id?null:db.id)} aria-label="Database options"><MoreHorizontal size={15}/></button>}{context===db.id&&<div className="tree-context"><button onClick={()=>{setContext(null);onDeleteDb(db.id);}}><Trash2 size={13}/>Delete database</button></div>}</div>)}</div>
  <div className="explorer-section-header with-top-line"><span>{mode==='sql'?'TABLES & VIEWS':'COLLECTIONS'} <span className="count-muted">{objects.length}</span></span><button title={mode==='sql'?'Create table':'Create collection'} className="icon-button" onClick={onCreateObject}><Plus size={15}/></button></div>
  {objects.length===0?<div className="explorer-empty">Nothing here yet. <button onClick={onCreateObject}>Create {mode==='sql'?'table':'collection'}</button></div>:<div className="tree-list">{objects.map(object=>{
   const table=schema?.tables.find(t=>t.name===object.name);const isOpen=expanded[object.name]??false;
   return <div key={object.name}><div className="tree-row table-entry"><button className="tree-toggle" aria-label={`Toggle ${object.name}`} onClick={()=>setExpanded(old=>({...old,[object.name]:!isOpen}))}>{isOpen?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button><button className="table-open" onClick={()=>onOpen(object.name)} title={`Open ${object.name}`}>
   {object.subtitle==='view'?<Eye size={14}/>:object.subtitle==='collection'?<FolderClosed size={14}/>:<Table2 size={14}/>}<span className="truncate">{object.name}</span></button><span className="tree-count">{object.count}</span></div>
   {isOpen&&<div className="tree-children">{mode==='sql'?<>{(table?.columns??[]).map(c=><div className="tree-leaf" key={c.name}>{c.pk?<KeyRound size={12}/>:<Columns3 size={12}/>}<span className="truncate">{c.name}</span><span className="leaf-type">{c.type||'ANY'}</span></div>)}{(table?.foreignKeys??[]).map((fk,i)=><div className="tree-leaf" key={`fk${i}`}><Link2 size={12}/><span className="truncate">{fk.from} → {fk.table}</span></div>)}</>:Object.values(active?.collections?.[object.name]??[]).length?<div className="tree-leaf faint">{Object.keys(active?.collections?.[object.name]?.[0]??{}).map(titleCase).join(' · ')}</div>:<div className="tree-leaf faint">Empty collection</div>}<button className="tree-remove" onClick={()=>onDeleteObject(object.name)}><Trash2 size={12}/> Delete {object.subtitle}</button></div>}
   </div>;
  })}</div>}
  <div className="explorer-footer"><span className="tiny-status-dot"/>{mode==='sql'?'SQLite · WebAssembly':'Mingo · Local simulator'}</div>
 </aside>;
}
