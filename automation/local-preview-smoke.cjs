// Exercise the actual local preview command against the packaged distribution.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const server=spawn(process.execPath,[path.join(__dirname,'local-preview.cjs')],{stdio:['ignore','pipe','pipe']});
let stdout='',stderr='';
server.stdout.on('data',x=>stdout+=x.toString());
server.stderr.on('data',x=>stderr+=x.toString());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const get=pathname=>new Promise((resolve,reject)=>{
 const req=http.get('http://127.0.0.1:4173'+pathname,{timeout:3000},res=>{
  const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
 });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('request timeout')));
});
(async()=>{
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(server.exitCode!==null)throw Error('Preview server exited early: '+stderr);
   if(stdout.includes('http://127.0.0.1:4173/')){ready=true;break}
   await sleep(100);
  }
  assert.ok(ready,'local preview ready');
  for(const [route,type] of [['/','text/html'],['/game.js','text/javascript'],['/manifest.webmanifest','application/manifest+json'],['/app-icon-192.png','image/png']]){
   const r=await get(route);
   assert.equal(r.status,200,route+' response');
   assert.ok(r.headers['content-type'].includes(type),route+' MIME');
   assert.ok(r.body.length>100,route+' body');
   assert.equal(r.headers['cache-control'],'no-store');
  }
  const missing=await get('/nonexistent-file.js');
  assert.equal(missing.status,404,'missing file');
  const traversal=await get('/%2e%2e/%2e%2e/etc/passwd');
  assert.notEqual(traversal.status,200,'traversal blocked');
  console.log('Local PC preview smoke passed (HTTP, MIME, missing file, traversal)');
 }finally{
  server.kill('SIGTERM');
 }
})().catch(e=>{console.error(e);console.error(stderr);process.exitCode=1});
