import 'mingo/init/system';
import { Query, aggregate } from 'mingo';
import type { DocumentRecord, NoSqlRequest, NoSqlResult } from '../types';
import { uid } from '../lib/utils';
export type Collections = Record<string, DocumentRecord[]>;
const clone = <T>(value:T):T => structuredClone(value);
const isObject = (v: unknown): v is Record<string,unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const safePath = (path:string) => { if (!path || path.split('.').some(part => ['__proto__','prototype','constructor'].includes(part))) throw new Error('Unsafe document field path.'); return path.split('.'); };
const getAt = (object:Record<string,unknown>,path:string):unknown => safePath(path).reduce<unknown>((cur,key) => isObject(cur) ? cur[key] : undefined,object);
const setAt = (object:Record<string,unknown>,path:string,value:unknown) => {const parts=safePath(path);let current=object;for(const p of parts.slice(0,-1)){if(!isObject(current[p]))current[p]={};current=current[p] as Record<string,unknown>;}current[parts.at(-1)!]=value;};
const unsetAt = (object:Record<string,unknown>,path:string) => {const parts=safePath(path);let current:unknown=object;for(const p of parts.slice(0,-1))current=isObject(current)?current[p]:undefined;if(isObject(current))delete current[parts.at(-1)!];};
function mutate(doc:DocumentRecord, modifier:Record<string,unknown>) {
  if (!Object.keys(modifier).length) throw new Error('Update document is empty.');
  for(const [operator,fields] of Object.entries(modifier)) {
    if(!isObject(fields))throw new Error(`${operator} expects an object of fields.`);
    for(const [path,value] of Object.entries(fields)) {
      if(path==='_id'||path.startsWith('_id.'))throw new Error('The _id field is immutable.');
      const old=getAt(doc,path);
      switch(operator){
        case '$set':setAt(doc,path,value);break;
        case '$unset':unsetAt(doc,path);break;
        case '$inc':if(typeof value!=='number'||(old!==undefined&&typeof old!=='number'))throw new Error('$inc needs numeric values.');setAt(doc,path,(Number(old)||0)+value);break;
        case '$push':setAt(doc,path,[...(Array.isArray(old)?old:old===undefined?[]:(()=>{throw new Error('$push requires an array.');})()),value]);break;
        case '$addToSet':{const arr=Array.isArray(old)?[...old]:[];if(!arr.some(item=>JSON.stringify(item)===JSON.stringify(value)))arr.push(value);setAt(doc,path,arr);break;}
        case '$pull':if(!Array.isArray(old))throw new Error('$pull requires an array.');setAt(doc,path,old.filter(item=>isObject(value)&&isObject(item)?!new Query(value).test(item):JSON.stringify(item)!==JSON.stringify(value)));break;
        case '$rename':if(typeof value!=='string')throw new Error('$rename target must be a string.');if(old!==undefined){unsetAt(doc,path);setAt(doc,value,old);}break;
        default:throw new Error(`Unsupported update operator: ${operator}`);
      }
    }
  }
}
function ensureDoc(value:unknown): DocumentRecord { if(!isObject(value))throw new Error('Document must be a JSON object.');const copy=clone(value) as DocumentRecord;if(copy._id==null)copy._id=uid(); if(typeof copy._id!=='string'&&typeof copy._id!=='number')throw new Error('_id must be a string or number.');return copy; }
export function runDocumentQuery(collections:Collections, input:NoSqlRequest): {state:Collections; result:NoSqlResult; changed:boolean} {
 const begin=performance.now();const req=input;
 if(!/^[\w-]+$/.test(req.collection??'')||['__proto__','prototype','constructor'].includes(req.collection))throw new Error('Specify a safe collection name using letters, numbers, _ or -.');
 const operation=req.operation;const resultState=clone(collections);const exists=Object.hasOwn(resultState,req.collection);
 if(!exists && !['insertOne','insertMany','createCollection'].includes(operation))throw new Error(`Collection "${req.collection}" does not exist.`);
 const data=resultState[req.collection]??[]; let docs:Record<string,unknown>[]=[];let affected=0;let changed=false;let message='Operation completed';
 const matched=()=>{const query=new Query(req.filter??{});return data.filter(d=>query.test(d));};
 const assertUnique=(record:DocumentRecord,except?:DocumentRecord)=>{if(data.some(d=>d!==except&&d._id===record._id))throw new Error(`Duplicate _id: ${String(record._id)}`);};
 switch(operation){
  case 'createCollection':if(exists)throw new Error('Collection already exists.');resultState[req.collection]=[];changed=true;message='Collection created';break;
  case 'find':case 'findOne':{
   let cursor=new Query(req.filter??{}).find(data,req.projection);
   if(req.sort)cursor=cursor.sort(req.sort);
   if(req.skip)cursor=cursor.skip(Math.max(0,req.skip));
   if(operation==='findOne')cursor=cursor.limit(1); else if(req.limit!==undefined)cursor=cursor.limit(Math.max(0,req.limit));
   docs=cursor.all().map((document:unknown)=>{if(!isObject(document))throw new Error('Query returned a non-object document.');return document;});message=`${docs.length} document${docs.length===1?'':'s'} returned`;break;
  }
  case 'aggregate':if(!Array.isArray(req.pipeline))throw new Error('Aggregation requires a pipeline array.'); {
   const allowed=['$match','$project','$group','$sort','$limit','$skip','$unwind','$count','$addFields'];
   for(const stage of req.pipeline)if(!isObject(stage)||Object.keys(stage).length!==1||!allowed.includes(Object.keys(stage)[0]))throw new Error(`Unsupported aggregation stage: ${Object.keys(stage??{}).join(', ')}`);
   docs=aggregate(data,req.pipeline);message=`${docs.length} aggregation result${docs.length===1?'':'s'}`;break;
  }
  case 'insertOne':case 'insertMany':{
   const records=operation==='insertOne'?[req.document]:req.documents;
   if(!Array.isArray(records)||!records.length)throw new Error('Provide document or documents to insert.');
   const parsed=records.map(ensureDoc);
   const ids=new Set(parsed.map(d=>String(d._id)));if(ids.size!==parsed.length)throw new Error('Duplicate _id in inserted documents.');
   for(const doc of parsed)assertUnique(doc);
   resultState[req.collection]=[...data,...parsed];docs=parsed;affected=parsed.length;changed=true;message=`Inserted ${affected} document${affected===1?'':'s'}`;break;
  }
  case 'replaceOne':{
   if(!req.document)throw new Error('replaceOne needs document.');
   const found=matched()[0];if(!found){if(req.upsert){const inserted=ensureDoc(req.document);assertUnique(inserted);data.push(inserted);affected=1;} }
   else {const replacement=ensureDoc({...req.document,_id:found._id});const idx=data.indexOf(found);data[idx]=replacement;affected=1;}
   changed=affected>0;message=`Replaced ${affected} document${affected===1?'':'s'}`;break;
  }
  case 'updateOne':case 'updateMany':{
   if(!isObject(req.update))throw new Error('Update operation needs an update object.');
   const items=matched().slice(0,operation==='updateOne'?1:undefined);
   for(const item of items){mutate(item,req.update);affected++;}
   if(!items.length&&req.upsert){const candidate:DocumentRecord={_id:uid()};for(const [key,val] of Object.entries(req.filter??{}))if(!key.startsWith('$')&&!isObject(val))setAt(candidate,key,val);mutate(candidate,req.update);data.push(candidate);affected=1;}
   changed=affected>0;message=`Updated ${affected} document${affected===1?'':'s'}`;break;
  }
  case 'deleteOne':case 'deleteMany':{
   const matches=matched().slice(0,operation==='deleteOne'?1:undefined);
   const ids=new Set(matches.map(m=>m._id));resultState[req.collection]=data.filter(d=>!ids.has(d._id));affected=matches.length;changed=affected>0;message=`Deleted ${affected} document${affected===1?'':'s'}`;break;
  }
  default:throw new Error(`Unsupported operation: ${String(operation)}.`);
 }
 const columns=Array.from(new Set(docs.flatMap(d=>Object.keys(d))));
 return {state:resultState,changed,result:{documents:docs,columns,affected,elapsed:performance.now()-begin,message}};
}
export function inferDocumentSchema(collections:Collections) {return Object.entries(collections).map(([name,records])=>({name,count:records.length,fields:Array.from(new Set(records.flatMap(d=>Object.keys(d)))).map(field=>({name:field,types:Array.from(new Set(records.filter(d=>field in d).map(d=>{const v=d[field];return v===null?'null':Array.isArray(v)?'array':typeof v;})))}))}));}
