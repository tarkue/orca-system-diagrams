import {readFile,stat,writeFile,rename,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {randomUUID,createHash} from 'node:crypto';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let validator;
async function coreValidator(){
 validator??=build({entryPoints:[resolve(projectRoot,'src/core/validation.ts')],bundle:true,write:false,platform:'node',format:'esm',target:'node22'}).then(async result=>(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).validateModel);
 return validator;
}
export async function readViewerModel(path=resolve(projectRoot,'orca-plugin/model.json')){
 if((await stat(path)).size>512*1024)throw Error('Viewer model exceeds 512KiB; previous panel is preserved');
 let model;try{model=JSON.parse(await readFile(path,'utf8'));}catch{throw Error('Invalid viewer model JSON; previous panel is preserved');}
 const validation=(await coreValidator())(model);
 if(!validation.valid)throw Error('Invalid viewer model: '+validation.errors.slice(0,8).join('; '));
 return {model,hash:createHash('sha256').update(JSON.stringify(model)).digest('hex')};
}
export function viewerModelScript(model){
 const serialized=JSON.stringify(model).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return 'window.__SYSTEM_DIAGRAM_MODEL__='+serialized+';';
}
export async function writeAtomic(path,content){
 const temporary=path+'.'+randomUUID()+'.tmp';
 try{await writeFile(temporary,content);await rename(temporary,path);}finally{await rm(temporary,{force:true});}
}
