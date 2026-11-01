#!/usr/bin/env node
import {readFile,writeFile,mkdir,mkdtemp,copyFile,chmod,utimes,rm,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PLUGIN_FILES,projectRoot,verifyPlugin,sha256} from './plugin-artifacts.mjs';

export async function packagePlugin({packageDirectory=resolve(projectRoot,'orca-plugin/package'),outputDirectory=resolve(projectRoot,'releases'),licensePath=resolve(projectRoot,'LICENSE')}={}){
 const verified=await verifyPlugin(packageDirectory);
 if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(verified.version))throw Error('Invalid release version');
 const temporary=await mkdtemp(join(tmpdir(),'orca-diagrams-release-'));
 try{
  const folder=join(temporary,'orca-system-diagrams');await mkdir(folder);
  for(const name of PLUGIN_FILES)await copyFile(join(packageDirectory,name),join(folder,name));
  await copyFile(licensePath,join(temporary,'LICENSE'));
  await writeFile(join(temporary,'INSTALL.md'),'# System Diagrams for Orca\n\n1. Extract this archive.\n2. In Orca, open Settings > Plugins > Install plugin > Local folder.\n3. Choose the included orca-system-diagrams folder (the one containing orca-plugin.json).\n4. Review workspace:read and enable the plugin.\n5. Open Схемы системы in the right sidebar.\n\nTested with Orca1.4.218 (plugin API1). For your own model, live development updates, compatibility and limitations:\nhttps://github.com/tarkue/orca-system-diagrams/blob/main/docs/INSTALL.md\n\nThis package has no background worker, network bridge or agent launcher. Original source: MIT; bundled dependencies retain their licenses and attribution.\n');
  const epoch=new Date('2020-01-01T00:00:00Z');
  for(const path of [folder,...PLUGIN_FILES.map(name=>join(folder,name)),join(temporary,'LICENSE'),join(temporary,'INSTALL.md')]){
    await chmod(path,path===folder?0o755:0o644);await utimes(path,epoch,epoch);
  }
  await mkdir(outputDirectory,{recursive:true});
  const name='orca-system-diagrams-'+verified.version+'.zip',archive=resolve(outputDirectory,name);
  await rm(archive,{force:true});
  const result=spawnSync('zip',['-X','-q','-r',archive,'orca-system-diagrams','INSTALL.md','LICENSE'],{cwd:temporary,encoding:'utf8',env:{...process.env,TZ:'UTC'}});
  if(result.error)throw result.error;if(result.status!==0)throw Error('zip failed: '+result.stderr);
  const checksum=sha256(await readFile(archive));
  await writeFile(archive+'.sha256',checksum+'  '+name+'\n');
  await writeFile(resolve(outputDirectory,'SHA256SUMS'),checksum+'  '+name+'\n');
  return {version:verified.version,archive,sha256:checksum,bytes:(await stat(archive)).size};
 }finally{await rm(temporary,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await packagePlugin(),null,2));
