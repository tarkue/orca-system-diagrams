import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

export const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const PLUGIN_FILES=['orca-plugin.json','panel.html','THIRD_PARTY_NOTICES.md','bundle-meta.json','SHA256SUMS'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function projectVersion(){
  return JSON.parse(await readFile(resolve(projectRoot,'package.json'),'utf8')).version;
}
export async function verifyPlugin(folder=resolve(projectRoot,'orca-plugin/package'),{installedHost=false}={}){
  const entries=(await readdir(folder)).sort();
  if(JSON.stringify(entries)!==JSON.stringify([...PLUGIN_FILES].sort()))throw Error('Unexpected or missing plugin files');
  for(const name of entries)if(!(await lstat(resolve(folder,name))).isFile())throw Error('Plugin entries must be regular files: '+name);
  const manifest=JSON.parse(await readFile(resolve(folder,'orca-plugin.json'),'utf8'));
  if(manifest.manifestVersion!==1||manifest.pluginApi!==1||manifest.publisher!=='local-diagram'||manifest.id!=='diagram-ide'||manifest.name!=='Схемы системы')throw Error('Unexpected plugin identity or API');
  if(manifest.version!==await projectVersion())throw Error('Plugin and package versions differ');
  if(manifest.main||JSON.stringify(manifest.capabilities)!==JSON.stringify([{kind:'workspace:read'}])||manifest.contributes.commands?.length)throw Error('Viewer permissions expanded unexpectedly');
  if(manifest.contributes.panels?.length!==1||manifest.contributes.panels[0].title!=='Схемы системы'||manifest.contributes.panels[0].entry!=='panel.html')throw Error('Unexpected panel contribution');
  const html=await readFile(resolve(folder,'panel.html'));
  if(!html.length||html.length>10*1024*1024)throw Error('Invalid panel size');
  const sums=(await readFile(resolve(folder,'SHA256SUMS'),'utf8')).trim().split('\n');
  const expected=PLUGIN_FILES.filter(name=>name!=='SHA256SUMS');
  const seen=new Set();
  for(const line of sums){
    const match=/^([a-f0-9]{64})  ([a-zA-Z0-9_.-]+)$/.exec(line);
    if(!match||!expected.includes(match[2])||seen.has(match[2]))throw Error('Invalid checksum manifest');
    seen.add(match[2]);
    if(sha256(await readFile(resolve(folder,match[2])))!==match[1])throw Error('Checksum mismatch: '+match[2]);
  }
  if(seen.size!==expected.length)throw Error('Incomplete checksum manifest');
  if(installedHost){
    const require=createRequire(import.meta.url);
    const installed=require('/Applications/Orca.app/Contents/Resources/app.asar.unpacked/out/main/chunks/plugin-manifest-C9GTe0D4.js');
    const result=installed.i(manifest);
    if(!result.ok)throw Error(result.error);
    if(!installed.o('1.4.218',manifest.engines.orca))throw Error('Engine range excludes reviewed host');
  }
  return {version:manifest.version,bytes:html.length,sha256:sha256(html),checksums:seen.size,installedHost};
}
