import { useMemo, useRef, useEffect, type MutableRefObject } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import { EditorView, keymap } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Mode, SchemaInfo } from '../types';
interface Props { mode:Mode; value:string; onChange:(text:string)=>void; theme:'light'|'dark'; schema?:SchemaInfo; onRun:()=>void; onSave:()=>void; onFormat:()=>void; editorRef?:MutableRefObject<ReactCodeMirrorRef|null> }
export default function CodeEditor({mode,value,onChange,theme,schema,onRun,onSave,onFormat,editorRef}:Props) {
 const local=useRef<ReactCodeMirrorRef|null>(null);
 const actionsRef=useRef({onRun,onSave,onFormat});
 actionsRef.current={onRun,onSave,onFormat};
 useEffect(()=>{if(editorRef)editorRef.current=local.current;},[editorRef]);
 const extensions=useMemo(()=>{
  const completionSchema:Record<string,string[]>={};for(const table of schema?.tables??[])completionSchema[table.name]=table.columns.map(c=>c.name);
  const colors=theme==='dark'?{keyword:'#82b7f2',string:'#dba77a',number:'#c9a4ed',comment:'#84939b',variable:'#a7d6bd',operator:'#e5c187'}:{keyword:'#1557a0',string:'#a2472c',number:'#804eaa',comment:'#677c70',variable:'#166e75',operator:'#956318'};
  const highlight=HighlightStyle.define([
   {tag:tags.keyword,color:colors.keyword,fontWeight:'600'},
   {tag:tags.string,color:colors.string},{tag:tags.number,color:colors.number},
   {tag:tags.comment,color:colors.comment,fontStyle:'italic'},
   {tag:[tags.variableName,tags.propertyName],color:colors.variable},
   {tag:tags.operator,color:colors.operator},
   {tag:[tags.bool,tags.null],color:colors.number}
  ]);
  return [mode==='sql'?sql({dialect:SQLite,schema:completionSchema,upperCaseKeywords:true}):json(),syntaxHighlighting(highlight),EditorView.lineWrapping,EditorView.theme({
   '&':{fontSize:'13px',height:'100%',backgroundColor:'transparent'},
   '.cm-scroller':{fontFamily:'var(--font-code)',lineHeight:'1.8'},
   '.cm-content':{padding:'18px 12px',caretColor:'var(--text)'},
   '.cm-gutters':{backgroundColor:'var(--editor-gutter)',borderRight:'1px solid var(--line)',color:'var(--muted-2)',paddingRight:'5px'},
   '.cm-activeLine':{backgroundColor:'var(--active-line)'},
   '.cm-activeLineGutter':{backgroundColor:'var(--active-line)'},
   '.cm-selectionBackground':{backgroundColor:'var(--selection) !important'},
   '&.cm-focused':{outline:'none'},
   '.cm-foldPlaceholder':{backgroundColor:'var(--surface-2)',color:'var(--muted)'},
  }),keymap.of([
   {key:'Mod-Enter',run:()=>{actionsRef.current.onRun();return true;}},
   {key:'Mod-s',run:()=>{actionsRef.current.onSave();return true;}},
   {key:'Mod-Shift-f',run:()=>{actionsRef.current.onFormat();return true;}}
  ])];
 },[mode,schema,theme]);
 return <CodeMirror ref={local} value={value} onChange={onChange} height="100%" extensions={extensions} basicSetup={{lineNumbers:true,highlightActiveLine:true,highlightActiveLineGutter:true,foldGutter:true,autocompletion:true,bracketMatching:true,closeBrackets:true,searchKeymap:true}} theme={theme} />;
}
