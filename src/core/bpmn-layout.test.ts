import {describe,it,expect} from 'vitest';
import {exportBpmnXml} from './bpmn-xml';
import canonical from '../../orca-plugin/model.json';
import type {SystemModel} from './model';
type Box={x:number;y:number;width:number;height:number};
const bounds=(xml:string):Box[]=>[...xml.matchAll(/<dc:Bounds x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\/>/g)].map(m=>({x:+m[1],y:+m[2],width:+m[3],height:+m[4]}));
const intersects=(a:Box,b:Box)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+1;
describe('BPMN labels have reserved layout space',()=>{
 it.each([false,true])('keeps external labels apart from activities and each other, long=%s',long=>{
 const model=structuredClone(canonical) as SystemModel;
 if(long){model.workflow.steps.forEach(s=>s.name+=' — '+('Длинное описание операции и ожидаемого результата ').repeat(3));model.workflow.edges.forEach(e=>e.label='Переход после успешного завершения предыдущего действия');}
 const xml=exportBpmnXml(model);
 const labels=[...xml.matchAll(/<bpmndi:BPMNLabel>([\s\S]*?)<\/bpmndi:BPMNLabel>/g)].flatMap(m=>bounds(m[1]));
 const shapes=[...xml.matchAll(/<bpmndi:BPMNShape[^>]+bpmnElement="Step_\d+"[^>]*>([\s\S]*?)<\/bpmndi:BPMNShape>/g)].flatMap(m=>bounds(m[1]).slice(0,1));
 for(let i=0;i<labels.length;i++){for(const shape of shapes)expect(intersects(labels[i],shape)).toBe(false);for(let j=i+1;j<labels.length;j++)expect(intersects(labels[i],labels[j])).toBe(false);}
 });
});
