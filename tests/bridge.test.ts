import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
// Injected window/parent only: validates bridge behavior, not a real native host.
let receive:(event:{source:unknown;data:unknown})=>void;
let parent:{postMessage:ReturnType<typeof vi.fn>};
beforeEach(()=>{
 vi.resetModules();vi.useFakeTimers();parent={postMessage:vi.fn()};
 vi.stubGlobal('window',{parent,addEventListener:(_type:string,listener:typeof receive)=>{receive=listener;}});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const reply=(value:unknown,ok=true)=>{
 const request=parent.postMessage.mock.calls.at(-1)![0];
 receive({source:parent,data:{type:'orca-panel-action-result',requestId:request.requestId,ok,...(ok?{value}:{error:value})}});
};
describe('independent panel bridge with injected host',()=>{
 it('correlates a valid workspace response from the actual parent object',async()=>{
  const {readWorkspaceContext}=await import('../orca-plugin/src/bridge');
  const pending=readWorkspaceContext();const context={displayName:'QA workspace',branch:'qa',terminals:[{id:'t1'}]};reply(context);
  await expect(pending).resolves.toEqual(context);
  expect(parent.postMessage.mock.calls[0][0].action).toBe('workspace.readContext');
 });
 it('rejects denied capability and malformed workspace context',async()=>{
  const {readWorkspaceContext}=await import('../orca-plugin/src/bridge');
  const denied=readWorkspaceContext();reply('QA denied',false);await expect(denied).rejects.toThrow('QA denied');
  const malformed=readWorkspaceContext();reply({displayName:7,branch:null,terminals:[]});await expect(malformed).rejects.toThrow('Некорректный');
 });
 it('ignores forged non-parent responses and times out after eight seconds',async()=>{
  const {readWorkspaceContext}=await import('../orca-plugin/src/bridge');
  const pending=readWorkspaceContext();const request=parent.postMessage.mock.calls[0][0];
  receive({source:{},data:{type:'orca-panel-action-result',requestId:request.requestId,ok:true,value:null}});
  const rejected=expect(pending).rejects.toThrow('8 секунд');
  await vi.advanceTimersByTimeAsync(8000);await rejected;
 });
 it('caps in-flight calls at four and releases capacity after parent replies',async()=>{
  const {hostRequest}=await import('../orca-plugin/src/bridge');
  const calls=Array.from({length:4},()=>hostRequest('workspace.readContext'));
  await expect(hostRequest('workspace.readContext')).rejects.toThrow('Слишком много');
  for(const [request] of parent.postMessage.mock.calls)receive({source:parent,data:{type:'orca-panel-action-result',requestId:request.requestId,ok:true,value:null}});
  await expect(Promise.all(calls)).resolves.toEqual([null,null,null,null]);
  const next=hostRequest('workspace.readContext');reply(null);await expect(next).resolves.toBeNull();
 });
});
