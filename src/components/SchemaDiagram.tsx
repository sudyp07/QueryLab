import { useState, useRef, useEffect } from 'react';
import { KeyRound, Link2, Move } from 'lucide-react';
import type { SchemaInfo } from '../types';
interface Props { schema:SchemaInfo; onOpen:(name:string)=>void }
const CARD_W=252;
const HEADER_H=39;
const ROW_H=26;
export default function SchemaDiagram({schema,onOpen}:Props) {
 const [positions,setPositions]=useState<Record<string,{x:number;y:number}>>({});
 const drag=useRef<{name:string;startX:number;startY:number;x:number;y:number}|null>(null);
 const surface=useRef<HTMLDivElement|null>(null);
 const names=schema.tables.map(t=>t.name).join('|');
 useEffect(()=>setPositions(prev=>{
  const next={...prev};schema.tables.forEach((t,i)=>{if(!next[t.name])next[t.name]={x:24+(i%3)*290,y:28+Math.floor(i/3)*260};});return next;
 }),[names,schema.tables]);
 const connections=schema.tables.flatMap(t=>t.foreignKeys.map((fk,i)=>({from:t.name,to:fk.table,id:`${t.name}:${fk.from}:${i}`}))).filter(item=>positions[item.from]&&positions[item.to]);
 const pointerDown=(e:React.PointerEvent<HTMLDivElement>,name:string)=>{
  if((e.target as HTMLElement).closest('button'))return;
  const p=positions[name];if(!p)return; drag.current={name,startX:e.clientX,startY:e.clientY,x:p.x,y:p.y};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const pointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(!drag.current)return;const d=drag.current;setPositions(prev=>({...prev,[d.name]:{x:Math.max(4,d.x+e.clientX-d.startX),y:Math.max(4,d.y+e.clientY-d.startY)}}));};
 const pointerUp=()=>{drag.current=null;};
 const width=Math.max(880,...Object.values(positions).map(p=>p.x+CARD_W+40));
 const height=Math.max(540,...schema.tables.map(t=>(positions[t.name]?.y??0)+HEADER_H+t.columns.length*ROW_H+65));
 return <div className="diagram-scroll"><div className="diagram-canvas" ref={surface} style={{width,height}}>
  <svg className="diagram-lines" width={width} height={height} aria-hidden="true">{connections.map(edge=>{const start=positions[edge.from];const end=positions[edge.to];const startTable=schema.tables.find(t=>t.name===edge.from);const endTable=schema.tables.find(t=>t.name===edge.to);if(!start||!end)return null;
  const x1=start.x+CARD_W/2,y1=start.y+HEADER_H+((startTable?.columns.length??1)*ROW_H)/2;
  const x2=end.x+CARD_W/2,y2=end.y+HEADER_H+((endTable?.columns.length??1)*ROW_H)/2;
  const mid=(x1+x2)/2;return <path key={edge.id} d={`M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} fill="none" stroke="var(--diagram-line)" strokeWidth="1.7"/>;})}</svg>
  {schema.tables.map(table=>{const pos=positions[table.name]??{x:0,y:0};return <div className="schema-node" key={table.name} style={{left:pos.x,top:pos.y,width:CARD_W}} onPointerDown={e=>pointerDown(e,table.name)} onPointerMove={pointerMove} onPointerUp={pointerUp}>
    <div className="schema-node-head"><Move size={12}/><button onClick={()=>onOpen(table.name)}>{table.name}</button><span>{table.type}</span></div>
    {table.columns.map(col=><div className="schema-node-field" key={col.name}><span className="field-icon">{col.pk?<KeyRound size={12}/>:table.foreignKeys.some(f=>f.from===col.name)?<Link2 size={12}/>:<span className="field-neutral"/>}</span><span className="truncate">{col.name}</span><code>{col.type||'ANY'}</code></div>)}
    <div className="schema-node-foot">{table.count} records · {table.foreignKeys.length} references</div>
  </div>;})}</div></div>;
}
