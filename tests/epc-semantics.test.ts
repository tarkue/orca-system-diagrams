import {describe,it,expect} from 'vitest';
import {sampleProjects,validateModel} from '../src/core';
import {projectEpc} from '../src/notations/epc-model';
describe('independent EPC control-flow semantics',()=>{
 it.each(sampleProjects)('$id routes all branching and joining through connectors',model=>{
  const graph=projectEpc(model);const ids=new Set(graph.nodes.map(node=>node.id));
  expect(ids.size).toBe(graph.nodes.length);
  for(const edge of graph.edges){expect(ids.has(edge.from)).toBe(true);expect(ids.has(edge.to)).toBe(true);}
  for(const node of graph.nodes.filter(node=>node.kind!=='xor')){
   expect(graph.edges.filter(edge=>edge.from===node.id).length,`non-connector ${node.label} branches without XOR`).toBeLessThanOrEqual(1);
   expect(graph.edges.filter(edge=>edge.to===node.id).length,`non-connector ${node.label} joins without XOR`).toBeLessThanOrEqual(1);
  }
  for(const step of model.workflow.steps){
   const semanticNodes=graph.nodes.filter(node=>node.modelId===step.id&&node.kind!=='xor');
   expect(semanticNodes).toHaveLength(1);
   expect(semanticNodes[0].kind).toBe(['start','end'].includes(step.kind)?'event':'function');
  }
 });
 it('inserts a connector for a valid task with mutually exclusive outgoing flows',()=>{
  const model=structuredClone(sampleProjects[0]);model.workflow.steps.find(step=>step.id==='approval')!.kind='task';
  expect(validateModel(model).valid).toBe(true);
  const graph=projectEpc(model);const approval=graph.nodes.find(node=>node.modelId==='approval'&&node.kind==='function')!;
  const outgoing=graph.edges.filter(edge=>edge.from===approval.id);
  expect(outgoing).toHaveLength(1);
  expect(graph.nodes.find(node=>node.id===outgoing[0].to)?.kind).toBe('xor');
 });
});
