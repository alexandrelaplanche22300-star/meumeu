// Toutes les configurations de chargement des deux barges, côte à côte sur une plage (graine 71), en plein jour : soldats, véhicules (avec leur équipage),
// mitrailleurs et barreur. Une vue par barge, plus quelques gros plans (les mitrailleuses vers l'avant, l'équipage d'une jeep à bord).
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');const OUT=path.join(__dirname,'configs');fs.mkdirSync(OUT,{recursive:true});
const CONFIGS=[
  ['barge',[],24,'barge — 24 soldats'],['barge',['jeep'],12,'barge — une jeep (conducteur et trois passagers) et 12 soldats'],['barge',['jeep_mg'],12,'barge — une jeep à mitrailleuse (conducteur, mitrailleur, deux passagers) et 12 soldats'],
  ['barge',['automitrailleuse'],6,'barge — une automitrailleuse et 6 soldats'],
  ['grande_barge',[],40,'grande barge — 40 soldats'],['grande_barge',['char'],40,'grande barge — une automitrailleuse à canon et 40 soldats'],['grande_barge',['char','char'],40,'grande barge — deux automitrailleuses à canon et 40 soldats'],
  ['grande_barge',['char','automoteur'],40,'grande barge — une automitrailleuse à canon, un automoteur et 40 soldats'],['grande_barge',['automoteur','jeep_mg'],40,'grande barge — un automoteur, une jeep à mitrailleuse et 40 soldats'],
  ['grande_barge',['jeep','jeep','jeep'],40,'grande barge — trois jeeps et 40 soldats'],['grande_barge',['automitrailleuse','jeep','jeep_mg'],40,'grande barge — une automitrailleuse, une jeep, une jeep à mitrailleuse et 40 soldats']];
main(async({win,run,wait})=>{const jpg=async n=>{await wait(400);fs.writeFileSync(path.join(OUT,`${n}.jpg`),(await win.webContents.capturePage()).toJPEG(90));console.log('capture',n);};
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));0;`);await wait(2500);
  const r=await run(`(async()=>{const {World}=await import('./js/world.js');const D=await import('./js/data.js');const {VEHDEF}=await import('./js/vehicules.js');window.__load(new World(71,{map:'mer'}).serialize());
    const w=world(),s=w.s,N=w.N,ter=w.G.terrain,dc=w.G.dcoast;document.querySelector('.speeds [data-speed="0"]')?.click();await view.set3d(true);s.fog=false;s.solar=12;
    document.body.classList.add('nopanel');document.querySelector('#buildbar').style.visibility='hidden';dispatchEvent(new Event('resize'));
    let west=null;for(let dj=0;dj<200&&!west;dj++)for(const sg of [1,-1]){const j=750+dj*sg;for(let i=560;i<760;i++){const k=j*N+i;if(ter[k]===D.T.sand&&dc[k]>=2&&dc[k]<=4&&w.occ[k]<0){west=[i,j];break;}}if(west)break;}
    for(const dy of [-40,0,40])w.addBuilding('meumeu','camp',west[0]-9,west[1]+dy,true);
    const C=${JSON.stringify(CONFIGS)};const out=[];const B=[];
    for(const [k,vehs,pax,label] of C){let b=null;for(let dj=0;dj<=90&&!b;dj+=1)for(const sg of [1,-1]){for(let di=-10;di<=4&&!b;di++){const i=west[0]+di-3,j=west[1]+sg*dj-1;if(w.canPlace('meumeu',k,i,j).ok)b=w.launchBoat(w.place('meumeu',k,i,j).b);}if(b)break;}
      if(!b){out.push(label+' : pas de place');continue;}
      
      const got=[];for(const vk of vehs){b.ramp=1;const V=VEHDEF[b.k];const [x,y]=w.nearestLand(b.x-Math.cos(b.h)*(V.long/2+1.2),b.y-Math.sin(b.h)*(V.long/2+1.2),8);const cv=w.addCombatVehicle('meumeu',vk,x,y,b.h);
        const cd=VEHDEF[vk];const crew=1+(cd.places.servants||0)+(cd.places.passagers||0);for(let n=0;n<crew;n++)w.vehBoard(cv,w.addUnit('meumeu','soldat',x,y,{rounds:30}));const e=w.boatEmbark(b,cv);got.push(e.ok?vk:vk+' ✗ '+e.why[0]);}
      const [lx,ly]=w.nearestLand(b.x,b.y,8);for(let n=0;n<pax+3;n++)w.vehBoard(b,w.addUnit('meumeu',n?'soldat':'villageois',lx,ly,{rounds:30}));b.ramp=0;b.rampTo=0;B.push({label,x:b.x,y:b.y,h:b.h,k:b.k});out.push(label+' : '+got.join(', ')+' · équipage '+b.crew.length);}
    window.ui.speed=1;for(let i=0;i<40;i++)window.__step(1,1/30);window.ui.speed=0;s.solar=12;window.__B=B;return out.join('\\n');})()`);console.log(r);
  const n=await run(`window.__B.length`);
  for(let i=0;i<n;i++){const z=await run(`(()=>{const P=window.__B[${i}];view.lookAt(P.x,P.y);view.zoom=P.k==='grande_barge'?2.3:3.6;view.yaw=.62;view.elev=.62;world().s.solar=12;view.draw(.01);return P.label;})()`);await wait(1300);await jpg(String(i+1).padStart(2,'0')+'_'+z.replace(/[^a-z0-9]+/gi,'_').slice(0,60));}
  // gros plans : les mitrailleuses de poupe vers l'avant, vues de derrière ; l'équipage d'une jeep à bord
  await run(`(()=>{const P=window.__B[0];view.lookAt(P.x-Math.cos(P.h)*1.4,P.y-Math.sin(P.h)*1.4);view.zoom=6.5;view.yaw=2.4;view.elev=.45;view.draw(.01);})();0;`);await wait(1300);await jpg('20_gros_plan_mitrailleuses_barge');
  await run(`(()=>{const P=window.__B[4];view.lookAt(P.x-Math.cos(P.h)*2.6,P.y-Math.sin(P.h)*2.6);view.zoom=4.2;view.yaw=2.3;view.elev=.45;view.draw(.01);})();0;`);await wait(1300);await jpg('21_gros_plan_mitrailleuses_grande_barge');
  await run(`(()=>{const P=window.__B[1];view.lookAt(P.x+Math.cos(P.h)*.4,P.y+Math.sin(P.h)*.4);view.zoom=6.5;view.yaw=.3;view.elev=.6;view.draw(.01);})();0;`);await wait(1300);await jpg('22_gros_plan_jeep_a_bord');
  await run(`(()=>{const P=window.__B[7];view.lookAt(P.x-Math.cos(P.h)*.6,P.y-Math.sin(P.h)*.6);view.zoom=4.6;view.yaw=.25;view.elev=.55;view.draw(.01);})();0;`);await wait(1300);await jpg('23_gros_plan_automoteur_a_bord');
  await run(`(()=>{const P=window.__B[8];view.lookAt(P.x+Math.cos(P.h)*.8,P.y+Math.sin(P.h)*.8);view.zoom=4.6;view.yaw=-.9;view.elev=.42;view.draw(.01);})();0;`);await wait(1300);await jpg('24_automoteur_de_cote');
  console.log('erreurs',await run(`JSON.stringify(window.__e.slice(0,3))`));
},{w:1500,h:850,out:OUT});
