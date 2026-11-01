import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {readViewerModel,viewerModelScript,writeAtomic} from './model-input.mjs';
const sample=JSON.parse(await readFile(new URL('../examples/refunds.json',import.meta.url),'utf8'));
test('file written by an agent is validated and model changes change the payload hash',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'diagram-model-'));const path=join(dir,'model.json');
 try{await writeFile(path,JSON.stringify(sample));const first=await readViewerModel(path);assert.equal(first.model.id,sample.id);
 const next=structuredClone(sample);next.name='Updated by agent';next.version++;await writeAtomic(path,JSON.stringify(next));const second=await readViewerModel(path);assert.notEqual(first.hash,second.hash);assert.equal(second.model.name,next.name);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid file/graph and excessive size are rejected before panel replacement',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'diagram-model-'));const path=join(dir,'model.json');
 try{for(const value of ['bad json',JSON.stringify({...sample,nodes:[]})]){await writeFile(path,value);await assert.rejects(readViewerModel(path),/Invalid/);}
 await writeFile(path,' '.repeat(512*1024+1));await assert.rejects(readViewerModel(path),/512KiB/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('embedded model is data, closing script and Unicode separators are escaped',()=>{
 const model=structuredClone(sample);model.name='</script><img src=x>\u2028&';const source=viewerModelScript(model);assert.ok(!source.includes('</script>'));assert.ok(!source.includes('<img'));
 const context={window:{}};runInNewContext(source,context);assert.equal(context.window.__SYSTEM_DIAGRAM_MODEL__.name,model.name);
});
