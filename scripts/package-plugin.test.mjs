import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {packagePlugin} from './package-plugin.mjs';
import {projectVersion,sha256} from './plugin-artifacts.mjs';
const fixture=async folder=>{
 await mkdir(folder);
 const version=await projectVersion();
 const files={'orca-plugin.json':JSON.stringify({manifestVersion:1,publisher:'local-diagram',id:'diagram-ide',name:'Схемы системы',version,pluginApi:1,engines:{orca:'>=1.4.218'},contributes:{panels:[{id:'model',title:'Схемы системы',entry:'panel.html'}]},capabilities:[{kind:'workspace:read'}]}),'panel.html':'<!doctype html><h1>Diagram fixture</h1>','THIRD_PARTY_NOTICES.md':'Fixture licenses','bundle-meta.json':'{}'};
 for(const [name,content]of Object.entries(files))await writeFile(join(folder,name),content);
 await writeFile(join(folder,'SHA256SUMS'),Object.entries(files).map(([name,content])=>sha256(content)+'  '+name).join('\n')+'\n');
};
test('release extracts to an installable folder and checksum describes the actual ZIP',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'diagram-package-test-'));
 try{
  const folder=join(temp,'input');await fixture(folder);const license=join(temp,'LICENSE');await writeFile(license,'Test license');
  const result=await packagePlugin({packageDirectory:folder,outputDirectory:join(temp,'output'),licensePath:license});
  assert.equal(sha256(await readFile(result.archive)),result.sha256);
  const extracted=join(temp,'extract');await mkdir(extracted);const unzip=spawnSync('unzip',['-q',result.archive,'-d',extracted],{encoding:'utf8'});assert.equal(unzip.status,0,unzip.stderr);
  assert.equal(await readFile(join(extracted,'orca-system-diagrams/panel.html'),'utf8'),'<!doctype html><h1>Diagram fixture</h1>');
  assert.match(await readFile(join(extracted,'INSTALL.md'),'utf8'),/Settings > Plugins/);
  assert.equal(await readFile(join(extracted,'LICENSE'),'utf8'),'Test license');
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('tampered panel is rejected before any release archive is produced',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'diagram-package-tampered-'));
 try{const folder=join(temp,'input');await fixture(folder);await writeFile(join(folder,'panel.html'),'tampered');await assert.rejects(packagePlugin({packageDirectory:folder,outputDirectory:join(temp,'out')}),/Checksum mismatch/);}
 finally{await rm(temp,{recursive:true,force:true});}
});
