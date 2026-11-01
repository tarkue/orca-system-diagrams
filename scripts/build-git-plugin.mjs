#!/usr/bin/env node
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {PLUGIN_FILES,projectRoot,verifyPlugin,sha256} from './plugin-artifacts.mjs';
const source=resolve(projectRoot,'orca-plugin/package'),output=resolve(projectRoot,'plugin');
await verifyPlugin(source);
const manifest=JSON.parse(await readFile(resolve(source,'orca-plugin.json'),'utf8'));
manifest.contributes.panels[0].entry='plugin/panel.html';
const rootManifest=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){
 if(await readFile(resolve(projectRoot,'orca-plugin.json'),'utf8')!==rootManifest)throw Error('Root Git-install manifest is stale; run npm run prepare:git-install');
 for(const name of PLUGIN_FILES){
  const actual=sha256(await readFile(resolve(output,name))),expected=sha256(await readFile(resolve(source,name)));
  if(actual!==expected)throw Error('Git-install artifact differs from current build: '+name);
 }
 console.log('Git installation manifest, prebuilt entry and all artifact hashes match the current build.');
}else{
 if(process.argv.length>2)throw Error('Unknown argument');
 await mkdir(output,{recursive:true});
 for(const name of PLUGIN_FILES)await copyFile(resolve(source,name),resolve(output,name));
 await writeFile(resolve(projectRoot,'orca-plugin.json'),rootManifest);
 console.log('Prepared root orca-plugin.json and prebuilt plugin/ for Git URL installation. No npm is required by the installer.');
}
