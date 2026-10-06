// Banc de captures sans Electron (V12.8, session cloud) : le jeu servi en http (python3 -m http.server 8765 dans resources/jeu), ouvert dans le
// Chromium de Playwright, même interface que harness.cjs : main(async({run,wait,shot,logs})=>{…},{w,h,out}).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
exports.main=async(scenario,{w=1600,h=900,out=__dirname,url='http://127.0.0.1:8765/index.html'}={})=>{fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:w,height:h}});const logs=[];page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>logs.push('ERREUR '+e.message));
  await page.goto(url);await page.waitForFunction(()=>typeof window.world==='function'&&!!window.world(),null,{timeout:120000});
  const run=code=>page.evaluate(code);const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const shot=async name=>{await wait(200);await page.screenshot({path:path.join(out,name)});console.log('capture',name);};
  try{await scenario({page,run,wait,shot,logs});}catch(e){console.log('ERREUR scénario',e&&e.stack||e);}
  console.log('console de la page :',logs.filter(l=>/error|erreur|uncaught|failed/i.test(l)).slice(0,10).join(' | ')||'aucune erreur');await browser.close();};
