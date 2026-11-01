#!/usr/bin/env node
// Built-ins only: verifies a fresh Git clone without npm install or a local build.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {projectRoot,verifyPlugin} from './plugin-artifacts.mjs';
const folder=resolve(projectRoot,'plugin');
const verified=await verifyPlugin(folder);
const expected=JSON.parse(await readFile(resolve(folder,'orca-plugin.json'),'utf8'));
expected.contributes.panels[0].entry='plugin/panel.html';
const actual=JSON.parse(await readFile(resolve(projectRoot,'orca-plugin.json'),'utf8'));
if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Root Git-install manifest does not match the prebuilt plugin identity and entry');
console.log('Git clone is install-ready: root manifest, prebuilt panel, workspace:read-only permissions and '+verified.checksums+' SHA256 checks passed. No npm required.');
