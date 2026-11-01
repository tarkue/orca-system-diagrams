#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {projectRoot} from './plugin-artifacts.mjs';
const files=execFileSync('git',['ls-files','-z'],{cwd:projectRoot,encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw Error('No tracked publication files to check');
const forbidden=/^(?:AGENTS\.md|server\/|docs\/(?:memory|reports)\/|orca-plugin\/(?:worker|REVIEW)|exports\/|examples\/generated\/)|(?:^|\/)\.env(?:\.|$)/;
const sensitive=[/\/Users\/[A-Za-z0-9._-]+\//,/term_[a-f0-9]{8}-[a-f0-9-]{27,}/,/run_[a-f0-9]{12,}/,/github_pat_[A-Za-z0-9_]{30,}/,/gh[pousr]_[A-Za-z0-9]{30,}/];
for(const file of files){
 if(forbidden.test(file))throw Error('Internal file staged for publication: '+file);
 if(!/\.(?:md|json|[cm]?js|ts|tsx|html|css|ya?ml|svg)$/.test(file)&&file!=='LICENSE')continue;
 const content=await readFile(resolve(projectRoot,file),'utf8');
 if(file==='scripts/check-publication.mjs')continue;
 if(sensitive.some(pattern=>pattern.test(content)))throw Error('Local path, session identifier or credential-shaped value in '+file);
}
console.log('Publication allowlist checked: '+files.length+' tracked files; no local evidence/session identifiers or credential-shaped values.');
