import {describe,it,expect} from 'vitest';
import {BpmnModdle} from 'bpmn-moddle';
import {exportBpmnXml,sampleProjects,proposeChange} from '../src/core/index';
const kinds={start:'bpmn:StartEvent',task:'bpmn:Task',decision:'bpmn:ExclusiveGateway',end:'bpmn:EndEvent'} as const;
describe('independent BPMN semantic import, not string-only SVG checks',()=>{
 it.each(sampleProjects)('$id preserves real BPMN node/flow types and diagram references',async model=>{
  const parsed=await new BpmnModdle().fromXML(exportBpmnXml(model));
  expect(parsed.warnings).toEqual([]);
  const definitions=parsed.rootElement;
  const process=definitions.rootElements.find((element:any)=>element.$type==='bpmn:Process');
  expect(process.isExecutable).toBe(false);
  for(const [index,step] of model.workflow.steps.entries()){
   const element=parsed.elementsById[`Step_${index}`];
   expect(element.$type).toBe(kinds[step.kind]);expect(element.name).toBe(step.name);
   expect(element.outgoing?.length??0).toBe(model.workflow.edges.filter(edge=>edge.from===step.id).length);
   expect(element.incoming?.length??0).toBe(model.workflow.edges.filter(edge=>edge.to===step.id).length);
  }
  for(const [index,edge] of model.workflow.edges.entries()){
   const flow=parsed.elementsById[`Flow_${index}`];expect(flow.$type).toBe('bpmn:SequenceFlow');
   expect(flow.sourceRef.name).toBe(model.workflow.steps.find(step=>step.id===edge.from)?.name);
   expect(flow.targetRef.name).toBe(model.workflow.steps.find(step=>step.id===edge.to)?.name);
   expect(flow.sourceRef.outgoing).toContain(flow);expect(flow.targetRef.incoming).toContain(flow);
  }
  const plane=definitions.diagrams[0].plane;
  expect(plane.bpmnElement).toBe(process);
  for(const di of plane.planeElement){
   expect(di.bpmnElement).toBeTruthy();
   if(di.$type==='bpmndi:BPMNShape'){
    expect(di.bounds.width).toBeGreaterThan(0);expect(di.bounds.height).toBeGreaterThan(0);
    if(di.bpmnElement.$type==='bpmn:ExclusiveGateway')expect(di.isMarkerVisible).toBe(true);
   }else{expect(di.waypoint.length).toBeGreaterThanOrEqual(2);}
  }
 });
 it('decodes hostile XML names as text while retaining rule expressions',async()=>{
  const model=proposeChange(sampleProjects[0],'set threshold 12345').model;
  model.workflow.steps[1].name='<script onload="evil()"> & "quoted"';
  const parsed=await new BpmnModdle().fromXML(exportBpmnXml(model));
  expect(parsed.warnings).toEqual([]);expect(parsed.elementsById.Step_1.name).toBe(model.workflow.steps[1].name);
  const expressions=Object.values(parsed.elementsById).filter((e:any)=>e.$type==='bpmn:SequenceFlow'&&e.conditionExpression).map((e:any)=>e.conditionExpression.body);
  expect(expressions).toContain('true && amount > 12345');expect(expressions).toContain('!true || amount <= 12345');
  expect(expressions).toContain('decision === "approved"');expect(expressions).toContain('decision === "rejected"');
 });
});
