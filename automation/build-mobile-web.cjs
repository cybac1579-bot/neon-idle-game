// Build an install-oriented static web bundle with raster home-screen icons.
// Requires playwright Chromium, already installed by portrait integration workflow.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const source=path.resolve(__dirname,'../site');
const output=path.resolve(__dirname,'../dist/neon-idle');
(async()=>{
 fs.rmSync(output,{recursive:true,force:true});
 fs.cpSync(source,output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
  const svg=fs.readFileSync(path.join(source,'app-icon.svg'),'utf8');
  await page.setContent('<html><body style="margin:0">'+svg+'</body></html>');
  for(const size of [192,512]){
   await page.setViewportSize({width:size,height:size});
   await page.locator('svg').evaluate((node,size)=>{node.setAttribute('width',String(size));node.setAttribute('height',String(size));},size);
   await page.locator('svg').screenshot({path:path.join(output,'app-icon-'+size+'.png')});
  }
 }finally{await browser.close()}
 const manifestPath=path.join(output,'manifest.webmanifest');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 manifest.icons=[192,512].map(size=>({src:'app-icon-'+size+'.png',sizes:size+'x'+size,type:'image/png',purpose:'any maskable'}));
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 for(const size of [192,512]){
  const png=fs.readFileSync(path.join(output,'app-icon-'+size+'.png'));
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==size||png.readUInt32BE(20)!==size)throw Error('Invalid icon '+size);
 }
 console.log('Built static portrait web bundle with 192/512 PNG icons at '+output);
})().catch(e=>{console.error(e);process.exitCode=1});
