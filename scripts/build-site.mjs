#!/usr/bin/env node
import {cp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {projectRoot,projectVersion} from './plugin-artifacts.mjs';
const version=await projectVersion(),source=resolve(projectRoot,'website'),output=resolve(projectRoot,'dist/site');
const archive='orca-system-diagrams-'+version+'.zip';
await stat(resolve(projectRoot,'releases',archive));
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});
await mkdir(resolve(output,'downloads'),{recursive:true});
for(const name of [archive,archive+'.sha256','SHA256SUMS'])await cp(resolve(projectRoot,'releases',name),resolve(output,'downloads',name));
await writeFile(resolve(output,'.nojekyll'),'');
const html=await readFile(resolve(output,'index.html'),'utf8');
if(/__[A-Z_]+__|TODO|lorem ipsum/i.test(html))throw Error('Unresolved website placeholder');
if(!html.includes(archive))throw Error('Website download does not match release version');
for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const target=match[1];
 if(target.startsWith('#')||/^[a-z]+:/i.test(target))continue;
 const path=resolve(output,target.split(/[?#]/)[0]);
 if(!path.startsWith(output+'/'))throw Error('Website asset escapes its project path');
 await stat(path);
}
console.log('Static GitHub Pages artifact: '+output);
