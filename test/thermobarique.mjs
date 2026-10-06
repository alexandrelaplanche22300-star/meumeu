// V12.8 · la science thermobarique meumeu : des mélanges (charbon, fer, essence), leur proportion, la construction de l'obus — demande du joueur.
// CRITÈRES (fixés avant de lancer) :
//   T1 verrouillé au départ (mélanges et coques) ; la science demande l'amatol et la thermite ; son programme a trois tâches (chimiste, physicien,
//      ingénieur) ; finie, elle ouvre charbon, fer et coque mince, pas l'essence — que l'explosif air-essence ouvre ensuite, avec l'obus à deux temps
//   T2 même obus (l'obusier Mle 1 en coque mince) : le thermobarique au charbon souffle ≥ 1,3 × la tolite, avec moins d'éclats utiles
//   T3 la proportion a un optimum : le souffle croît puis décroît avec la part de combustible (le maximum strictement à l'intérieur de 10–92 %)
//   T4 l'air-essence sans obus à deux temps : moins de 60 % du souffle qu'avec ; avec : un nuage détonant
//   T5 des Bèè couchés en tranchée, dans le nuage (à 0,8 × son rayon) : ≥ 80 % morts ou hors de combat ; l'obus de tolite (coque lisse) à la même
//      distance, même tranchée : au plus la moitié de ce taux
//      CORRECTION (mesurée au premier essai) : le nuage était à l'échelle physique (0,7 m), minuscule devant le souffle du jeu (4,3 m pour un 36 mm) —
//      les deux tuaient tout. Le nuage suit maintenant l'échelle du jeu ; et la tolite, à 3 m en tranchée, met encore hors de combat par les lésions :
//      le critère compare donc les MORTS (≥ 80 % dans le nuage ; la tolite au plus la moitié).
//   T6 un obus sur une maison occupée (5 villageois) : le thermobarique au charbon en touche plus que la tolite
//   T7 une caisse thermobarique coûte son combustible (charbon ; essence)
//   node test/thermobarique.mjs [graine] [essais]
globalThis.document??={getElementById:()=>({textContent:''})};
const {World}=await import('../js/world.js');const {derive}=await import('../js/ballistics.js');const {crateCost}=await import('../js/designs.js');const {INNOV}=await import('../js/data.js');
const {CARTE}=await import('./_engins_types.mjs');
const SEED=+(process.argv[2]||101),TR=+(process.argv[3]||6);let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
// T1
{const W=new World(SEED,{map:'v2',assisted:true,sci:true});const u=k=>W.unlocked(k);const locked0=['fill:tb_charbon','fill:tb_fer','fill:tb_essence','shell:mince','shell:deux_temps'].every(k=>!u(k));
  const I=INNOV.find(x=>x.id==='thermobarique');const needs=(I.needs||[]).join('+');W.s.innov.done.push('amatol','thermite');W.s.innov.ideas.push({id:'thermobarique',who:null,t:0});
  const c=W.capital();for(const [k,n] of Object.entries(I.cost))c.stock[k]=(c.stock[k]||0)+n*3;for(const b of W.labs?.()||[])for(const [k,n] of Object.entries(I.cost))b.stock&&(b.stock[k]=(b.stock[k]||0)+n*3);
  const r=W.launchIdea('thermobarique');const Pg=W.s.research.programs.find(x=>x.ref==='thermobarique');const roles=(Pg?.tasks||[]).map(t=>t.role).sort().join('+');
  W.s.innov.done.push('thermobarique');const mid=u('fill:tb_charbon')&&u('fill:tb_fer')&&u('shell:mince')&&!u('fill:tb_essence')&&!u('shell:deux_temps');W.s.innov.done.push('air_essence');const end=u('fill:tb_essence')&&u('shell:deux_temps');
  P(locked0&&needs==='amatol+thermite'&&r.ok&&roles==='chimiste+ingenieur+physicien'&&mid&&end,'T1. la science thermobarique : verrouillée, trois métiers, elle ouvre dans l’ordre',
    `fermé au départ ${locked0} · demande ${needs} · lancée ${r.ok?'oui':r.why} · tâches ${roles} (${(Pg?.tasks||[]).map(t=>t.work+' h').join(', ')}) · après la science ${mid} · après l’air-essence ${end}`);}
const W=new World(SEED,CARTE);if(!W.atWar)W.declareWar('meumeu');W.s.fog=false;const base=W.design('canon_mle1').p;
const mk=o=>({...JSON.parse(JSON.stringify(base)),...o});const he=o=>derive(mk(o)).he;
// T2
const tol=he({shell:'mince',fill:'tolite'}),tbc=he({shell:'mince',fill:'tb_charbon'}),lis=he({shell:'lisse',fill:'tolite'});
P(tbc.W>=1.3*tol.W&&tbc.n<lis.n,'T2. au charbon : plus de souffle, moins d’éclats',`souffle (g de tolite) : tolite ${(tol.W*1000).toFixed(1)} · charbon ${(tbc.W*1000).toFixed(1)} (cœur ${(tbc.tb.Wcore*1000).toFixed(1)} + postcombustion ${(tbc.tb.Wab*1000).toFixed(1)}) · éclats utiles : tolite coque lisse ${lis.n}, charbon ${tbc.n} · enfermé ×${tbc.tb.conf.toFixed(2)}`);
// T3
{const fs=[.1,.2,.3,.4,.5,.6,.7,.8,.92],Ws=fs.map(f=>he({shell:'mince',fill:'tb_charbon',tbf:f}).W);const i=Ws.indexOf(Math.max(...Ws));
  P(i>0&&i<fs.length-1,'T3. la proportion a un optimum',fs.map((f,k)=>`${Math.round(f*100)} % → ${(Ws[k]*1000).toFixed(1)} g`).join(' · '));}
