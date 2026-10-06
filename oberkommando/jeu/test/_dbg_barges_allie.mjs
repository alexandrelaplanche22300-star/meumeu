// pourquoi l'allié (allyAll) ne lance-t-il pas de barges ? — node test/_dbg_barges_allie.mjs <sauvegarde>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const s=W.s,A=s.ally;
const cities=W.allyCities();console.log('jour',W.day,'mode',W.G.mode,'all',A.all,'villes',cities.map(c=>[c.b.i,c.b.j,c.C?.main,W.G.dcoast[(c.b.j+2)*W.N+c.b.i+2]]));
console.log('coastCity',!!W.allyCoastCity(),'caserne alliée finie',s.buildings.some(b=>b.ally&&b.k==='caserne'&&b.done),'casernes meumeu',s.buildings.filter(b=>b.k==='caserne').map(b=>[b.ally,b.done,b.f]));
console.log('chantiers barge',s.buildings.filter(b=>b.k==='barge').map(b=>[b.ally,b.done,b.ruin,b.progress])),console.log('barges',s.vehicles.filter(v=>v.k==='barge').map(v=>[v.ally,v.f,v.hp]));
console.log('bargeT',A.bargeT,'t',s.t,'navalNext',A.navalNext);
const c=W.allyCoastCity();if(c){console.log('site',W.allyBeachSite(c.b.i+2,c.b.j+2),'brut',W.allyBeachSite(c.b.i+2,c.b.j+2,true));}
const meu=s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin);console.log('bât. meumeu',meu.length,'dont allié',meu.filter(b=>b.ally).length,'centres',meu.filter(b=>b.k==='centre').map(b=>[b.i,b.j,b.ally]));
console.log('unités meumeu',s.units.filter(u=>u.f==='meumeu').length,'dont alliées',s.units.filter(u=>u.f==='meumeu'&&u.ally).length);
const us=W.allyUnits();const main=cities.find(c=>c.C.main)||cities[0];const st=W.have('meumeu',main.b.i+2,main.b.j+2,60);
console.log('expandT',A.expandT,'expandAt',A.expandAt,'expandTry',A.expandTry,'villageois',us.filter(u=>u.k==='villageois'&&!u.inBarracks).length,'stock',JSON.stringify(st).slice(0,300));
console.log('centre en chantier',s.buildings.filter(b=>b.ally&&b.k==='centre'&&!b.done&&!b.ruin).map(b=>[b.i,b.j,b.progress]));
// les sites côtiers candidats
const [x0,y0,x1,y1]=W.bounds;let n=0,nz=0,nd=0;for(let j=y0+20;j<y1-20;j+=8)for(let i=x0+20;i<x1-20;i+=8){const dk=W.G.dcoast[j*W.N+i];if(dk<25||dk>60)continue;n++;if(!W.allyZone(i,j)||!W.allyZone(i+4,j+4))continue;nz++;const dm=Math.min(...cities.map(c=>Math.hypot(i-c.b.i,j-c.b.j)));if(dm>=50&&dm<=130)nd++;}
console.log('sites côtiers',n,'dans la zone alliée',nz,'à 50-130 cases',nd,'bounds',W.bounds,'N',W.N);
{const [x,y]=A.expandAt||[0,0];console.log('camps près du site',s.buildings.filter(b=>b.k==='camp'&&Math.hypot(b.i-x,b.j-y)<40).map(b=>[b.i,b.j,b.f,b.ally,b.done,b.progress,b.ruin]),'dépôts à 30',W.depots('meumeu',x,y,30).length);
 console.log('zone au site',W.allyZone(x,y),'dcoast',W.G.dcoast[y*W.N+x],'landComp',W.landComp()[y*W.N+x],'A.land',A.land);
 let ok=0,why={};for(let j=y-14;j<=y+14;j++)for(let i=x-14;i<=x+14;i++){const r=W.canPlace('meumeu','camp',i,j);if(r.ok)ok++;else why[r.why||r.reason||'?']=(why[r.why||r.reason||'?']||0)+1;}console.log('emplacements camp valides',ok,JSON.stringify(why).slice(0,300));
 const nC=s.buildings.filter(b=>b.ally&&b.k==='camp');console.log('camps alliés',nC.length,nC.filter(b=>!b.done).map(b=>[b.i,b.j,b.progress,Object.keys(b.paid||{}).length]));}
