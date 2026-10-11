import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const ledgerPath='bmad/staging-verification-ledger.json';const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
if(ledger.used+10>ledger.budget)throw Error('Verification budget exhausted');
ledger.used+=10;ledger.operations.push({id:ledger.operations.length+1,action:'local-api-auth-smoke',reservedRequests:10,status:'reserved',at:new Date().toISOString(),scope:'Conservative allowance for login, JWKS and live-user checks; remaining requests are loopback.'});fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
const env={};for(const line of fs.readFileSync('.env.local','utf8').split('\n')){const m=/^([A-Z_]+)=(.*)$/.exec(line);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
let passed=false;
try{
 const login=await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:env.SMOKE_TEST_EMAIL,password:env.SMOKE_TEST_PASSWORD})});const auth=await login.json();if(!login.ok||!auth.access_token)throw Error('Test login failed');
 fs.writeFileSync(path.join(os.homedir(),'.codex/private-backups/jambprep/local-test-token.txt'),auth.access_token,{mode:0o600});
 const routes=['auth/session','dashboard','profile','pricing','referrals','onboarding'];
 for(const route of routes){const start=performance.now();const response=await fetch(`http://127.0.0.1:8787/api/v1/${route}`,{headers:{Authorization:`Bearer ${auth.access_token}`,Origin:'http://127.0.0.1:3000'}});const body=await response.text();let code='';try{code=JSON.parse(body).error?.code??'';}catch{}console.log(route,response.status,Math.round(performance.now()-start)+'ms',body.length+'bytes',code);if(!response.ok)throw Error('Local authenticated endpoint check failed');}
 const forbidden=await fetch('http://127.0.0.1:8787/api/v1/profile',{headers:{Authorization:`Bearer ${auth.access_token}`,Origin:'https://untrusted.example'}});if(forbidden.status!==403)throw Error('CORS boundary failed');passed=true;
}finally{ledger.operations.at(-1).status=passed?'passed':'failed';fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');}
