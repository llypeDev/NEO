'use strict';
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
const paths=[];
function scan(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,f.name);if(f.isDirectory())scan(full);else if(/\.(cjs|js)$/.test(full))paths.push(full);}}
scan('src');scan('scripts');scan('test');
for(const file of paths)execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const registry=require('../src/registry.cjs'),{parsers}=require('../src/core.cjs');require('../src/providers.cjs');
if(registry.filter(p=>p.id!=='extension').length!==77)throw new Error('Catálogo deve conter 77 provedores.');
for(const p of registry)if(typeof parsers[p.id]!=='function')throw new Error(`Parser ausente: ${p.id}`);
console.log(`${paths.length} arquivos verificados; 77 provedores e extensão com adaptadores.`);