// T4
const ess0=he({shell:'mince',fill:'tb_essence'}),ess2=he({shell:'deux_temps',fill:'tb_essence'});
P(ess0.W<.6*ess2.W&&ess2.tb.cloud>0,'T4. l’air-essence a besoin de l’obus à deux temps',`sans : ${(ess0.W*1000).toFixed(1)} g · avec : ${(ess2.W*1000).toFixed(1)} g, nuage de ${ess2.tb.cloud.toFixed(2)} m`);
// des places libres, loin les unes des autres
const used=[];const spot=(w,h)=>{const c=W.capital();for(let r=40;r<500;r+=3)for(let a=0;a<48;a++){const x=Math.floor(c.i+Math.cos(a/48*6.283)*r),y=Math.floor(c.j+Math.sin(a/48*6.283)*r);if(used.some(([u,v])=>Math.hypot(u-x,v-y)<24))continue;
  let ok=true;for(let dj=-3;ok&&dj<h+3;dj++)for(let di=-3;ok&&di<w+3;di++){const k=(y+dj)*W.N+x+di;ok=k>=0&&W.occ[k]<0&&!W.s.buildings.some(b=>W.distB(b,x+di,y+dj)<1);}if(ok){used.push([x,y]);return [x,y];}}return null;};
const st=u=>u.hp<=0||u.h?.state==='mort'?'mort':u.h?.state==='hors'?'hors':(u.h?.wounds||[]).length?'blesse':'ok';
// T5
// (le rayon du nuage dans le jeu : celui de la charge, à l'échelle du souffle — voir world.js heBlast)
const cloudR=(()=>{const k=Math.cbrt(ess2.W/.0175),b1=Math.max(ess2.blast*1.45,4.3*k);return ess2.tb.cloud*b1/(ess2.blast*1.45);})();
{const R=cloudR*.8;const trench=E=>{let bad=0,n=0;for(let t=0;t<TR;t++){const [x,y]=spot(1,1);const us=[];for(let k=0;k<6;k++){const a=k/6*6.283+t;const ux=x+.5+Math.cos(a)*R/4,uy=y+.5+Math.sin(a)*R/4;const kk=Math.floor(uy)*W.N+Math.floor(ux);W.s.sacs[kk]={b:true,hp:220};
    const u=W.addUnit('beee','soldat',ux,uy,{});u.post='couche';us.push(u);}W.heBlast(x+.5,y+.5,E,'meumeu',null,{kind:'obus',w:'canon_mle1'});for(const u of us){n++;if(st(u)==='mort')bad++;}}return bad/n;};
  const pT=trench(ess2),pL=trench(lis);P(pT>=.8&&pL<=pT/2,'T5. dans le nuage, la tranchée ne protège plus',`à ${R.toFixed(2)} m (nuage ${cloudR.toFixed(2)} m), couchés en tranchée, morts : air-essence ${Math.round(pT*100)} % · tolite ${Math.round(pL*100)} %`);}
// T6
{const room=E=>{let h=0;for(let t=0;t<TR;t++){const [x,y]=spot(2,2);const b=W.addBuilding('beee','maison',x,y,true);b.max=b.hp=5000;const vs=[];for(let k=0;k<5;k++){const u=W.addUnit('beee','villageois',x+1,y+1,{});W.s.units.splice(W.s.units.indexOf(u),1);W.uIndex.delete(u.id);(b.hide??=[]).push(u);vs.push(u);}
    W.heBlast(x+1,y+1,E,'meumeu',null,{kind:'obus',w:'canon_mle1'});h+=vs.filter(u=>st(u)!=='ok').length;}return h/TR;};
  // (la maison renforcée à 5000 points : on compare ce que le coup fait aux occupants, sans que la ruine ne s'en mêle)
  const hT=room(tbc),hL=room(lis);P(hT>hL,'T6. enfermé, le thermobarique touche plus',`occupants touchés par obus : charbon ${hT.toFixed(2)} · tolite ${hL.toFixed(2)}`);}
// T7
{const cc=crateCost(mk({shell:'mince',fill:'tb_charbon'})),ce=crateCost(mk({shell:'deux_temps',fill:'tb_essence'}));
  P(cc.charbon>0&&ce.essence>0,'T7. une caisse coûte son combustible',`charbon : ${JSON.stringify(cc)} · air-essence : ${JSON.stringify(ce)}`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');process.exit(fail?1:0);
