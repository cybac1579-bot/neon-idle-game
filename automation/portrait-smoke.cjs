const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const dir=path.join(__dirname,'portrait-evidence');
  fs.mkdirSync(dir,{recursive:true});
  const metrics=[];
  try {
    for(const [width,height] of [[360,740],[412,915]]) {
      const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.goto('file://'+path.resolve(__dirname,'../site/index.html'),{waitUntil:'load'});
      await page.waitForTimeout(1200);
      const result=await page.evaluate(()=>{
        const battle=document.querySelector('[data-screen="battle"]');
        const fight=battle.querySelector('.fight');
        const images=[...fight.querySelectorAll('img')];
        const r=e=>{const x=e.getBoundingClientRect();return {top:x.top,bottom:x.bottom,width:x.width,height:x.height}};
        return {viewport:{w:innerWidth,h:innerHeight},bodyScrollWidth:document.body.scrollWidth,documentScrollWidth:document.documentElement.scrollWidth,battle:r(battle),fight:r(fight),images:images.map(i=>({...r(i),loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')})),nav:r(document.querySelector('.nav')),active:document.querySelector('[data-view].active')?.dataset.view};
      });
      await page.screenshot({path:path.join(dir,`battle-${width}x${height}.png`),fullPage:true});
      metrics.push({...result,errors});
      if(errors.length||result.documentScrollWidth>width+1||result.active!=='battle'||result.fight.height<200||result.images.some(i=>!i.loaded||i.width<60)) throw Error('Portrait smoke failed '+JSON.stringify(metrics.at(-1)));
      await page.getByRole('button',{name:'성장',exact:true}).click();
      if(!(await page.locator('[data-screen="growth"]').first().isVisible())) throw Error('Growth navigation failed');
      await page.close();
    }
    fs.writeFileSync(path.join(dir,'metrics.json'),JSON.stringify(metrics,null,2));
    console.log(JSON.stringify(metrics));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
