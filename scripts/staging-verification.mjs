import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const action=process.argv[2];
if(!['audit','backup','migrate'].includes(action)) throw Error('Choose audit, backup or migrate');
const ledgerPath='bmad/staging-verification-ledger.json';
// Serialize provider operations and ledger reservations across concurrent invocations.
const lockPath=ledgerPath+'.lock';
const lock=fs.openSync(lockPath,'wx',0o600);
process.on('exit',()=>{fs.closeSync(lock);fs.unlinkSync(lockPath);});
const ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):{budget:250,maxConcurrency:3,used:0,operations:[]};
if(ledger.used>=ledger.budget) throw Error('Staging budget exhausted');
const id=ledger.operations.length+1;
ledger.used++;ledger.operations.push({id,action,status:'reserved',at:new Date().toISOString()});
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
const values={};for(const line of fs.readFileSync('.env.local','utf8').split('\n')){const m=/^([A-Z_]+)=(.*)$/.exec(line);if(m)values[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const url=new URL(values.DATABASE_URL);
const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)||values.DATABASE_PASSWORD,PGDATABASE:url.pathname.slice(1),PGSSLMODE:'verify-full',PGSSLROOTCERT:fs.existsSync('supabase-ca.crt')?path.resolve('supabase-ca.crt'):'system',PGCONNECT_TIMEOUT:'15'};
const directory=path.join(os.homedir(),'.codex','private-backups','jambprep');fs.mkdirSync(directory,{recursive:true,mode:0o700});fs.chmodSync(directory,0o700);
let result;
if(action==='audit') {result=spawnSync('/opt/homebrew/opt/libpq/bin/psql',['-X','-v','ON_ERROR_STOP=1','-f','drizzle/native-release-preflight.sql'],{env,encoding:'utf8',timeout:120000});fs.writeFileSync(path.join(directory,'schema-audit.txt'),result.stdout||'',{mode:0o600});}
else if(action==='migrate') {
const backups=fs.readdirSync(directory).filter(name=>/^pre-native-.*\.dump$/.test(name)).sort();
if(!backups.length) throw Error('Verified private backup required');
const backupCheck=spawnSync('/opt/homebrew/opt/libpq/bin/pg_restore',['--list',path.join(directory,backups.at(-1))],{encoding:'utf8'});
if(backupCheck.status!==0) throw Error('Private backup inspection failed');
result=spawnSync('/opt/homebrew/opt/libpq/bin/psql',['-X','-v','ON_ERROR_STOP=1','-f','drizzle/0003_native_api_prerequisites.sql','-f','drizzle/0004_payment_workflow.sql','-f','drizzle/native-legacy-expiry-recovery.sql'],{env,encoding:'utf8',timeout:120000});
fs.writeFileSync(path.join(directory,'approved-live-migrations.txt'),(result.stdout||'')+(result.stderr||''),{mode:0o600});
}
else {const file=path.join(directory,`pre-native-${Date.now()}.dump`);fs.closeSync(fs.openSync(file,'wx',0o600));result=spawnSync('/opt/homebrew/opt/libpq/bin/pg_dump',['--format=custom','--no-owner','--no-acl','--file',file],{env,encoding:'utf8',timeout:180000});if(fs.existsSync(file))fs.chmodSync(file,0o600);if(result.status===0){const check=spawnSync('/opt/homebrew/opt/libpq/bin/pg_restore',['--list',file],{encoding:'utf8'});if(check.status!==0)throw Error('Backup archive inspection failed');console.log('Private backup archive created and readable; restore rehearsal still required.');}}
const latest=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));const operation=latest.operations.find(item=>item.id===id);operation.status=result.status===0?'passed':'failed';operation.completedAt=new Date().toISOString();fs.writeFileSync(ledgerPath,JSON.stringify(latest,null,2)+'\n');
// Credentials and raw connection diagnostics stay out of terminal output.
if(result.status!==0){fs.writeFileSync(path.join(directory,`${action}-failure.txt`),result.stderr||String(result.error||'Failed'),{mode:0o600});console.log(`${action} failed; diagnostic stored privately.`);process.exitCode=1;}else console.log(`${action} passed; budget ${ledger.used}/${ledger.budget}.`);
