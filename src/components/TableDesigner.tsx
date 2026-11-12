import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { quoteId } from '../lib/utils';
import type { SchemaInfo } from '../types';
interface Field { id:number; name:string;type:string;pk:boolean;required:boolean;unique:boolean;references:string }
interface Props {schema:SchemaInfo|null;onCreate:(sql:string)=>Promise<void>;onCancel:()=>void}
let seed=3;
export default function TableDesigner({schema,onCreate,onCancel}:Props){
 const [name,setName]=useState('new_table');const [fields,setFields]=useState<Field[]>([{id:1,name:'id',type:'INTEGER',pk:true,required:true,unique:false,references:''},{id:2,name:'name',type:'TEXT',pk:false,required:true,unique:false,references:''}]);
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const update=(id:number,change:Partial<Field>)=>setFields(old=>old.map(f=>f.id===id?{...f,...change}:f));
 const create=async(e:React.FormEvent)=>{e.preventDefault();if(!/^[a-z_][\w]*$/i.test(name)){setError('Table name must start with a letter or underscore and contain only letters, numbers and underscores.');return;}
  if(!fields.length||fields.some(f=>!/^[a-z_][\w]*$/i.test(f.name))){setError('Enter a valid name for every column.');return;}
  if(new Set(fields.map(f=>f.name.toLowerCase())).size!==fields.length){setError('Column names must be unique.');return;}
  const columns=fields.map(f=>`${quoteId(f.name)} ${f.type}${f.pk?' PRIMARY KEY':''}${f.required&&!f.pk?' NOT NULL':''}${f.unique?' UNIQUE':''}${f.references?` REFERENCES ${quoteId(f.references.split('.')[0])}(${quoteId(f.references.split('.')[1])})`:''}`);
  setBusy(true);try{await onCreate(`CREATE TABLE ${quoteId(name)} (\n  ${columns.join(',\n  ')}\n);`);}catch(err){setError(err instanceof Error?err.message:String(err));}finally{setBusy(false);}
 };
 return <form className="designer-form" onSubmit={e=>void create(e)}><label className="field-label">Table name<input value={name} onChange={e=>setName(e.target.value)} autoFocus/></label><div className="form-section-label">COLUMNS</div>
  <div className="column-form-head"><span>Name</span><span>Type</span><span>PK</span><span>Required</span><span>Unique</span><span>Reference</span><span/></div>
  {fields.map(f=><div className="column-form-row" key={f.id}><input aria-label="Column name" value={f.name} onChange={e=>update(f.id,{name:e.target.value})}/><select aria-label="Data type" value={f.type} onChange={e=>update(f.id,{type:e.target.value})}>{['INTEGER','TEXT','REAL','NUMERIC','BLOB','BOOLEAN','DATE','DATETIME'].map(t=><option key={t}>{t}</option>)}</select><input type="checkbox" checked={f.pk} aria-label="Primary key" onChange={e=>update(f.id,{pk:e.target.checked})}/><input type="checkbox" checked={f.required} aria-label="Not null" onChange={e=>update(f.id,{required:e.target.checked})}/><input type="checkbox" checked={f.unique} aria-label="Unique" onChange={e=>update(f.id,{unique:e.target.checked})}/><select value={f.references} aria-label="Foreign key reference" onChange={e=>update(f.id,{references:e.target.value})}><option value="">None</option>{schema?.tables.filter(t=>t.type==='table').flatMap(t=>t.columns.filter(c=>c.pk).map(c=><option key={`${t.name}.${c.name}`} value={`${t.name}.${c.name}`}>{t.name}.{c.name}</option>))}</select><button className="icon-button" type="button" title="Remove column" onClick={()=>setFields(old=>old.filter(v=>v.id!==f.id))}><Trash2 size={14}/></button></div>)}
  <button className="text-link add-column" type="button" onClick={()=>setFields(old=>[...old,{id:seed++,name:'',type:'TEXT',pk:false,required:false,unique:false,references:''}])}><Plus size={14}/> Add column</button>
  <p className="form-hint">Creates an actual SQLite table. You can inspect its columns and relationships in the explorer.</p>{error&&<p role="alert" className="form-error">{error}</p>}
  <div className="modal-footer"><button className="muted-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={busy} type="submit">{busy?'Creating...':'Create table'}</button></div>
 </form>;
}
