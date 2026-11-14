// Local-only PC preview of the exact built web package. Never binds a public interface.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist/neon-idle');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
if(!fs.existsSync(path.join(root,'index.html'))){console.error('Build first: node automation/build-mobile-web.cjs');process.exit(1)}
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,body)=>{
  if(err){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(body);
 });
});
server.listen(4173,'127.0.0.1',()=>{
 const a=server.address();
 console.log('Local PC preview: http://127.0.0.1:'+a.port+'/');
 console.log('Ctrl+C to stop. Loopback only; not reachable from your phone.');
});

server.on('error',err=>{console.error('Local preview unavailable: '+err.message);process.exitCode=1});
