// Banc de captures : charge le vrai jeu (même protocole que l'exécutable) dans une fenêtre cachée de w × h, exécute un scénario, enregistre des PNG.
// Lancer SANS ELECTRON_RUN_AS_NODE :  electron.exe scene.cjs
const {app,BrowserWindow,protocol,net}=require('electron');const path=require('path');const fs=require('fs');const os=require('os');const {pathToFileURL}=require('url');
const ROOT=process.env.OKM_ROOT||'C:/Users/alexa/Downloads/oberkommando der meumeu OKM/oberkommando-v12.0/jeu';
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
exports.main=(scenario,{w=1600,h=900,out=__dirname})=>{
  app.setPath('userData',process.env.OKM_UDATA||path.join(os.tmpdir(),'okm-shot-'+Date.now()));
  app.whenReady().then(async()=>{
    protocol.handle('app',req=>{let p=decodeURIComponent(new URL(req.url).pathname);if(p===''||p==='/')p='/index.html';const file=path.normalize(path.join(ROOT,p));if(!file.startsWith(path.normalize(ROOT)))return new Response('interdit',{status:403});if(!fs.existsSync(file)){(global.__miss??=new Set()).add(p);return new Response('absent',{status:404});}return net.fetch(pathToFileURL(file).toString());});
    const win=new BrowserWindow({width:w,height:h,useContentSize:true,show:false,backgroundColor:'#1c1d14',webPreferences:{contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false,offscreen:true}});
    const logs=[];win.webContents.on('console-message',(...a)=>{const m=a.length>1&&typeof a[1]==='object'?a[1].message:a[2];logs.push(String(m));});
    win.webContents.on('render-process-gone',(e,d)=>console.log('RENDU PERDU',d.reason));
    win.webContents.setFrameRate(20);await win.loadURL(process.env.OKM_PAGE||'app://jeu/index.html');if(process.env.ZOOMF)win.webContents.setZoomFactor(+process.env.ZOOMF);win.webContents.startPainting();
    const run=code=>win.webContents.executeJavaScript(code,true);
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const shot=async name=>{await wait(150);const img=await win.webContents.capturePage();fs.writeFileSync(path.join(out,name),img.toPNG());console.log('capture',name,img.getSize().width+'×'+img.getSize().height);};
    try{await scenario({win,run,shot,wait,logs});}catch(e){console.log('ERREUR scénario',e&&e.stack||e);}
    console.log('console de la page :',logs.filter(l=>/error|erreur|uncaught|failed/i.test(l)).slice(0,10).join(' | ')||'aucune erreur');
    if(global.__miss)console.log('fichiers absents :',[...global.__miss].slice(0,20).join(' '));
    app.quit();});};

