// Les barges en 3D, en plein jour, sur une carte fixe (graine 71) : la barge (LCVP) et la grande barge (LCT) chargées (soldats, véhicules, mitrailleur),
// rampe relevée puis baissée ; un chantier de grande barge sur la plage.
const {main}=require('./harness.cjs');const path=require('path');const fs=require('fs');const OUT=path.join(__dirname,'barges');fs.mkdirSync(OUT,{recursive:true});
main(async({win,run,wait})=>{const jpg=async n=>{await wait(400);fs.writeFileSync(path.join(OUT,`${n}.jpg`),(await win.webContents.capturePage()).toJPEG(90));console.log('capture',n);};
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));0;`);await wait(2500);
  const r=await run(`(async()=>{const {World}=await import('./js/world.js');const D=await import('./js/data.js');window.__load(new World(71,{map:'mer'}).serialize());
    const w=world(),s=w.s,N=w.N,ter=w.G.terrain,dc=w.G.dcoast;document.querySelector('.speeds [data-speed="0"]')?.click();await view.set3d(true);s.fog=false;s.solar=12;
    document.body.classList.add('nopanel');document.querySelector('#buildbar').style.visibility='hidden';dispatchEvent(new Event('resize'));
    let west=null;for(let dj=0;dj<200&&!west;dj++)for(const sg of [1,-1]){const j=750+dj*sg;for(let i=560;i<760;i++){const k=j*N+i;if(ter[k]===D.T.sand&&dc[k]>=2&&dc[k]<=4&&w.occ[k]<0){west=[i,j];break;}}if(west)break;}
    w.addBuilding('meumeu','camp',west[0]-8,west[1]+4,true);
    const site=(k,dy,lx)=>{for(let dj=-30;dj<=30;dj+=2)for(let di=-10;di<=4;di++){const i=west[0]+di-lx,j=west[1]+dj+dy;if(w.canPlace('meumeu',k,i,j).ok)return w.place('meumeu',k,i,j).b;}return null;};
    const g=w.launchBoat(site('grande_barge',-10,3));const b=w.launchBoat(site('barge',8,2));const c=site('grande_barge',26,3);if(c)c.progress=.55;
    for(const v of [g,b]){v.ramp=0;v.rampTo=0;const [lx,ly]=w.nearestLand(v.x,v.y,8);const n=v.k==='grande_barge'?30:18;for(let k=0;k<n;k++){const u=w.addUnit('meumeu',k?'soldat':'villageois',lx,ly,{rounds:30});w.vehBoard(v,u);}}
    const load=(v,k)=>{v.ramp=1;const [x,y]=w.nearestLand(v.x-Math.cos(v.h)*(v.k==='grande_barge'?4.5:3),v.y-Math.sin(v.h)*(v.k==='grande_barge'?4.5:3),8);const cv=w.addCombatVehicle('meumeu',k,x,y,v.h);const e=w.boatEmbark(v,cv);v.ramp=0;return e.ok||e.why[0];};
    const ok=[load(g,'char'),load(g,'char'),load(b,'jeep')];window.ui.speed=1;for(let i=0;i<40;i++)window.__step(1,1/30);window.ui.speed=0;s.solar=12;
    window.__B={g:[g.x,g.y,g.h],b:[b.x,b.y,b.h],c:c?[c.i+3.5,c.j+1.5,0]:null};return 'chargés '+ok.join(', ')+' · équipages '+g.crew.length+' / '+b.crew.length+' · chantier '+!!c;})()`);console.log(r);
  const look=async(k,z,yaw,elev,dx=0)=>{const r=await run(`(()=>{const P=window.__B.${k};if(!P)return 'absent';view.lookAt(P[0]+Math.cos(P[2])*${dx},P[1]+Math.sin(P[2])*${dx});view.zoom=${z};view.yaw=${yaw};view.elev=${elev};world().s.solar=12;view.draw(.01);return 'ok';})()`);if(r!=='ok')console.log('vue',k,r);};
  await look('g',2.6,.55,.5);await wait(1500);await jpg('1_grande_barge');
  await look('g',3.4,-.9,.42,-1.5);await wait(1500);await jpg('2_grande_barge_arriere');
  await look('b',4.2,.5,.5);await wait(1500);await jpg('3_barge');
  await look('b',4.6,-1.2,.38);await wait(1500);await jpg('4_barge_arriere');
  await run(`(()=>{for(const v of world().s.vehicles)if(v.k==='barge'||v.k==='grande_barge')v.ramp=1;window.ui.speed=1;for(let i=0;i<5;i++)window.__step(1,1/30);window.ui.speed=0;for(const v of world().s.vehicles)if(v.k==='barge'||v.k==='grande_barge')v.ramp=1;})();0;`);
  await look('g',2.6,.55,.5);await wait(1500);await jpg('5_grande_barge_rampe');
  await look('b',4.2,.5,.5);await wait(1500);await jpg('6_barge_rampe');
  await look('c',2.2,.4,.55);await wait(1500);await jpg('7_chantier');
  console.log('erreurs',await run(`JSON.stringify(window.__e.slice(0,3))`));
},{w:1500,h:850,out:OUT});
