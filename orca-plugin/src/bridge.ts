export interface WorkspaceContext {displayName:string;branch:string;terminals:{id:string}[]}
interface Pending {resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}
const pending=new Map<string,Pending>();let sequence=0;
if(typeof window!=='undefined')window.addEventListener('message',event=>{
 if(event.source!==window.parent)return;
 const data=event.data;
 if(!data||data.type!=='orca-panel-action-result'||typeof data.requestId!=='string')return;
 const call=pending.get(data.requestId);if(!call)return;
 pending.delete(data.requestId);clearTimeout(call.timer);
 if(data.ok===true)call.resolve(data.value);
 else call.reject(new Error(typeof data.error==='string'?data.error:'Orca отклонила запрос'));
});
export function hostRequest(action:'workspace.readContext',params:unknown={}):Promise<unknown>{
 if(window.parent===window)return Promise.reject(new Error('Откройте нативную панель «Схемы системы» внутри Orca'));
 if(pending.size>=4)return Promise.reject(new Error('Слишком много запросов к Orca'));
 const requestId=`diagram-${Date.now()}-${++sequence}`;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Orca не ответила за 8 секунд'));},8000);
  pending.set(requestId,{resolve,reject,timer});
  window.parent.postMessage({type:'orca-panel-action',requestId,action,params},'*');
 });
}
export async function readWorkspaceContext():Promise<WorkspaceContext|null>{
 const result=await hostRequest('workspace.readContext');
 if(result===null)return null;
 const value=result as WorkspaceContext;
 if(!value||typeof value.displayName!=='string'||typeof value.branch!=='string'||!Array.isArray(value.terminals)||value.terminals.some(terminal=>typeof terminal?.id!=='string'))throw Error('Некорректный ответ контекста Orca');
 return value;
}
