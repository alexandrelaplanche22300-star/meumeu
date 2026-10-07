// Emballage reproductible du projet sans dépendance d'exécution npm.
// Electron, ses modules intégrés et jeu/ contiennent toute l'application.
const fs=require('node:fs');
const path=require('node:path');
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'),'utf8'));
if(Object.keys(pkg.dependencies||{}).length||Object.keys(pkg.optionalDependencies||{}).length)throw Error('Dépendances d’exécution ajoutées : utiliser un gestionnaire de paquets avant d’emballer.');
const {NpmNodeModulesCollector}=require('app-builder-lib/out/node-module-collector/npmNodeModulesCollector');
NpmNodeModulesCollector.prototype.getNodeModules=async function(){return {nodeModules:[],logSummary:this.cache.logSummary};};
require('electron-builder').build({projectDir:__dirname,targets:require('electron-builder').Platform.WINDOWS.createTarget('portable',require('electron-builder').Arch.x64),publish:'never',config:{electronDist:path.join(__dirname,'.runtime'),npmRebuild:false}}).catch(e=>{console.error(e);process.exitCode=1;});
