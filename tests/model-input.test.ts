import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {sampleProjects} from '../src/core';
import {readViewerModel,viewerModelScript} from '../orca-plugin/model-input.mjs';
describe('independent validated file-to-viewer input',()=>{
 it('reads valid model bytes and rejects malformed/oversized replacements',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'diagram-viewer-qa-'));const path=join(directory,'model.json');
  try{
   await writeFile(path,JSON.stringify(sampleProjects[0]));
   const result=await readViewerModel(path);expect(result.model).toEqual(sampleProjects[0]);expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
   await writeFile(path,'{"broken"');await expect(readViewerModel(path)).rejects.toThrow('Invalid viewer model JSON');
   await writeFile(path,JSON.stringify({nodes:[]}));await expect(readViewerModel(path)).rejects.toThrow('Invalid viewer model');
   await writeFile(path,' '.repeat(512*1024+1));await expect(readViewerModel(path)).rejects.toThrow('512KiB');
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('embeds hostile labels as inert script data without closing its HTML script',()=>{
  const model=structuredClone(sampleProjects[0]);model.name='</script><img src=x onerror="globalThis.injected=true"> & \u2028 \u2029';
  const source=viewerModelScript(model);expect(source.toLowerCase()).not.toContain('</script');expect(source).not.toContain('<img');
  const sandbox:{window:Record<string,unknown>;injected?:boolean}={window:{}};
  runInNewContext(source,sandbox);expect(sandbox.window.__SYSTEM_DIAGRAM_MODEL__).toEqual(model);expect(sandbox.injected).toBeUndefined();
 });
});
