// Les viseurs : jusqu'où un tireur arrêté repère un Bèè debout (devant lui), de jour et de nuit, avec une hausse, une lunette ×4,
// une lunette ×8 à grand ou à petit objectif, un viseur infrarouge éteint ou allumé ; sa portée de tir ; ses chances de toucher.
//   node test/optique.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {TILE_M}=await import('../js/ballistics.js');
const W=new World(41);for(let h=0;h<24;h++)W.update(1);const cap=W.capital();const x0=cap.i+30,y0=cap.j+4;const base=W.s.designs.mle1;
const mk=(id,p)=>{W.s.designs[id]={...base,id,name:id,p:{...base.p,...p},status:'adopte'};};
mk('lun4',{mods:['lunette'],sightMag:4,sightObj:16});mk('lun8g',{mods:['lunette'],sightMag:8,sightObj:24});mk('lun8p',{mods:['lunette'],sightMag:8,sightObj:12});mk('ir',{mods:['infrarouge']});
const cases=[['hausse','mle1',false],['lunette ×4 (16 mm)','lun4',false],['lunette ×8 (24 mm)','lun8g',false],['lunette ×8 (12 mm)','lun8p',false],['infrarouge éteint','ir',false],['infrarouge allumé','ir',true]];
function seen(wid,nv,hour){W.s.t=Math.floor(W.s.t/24)*24+hour;W.s.beee.alerts=[];const o=W.addUnit('meumeu','soldat',x0,y0);o.w=wid;o.fx=1;o.fy=0;o.moved=-99;o.task={kind:'guard',tx:x0,ty:y0};o.nvOn=nv;o.irMax=8;o.irLeft=8;
  let best=0;for(let d=2;d<=140;d+=2){const e=W.addUnit('beee','soldat',x0+d,y0);e.w='bee_fusil';e.post='debout';e.anim='walk';e.det={};let ok=false;for(let k=0;k<60&&!ok;k++){W.detT=1;W.detectTick(0);ok=W.spotted(e,'meumeu');}
    W.s.units.splice(W.s.units.indexOf(e),1);W.uIndex.delete(e.id);if(ok)best=d;else if(d>best+6)break;}
  const er=W.engageRange(o);W.s.units.splice(W.s.units.indexOf(o),1);W.uIndex.delete(o.id);return [best,er];}
function hitP(wid,nv,hour,d){W.s.t=Math.floor(W.s.t/24)*24+hour;const o=W.addUnit('meumeu','soldat',x0,y0);o.w=wid;o.post='couche';o.moved=-99;o.nvOn=nv;o.irMax=8;o.irLeft=8;const e=W.addUnit('beee','soldat',x0+d,y0);e.post='debout';e.fx=-1;e.fy=0;
  let n=0;const N=600;const Wd=W.W(wid);for(let k=0;k<N;k++)if(W.resolve(o,e,Wd,d*TILE_M,0).hit)n++;for(const u of [o,e]){W.s.units.splice(W.s.units.indexOf(u),1);W.uIndex.delete(u.id);}return Math.round(n/N*100);}
console.log('                          repéré jusqu’à (cases)   portée de tir     touche (couché, cible debout) à 20 / 40 / 70 cases');
for(const [name,wid,nv] of cases){const [dD,eD]=seen(wid,nv,12),[dN]=seen(wid,nv,1);
  console.log(`${name.padEnd(24)}  jour ${String(dD).padStart(3)} · nuit ${String(dN).padStart(3)}      ${eD.toFixed(0).padStart(3)} cases        jour ${[20,40,70].map(d=>hitP(wid,nv,12,d)+' %').join(' / ')} · nuit ${[20,40].map(d=>hitP(wid,nv,1,d)+' %').join(' / ')}`);}
const O=W.W('lun8g').optic,O2=W.W('lun8p').optic;console.log(`optique ×8 24 mm : pupille ${O.ep} mm, gain jour ×${O.day}, nuit ×${O.night} · ×8 12 mm : pupille ${O2.ep} mm, nuit ×${O2.night}`);
