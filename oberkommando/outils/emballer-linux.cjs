// Emballage depuis Linux (sans wine) — lancer depuis le dossier du projet : npm i electron-builder@26.15.3 resedit pe-library ; node outils/emballer-linux.cjs
// (le runtime Electron Windows dans .runtime/, comme pour build-v10.cjs). : même configuration que build-v10.cjs ; l'icône et les informations de version
// de l'exe sont posées par resedit (JS pur) au lieu de rcedit (qui exige wine).
const fs=require('node:fs'),path=require('node:path');
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
if(Object.keys(pkg.dependencies||{}).length)throw Error('Dépendances d’exécution ajoutées.');
const {NpmNodeModulesCollector}=require('app-builder-lib/out/node-module-collector/npmNodeModulesCollector');
NpmNodeModulesCollector.prototype.getNodeModules=async function(){return {nodeModules:[],logSummary:this.cache.logSummary};};
let ResEdit,PE;
const icoFromPng=png=>{const h=Buffer.alloc(22);h.writeUInt16LE(0,0);h.writeUInt16LE(1,2);h.writeUInt16LE(1,4);h[6]=0;h[7]=0;h[8]=0;h[9]=0;h.writeUInt16LE(1,10);h.writeUInt16LE(32,12);h.writeUInt32LE(png.length,14);h.writeUInt32LE(22,18);return Buffer.concat([h,png]);};
async function afterPack(ctx){
  const R=n=>require('url').pathToFileURL(require.resolve(n,{paths:[process.cwd(),path.join(__dirname,'..')]})).href;ResEdit=await import(R('resedit'));PE=await import(R('pe-library'));
  const exe=path.join(ctx.appOutDir,pkg.build.productName+'.exe');
  const data=fs.readFileSync(exe);const ex=PE.NtExecutable.from(data,{ignoreCert:true});const res=PE.NtExecutableResource.from(ex);
  const ico=ResEdit.Data.IconFile.from(icoFromPng(fs.readFileSync(path.join(__dirname,'..','electron','icon.png'))));
  const groups=ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);const gid=groups.length?groups[0].id:1,lang=groups.length?groups[0].lang:1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries,gid,lang,ico.icons.map(i=>i.data));
  const vi=ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];const [a,b,c]=pkg.version.split('.').map(Number);
  vi.setFileVersion(a,b,c,0,1033);vi.setProductVersion(a,b,c,0,1033);
  vi.setStringValues({lang:1033,codepage:1200},{FileDescription:pkg.build.productName,ProductName:pkg.build.productName,CompanyName:pkg.author,OriginalFilename:pkg.build.productName+'.exe',InternalName:pkg.build.productName,LegalCopyright:''});
  vi.outputToResourceEntries(res.entries);res.outputResource(ex);fs.writeFileSync(exe,Buffer.from(ex.generate()));
  console.log('  • icône et version posées sur',path.basename(exe));}
const eb=require('electron-builder');
eb.build({projectDir:path.join(__dirname,'..'),targets:eb.Platform.WINDOWS.createTarget('portable',eb.Arch.x64),publish:'never',
  config:{...pkg.build,electronDist:path.join(__dirname,'..','.runtime'),npmRebuild:false,afterPack,win:{...pkg.build.win,signAndEditExecutable:false}}}).catch(e=>{console.error(e);process.exitCode=1;});
