import type { SchemaInfo, SqlResult } from '../types';
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>();
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/sql.worker.ts', import.meta.url), { type:'module' });
    worker.onmessage = (evt: MessageEvent<{id:number;ok:boolean;result:unknown;error?:string}>) => {
      const request = pending.get(evt.data.id); if (!request) return; pending.delete(evt.data.id);
      evt.data.ok ? request.resolve(evt.data.result) : request.reject(new Error(evt.data.error ?? 'SQL worker error'));
    };
    worker.onerror = (evt) => { for (const req of pending.values()) req.reject(new Error(evt.message || 'SQLite worker crashed')); pending.clear(); };
  }
  return worker;
}
function ask<T>(action: string, data?: unknown): Promise<T> { return new Promise((resolve, reject) => {
  const id = ++nextId; pending.set(id,{resolve:v => resolve(v as T),reject}); getWorker().postMessage({id,action,data});
}); }
export const sqlClient = {
  open:(bytes?: Uint8Array) => ask<SchemaInfo>('open',bytes?.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),
  execute:(text:string) => ask<SqlResult>('execute',text),
  inspect:() => ask<SchemaInfo>('schema'),
  bytes:() => ask<Uint8Array>('bytes'),
  dump:() => ask<string>('dump'),
  evaluate:(candidate:string,solution:string) => ask<{correct:boolean;expectedRows:number;returnedRows:number}>('evaluate',{candidate,solution})
};
