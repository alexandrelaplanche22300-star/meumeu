// Oberkommando der Meumeu — l'application. Electron embarque son propre moteur (Chromium) : ni navigateur, ni Edge, ni
// WebView2 à avoir sur le PC. Le jeu est servi de l'intérieur par un protocole à lui (app://jeu/), ce qui permet ses modules
// et ses fichiers ; les sauvegardes restent dans %APPDATA%\Oberkommando der Meumeu.
const {app,BrowserWindow,Menu,protocol,net,shell}=require('electron');
const path=require('path');
const {pathToFileURL}=require('url');

const ROOT=app.isPackaged?path.join(process.resourcesPath,'jeu'):path.join(__dirname,'..','jeu');
// une carte graphique refusée par Chromium (vieux pilote) : la 3D passe en logiciel au lieu de s'éteindre
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);

// une seule fenêtre : relancer l'exe ramène celle qui est ouverte
if(!app.requestSingleInstanceLock())app.quit();
let win=null;
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});

app.whenReady().then(()=>{
  protocol.handle('app',req=>{let p=decodeURIComponent(new URL(req.url).pathname);if(p===''||p==='/')p='/index.html';
    const file=path.normalize(path.join(ROOT,p));if(!file.startsWith(ROOT))return new Response('interdit',{status:403});
    return net.fetch(pathToFileURL(file).toString());});
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({title:'Oberkommando der Meumeu',width:1600,height:900,minWidth:1024,minHeight:680,show:false,backgroundColor:'#0d2233',
    icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{contextIsolation:true,sandbox:true,spellcheck:false,backgroundThrottling:false}});
  win.maximize();win.once('ready-to-show',()=>win.show());
  win.loadURL('app://jeu/index.html');
  // pas de zoom de navigateur (la molette zoome la carte) ; F11 : plein écran
  win.webContents.setVisualZoomLevelLimits(1,1);
  win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;
    if(i.key==='F11'){win.setFullScreen(!win.isFullScreen());e.preventDefault();}
    if(i.control&&['+','-','=','0'].includes(i.key))e.preventDefault();});
  // un lien vers l'extérieur s'ouvre dans le navigateur du système, jamais dans le jeu
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('app://'))e.preventDefault();});
  // en fermant : la partie est sauvée (la sauvegarde automatique, reprise au prochain lancement)
  let saved=false;
  win.on('close',e=>{if(saved)return;e.preventDefault();
    win.webContents.executeJavaScript("try{localStorage.setItem('okm-auto',window.world().save())}catch(e){}",true).catch(()=>{}).finally(()=>{saved=true;win.close();});});
  win.on('closed',()=>{win=null;});
});
app.on('window-all-closed',()=>app.quit());
