import {test,expect,vi,afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
test('context bridge correlates responses and ignores non-parent senders',async()=>{
 let listener:(event:any)=>void=()=>{};const parent={postMessage:vi.fn()};
 vi.stubGlobal('window',{parent,addEventListener:(_:string,fn:any)=>{listener=fn;}});
 const {readWorkspaceContext}=await import('./bridge');const promise=readWorkspaceContext();
 const request=parent.postMessage.mock.calls[0][0];expect(request.action).toBe('workspace.readContext');
 listener({source:{},data:{type:'orca-panel-action-result',requestId:request.requestId,ok:true,value:{invalid:true}}});
 const value={displayName:'Project',branch:'main',terminals:[{id:'t'}]};listener({source:parent,data:{type:'orca-panel-action-result',requestId:request.requestId,ok:true,value}});
 await expect(promise).resolves.toEqual(value);
});
test('host denial and invalid response stay visible errors',async()=>{
 let listener:(event:any)=>void=()=>{};const parent={postMessage:vi.fn()};
 vi.stubGlobal('window',{parent,addEventListener:(_:string,fn:any)=>{listener=fn;}});
 const {readWorkspaceContext}=await import('./bridge');
 for(const response of [{ok:false,error:'capability denied'},{ok:true,value:{displayName:1}}]){
  const promise=readWorkspaceContext();const request=parent.postMessage.mock.calls.at(-1)![0];
  listener({source:parent,data:{type:'orca-panel-action-result',requestId:request.requestId,...response}});await expect(promise).rejects.toThrow();
 }
});
