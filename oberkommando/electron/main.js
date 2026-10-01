// Oberkommando der Meumeu — l'application. Electron embarque son propre moteur (Chromium) : ni navigateur, ni Edge, ni
// WebView2 à avoir sur le PC. Le jeu est servi de l'intérieur par un protocole à lui (app://jeu/), ce qui permet ses modules
// et ses fichiers ; chaque version garde son dossier de sauvegarde indépendant.
const {app,BrowserWindow,Menu,protocol,net,shell,screen}=require('electron');
const path=require('path');
const fs=require('fs');
const {pathToFileURL}=require('url');

const ROOT=app.isPackaged?path.join(process.resourcesPath,'jeu'):path.join(__dirname,'..','jeu');
// Chaque version a son propre dossier : une ancienne restée ouverte (ou figée) ne bloque pas son lancement (le verrou « une
// seule fenêtre » est celui du dossier). Au premier lancement, la sauvegarde la plus récente disponible est reprise.
const APPDATA=app.getPath('appData'),DATA=path.join(APPDATA,'Oberkommando der Meumeu V10.3');
try{const mine=path.join(DATA,'Local Storage');const old=['V10.2','V10.1','V10','V9','V8','V7'].map(v=>path.join(APPDATA,'Oberkommando der Meumeu '+v,'Local Storage')).find(p=>fs.existsSync(p));
  if(!fs.existsSync(mine)&&old){fs.mkdirSync(DATA,{recursive:true});fs.cpSync(old,mine,{recursive:true});}}catch(e){}
app.setPath('userData',DATA);
// une carte graphique refusée par Chromium (vieux pilote) : la 3D passe en logiciel au lieu de s'éteindre
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);

// le choix d'affichage (plein écran sans bordure, ou fenêtre), retenu d'un lancement à l'autre. Le jeu démarre en PLEIN ÉCRAN ; F11 ou
// Alt+Entrée bascule. (Nouveau fichier de préférence en V10.5 : un ancien choix « fenêtre » n'écrase pas ce départ en plein écran.)
const PREF=path.join(DATA,'affichage-v105.json');
const pref=(()=>{try{return JSON.parse(fs.readFileSync(PREF,'utf8'));}catch(e){return {fullscreen:true};}})();
const savePref=()=>{try{fs.mkdirSync(DATA,{recursive:true});fs.writeFileSync(PREF,JSON.stringify(pref));}catch(e){}};

// une seule fenêtre : relancer l'exe ramène celle qui est ouverte (et la montre, si elle ne l'était pas encore)
if(!app.requestSingleInstanceLock())app.quit();
let win=null;
app.on('second-instance',()=>{if(!win)return;if(!win.isVisible())win.show();if(win.isMinimized())win.restore();win.focus();});

app.whenReady().then(()=>{
  protocol.handle('app',req=>{let p=decodeURIComponent(new URL(req.url).pathname);if(p===''||p==='/')p='/index.html';
    const file=path.normalize(path.join(ROOT,p));if(!file.startsWith(ROOT))return new Response('interdit',{status:403});
    return net.fetch(pathToFileURL(file).toString());});
  Menu.setApplicationMenu(null);
  // la taille se règle sur l'écran réel, en points : un écran de 1920 pixels affiché à 225 % n'en fait que 854 ; une taille minimale
  // plus grande que lui rendait la fenêtre (même en plein écran) plus grande que l'écran, l'interface coupée à droite et en bas
  const wa=screen.getPrimaryDisplay().workAreaSize;
  win=new BrowserWindow({title:'Oberkommando der Meumeu V12.4',width:Math.min(1600,wa.width),height:Math.min(900,wa.height),minWidth:Math.min(1024,wa.width),minHeight:Math.min(680,wa.height),show:false,backgroundColor:'#1c1d14',
    icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,sandbox:true,spellcheck:false,backgroundThrottling:false}});
  // la fenêtre se montre dès que la page est prête — et au plus tard après trois secondes : une page qui tarde (ou un rendu
  // qui a planté) ne laisse plus le jeu tourner sans fenêtre, invisible
  let shown=false;const reveal=()=>{if(shown||!win)return;shown=true;win.show();if(pref.fullscreen)win.setFullScreen(true);else win.maximize();};
  win.once('ready-to-show',reveal);setTimeout(reveal,3000);
  win.loadURL('app://jeu/index.html');
  // le rendu de la page a planté (pilote graphique, mémoire) : on la recharge, la sauvegarde automatique reprend la partie
  win.webContents.on('render-process-gone',(e,d)=>{if(d.reason!=='clean-exit')setTimeout(()=>{if(win)win.reload();},600);});
  // pas de zoom au pincement (la molette zoome la carte). F11 ou Alt+Entrée : plein écran sans bordure ↔ fenêtre (retenu).
  // Ctrl + / Ctrl − / Ctrl 0 : c'est le jeu qui les prend (la taille de l'interface, comme ses boutons A+ / A−)
  win.webContents.setVisualZoomLevelLimits(1,1);
  win.webContents.on('before-input-event',(e,i)=>{if(i.type!=='keyDown')return;if(i.key==='F11'||i.key==='Enter'&&i.alt){const fs2=!win.isFullScreen();win.setFullScreen(fs2);if(!fs2)win.maximize();pref.fullscreen=fs2;savePref();e.preventDefault();}});
  // un lien vers l'extérieur s'ouvre dans le navigateur du système, jamais dans le jeu
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('app://'))e.preventDefault();});
  // en fermant : la partie est sauvée (la sauvegarde automatique, reprise au prochain lancement) — deux secondes au plus :
  // une page figée ne retient plus l'application ouverte sans fenêtre
  let saved=false;
  win.on('close',e=>{if(saved)return;e.preventDefault();
    Promise.race([win.webContents.executeJavaScript("try{localStorage.setItem('okm-auto',window.world().save())}catch(e){}",true),new Promise(r=>setTimeout(r,2000))]).catch(()=>{}).finally(()=>{saved=true;if(win)win.close();});});
  win.on('closed',()=>{win=null;});
});
app.on('window-all-closed',()=>app.quit());
