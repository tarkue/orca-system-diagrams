#!/usr/bin/env node
// Reproduce notices from the exact installed lockfile tree; no network calls.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
const direct=new Set(Object.keys({...manifest.dependencies,...manifest.devDependencies}));
const packages=[];const texts=new Map();
for(const path of Object.keys(lock.packages??{})){
 if(!path.startsWith('node_modules/'))continue;
 const folder=resolve(root,path);let pkg;
 try{pkg=JSON.parse(await readFile(resolve(folder,'package.json'),'utf8'));}catch{continue;}
 const license=typeof pkg.license==='string'?pkg.license:pkg.license?.type??'not declared';
 const files=(await readdir(folder)).filter(name=>/^(licen[sc]e|copying|notice)(\.|$|-)/i.test(name));
 const refs=[];
 for(const file of files){
  let text;try{text=await readFile(resolve(folder,file),'utf8');}catch{continue;}
  const digest=createHash('sha256').update(text).digest('hex');
  const entry=texts.get(digest)??{id:texts.size+1,text,users:[]};entry.users.push(`${pkg.name}@${pkg.version} (${file})`);texts.set(digest,entry);refs.push(entry.id);
 }
 packages.push({name:pkg.name,version:pkg.version,license,direct:direct.has(pkg.name),refs});
}
packages.sort((a,b)=>a.name.localeCompare(b.name));
let output='# Third-party notices\n\nDiagram IDE — самостоятельная реализация интерфейса, вдохновлённая Orca; исходный код и графические материалы Orca не копировались. Orca — отдельное приложение и цель интеграции, не часть этой поставки; официальная аффилиация не заявляется. Если в будущем включается код Orca, потребуется сохранить его MIT notice (Copyright (c) 2026 Lovecast Inc.); это не лицензия автоматически на весь Diagram IDE.\n\nНиже указаны версии и license metadata, прочитанные из реально установленных package.json для текущего package-lock.json, затем полные найденные LICENSE/COPYING/NOTICE. Включены production- и development-зависимости; отсутствующие платформенные optional packages не заявлены как проверенные. Одинаковые тексты объединены без изменения содержимого. Метаданные пакетов не заменяют условия полного текста; при обновлении зависимостей пересоздайте этот файл командой `node scripts/generate-notices.mjs`.\n\n## Прямые зависимости\n\n| Пакет | Установленная версия | Лицензия | Текст ниже |\n| --- | --- | --- | --- |\n';
const row=p=>`| ${p.name} | ${p.version} | ${p.license} | ${p.refs.map(id=>'[Notice '+id+'](#notice-'+id+')').join(', ')||'В пакете нет корневого license-файла'} |\n`;
for(const pkg of packages.filter(pkg=>pkg.direct))output+=row(pkg);
output+='\n## Остальные установленные зависимости\n\n| Пакет | Установленная версия | Лицензия | Текст ниже |\n| --- | --- | --- | --- |\n';
for(const pkg of packages.filter(pkg=>!pkg.direct))output+=row(pkg);
output+='\n## Полные license/notice тексты\n';
for(const {id,text,users} of texts.values())output+=`\n### Notice ${id}\n\n${users.join('; ')}\n\n\`\`\`text\n${text.trimEnd()}\n\`\`\`\n`;
await writeFile(resolve(root,'THIRD_PARTY_NOTICES.md'),output);
console.log(`Verified ${packages.length} installed packages; preserved ${texts.size} distinct license/notice texts.`);
