#!/usr/bin/env node
import {verifyPlugin} from './plugin-artifacts.mjs';
if(process.argv.includes('--help')){
 console.log('node scripts/verify-plugin.mjs [--installed-host]\nPortable package/permission/SHA256 verification. Optional --installed-host also checks the exact installed Orca1.4.218 parser on macOS.');process.exit(0);
}
if(process.argv.slice(2).some(arg=>arg!=='--installed-host'))throw Error('Unknown argument');
const result=await verifyPlugin(undefined,{installedHost:process.argv.includes('--installed-host')});
console.log('Plugin '+result.version+' verified; '+result.checksums+' SHA256 checks, '+result.bytes+' bytes.'+(result.installedHost?' Installed Orca parser passed.':' Portable verification only; native loading is a separate check.'));
