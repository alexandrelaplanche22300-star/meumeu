// Le module infrarouge (NIR) du Meumeu : lampe, batterie, tube, largeur du faisceau, filtre. La technologie est du côté des Meumeu.
// V11 : « voir beaucoup plus loin suivant les réglages » et « garde la batterie mais rends-la beaucoup plus durable » (dix fois plus).
// Critères V11 fixés d'avance :
//   1. réglages par défaut : batterie de 30 à 60 h d'utilisation (ancien réglage : 4,4 h), pack dans le dos (> 0), faisceau 43°, filtre, portée de 40 à 60 cases
//   2. faisceau étroit (15°) : portée plus grande ; large (60°) : plus petite
//   3. la puissance compte : 150 W porte au moins 1,8 fois plus loin que 35 W (à faisceau égal, sous le plafond de 140 cases)
//   4. le meilleur réglage (150 W, tube 1,6, faisceau 12°) atteint au moins 120 cases (480 m) et jamais plus de 140
//   5. sans filtre : lueur visible (leak) et lampe plus légère
//   6. le réglage traverse l'atelier (kit → arme → dérivé)
//   7. dans le jeu : la lampe ne voit qu'à l'intérieur de son faisceau (10° hors axe : oui pour 43° et 60°, non pour 15°)
//   8. sans filtre, l'opérateur est plus visible la nuit
//   9. de nuit, avec le réglage par défaut, un ennemi à 40 cases dans l'axe est vu (sans infrarouge : 10 cases) ; la batterie se vide, mais
//      une nuit entière (12 h de jeu) en garde plus de la moitié
// Historique : V10.5 : autonomie 4,4 h et portée 18,9 cases ; V11 (première version) : batterie retirée — l'utilisateur a demandé de la garder, dix fois plus durable.
//   node test/nir.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {irOf}=await import('../js/ballistics.js');const {World}=await import('../js/world.js');
const line=(l,ok,d)=>{console.log(`${ok?'PASS':'FAIL'}  ${l}${d?'  ['+d+']':''}`);if(!ok)process.exitCode=1;};
const d=irOf({}),n=irOf({irBeam:15}),w=irOf({irBeam:60}),nf=irOf({irFilt:0});
const strong=irOf({irW:150}),best=irOf({irW:150,irQ:1.6,irBeam:12});
line('1. batterie de 30 à 60 h, portée par défaut de 40 à 60 cases',d.hours>=30&&d.hours<=60&&d.packKg>0&&d.beam===43&&d.filt===1&&d.range>=40&&d.range<=60,`portée ${d.range} cases (${Math.round(d.range*4)} m), batterie ${d.hours} h (ancien réglage : 4,4 h), pack ${d.packKg} kg, faisceau ${d.beam}°`);
line('2. faisceau étroit porte plus loin, large moins loin',n.range>d.range&&w.range<d.range,`15° : ${n.range} · 43° : ${d.range} · 60° : ${w.range}`);
line('3. la puissance compte : 150 W ≥ 1,8 × 35 W',strong.range>=d.range*1.8,`150 W : ${strong.range} · 35 W : ${d.range}`);
line('4. le meilleur réglage : de 120 à 140 cases',best.range>=120&&best.range<=140,`${best.range} cases (${Math.round(best.range*4)} m)`);
line('5. sans filtre : lueur visible et lampe plus légère',nf.leak===true&&d.leak===false&&nf.lampKg<d.lampKg,`masse ${nf.lampKg} contre ${d.lampKg} kg`);
// 5. l'atelier
const W=new World(5);for(let h=0;h<6;h++)W.update(1);W.s.solar=.5;
const base=W.s.designs.mle1;
const mk=(id,extra)=>{W.s.designs[id]={...base,id,name:id,base:false,p:{...base.p,mods:['infrarouge'],...extra}};return W.W(id);};
const A=mk('ir_etroit',{irBeam:15}),Bd=mk('ir_large',{irBeam:60}),Cc=mk('ir_imp',{irFilt:0});
line('6. le réglage traverse l’atelier (kit → arme → dérivé)',A.ir?.beam===15&&Bd.ir?.beam===60&&Cc.ir?.leak===true,`étroit ${A.ir?.beam}° portée ${A.ir?.range} · large ${Bd.ir?.beam}° portée ${Bd.ir?.range} · impulsion sans filtre : mode ${Cc.ir?.mode}, leak ${Cc.ir?.leak}`);
// 6. le cône
const vis=(wid,offDeg)=>{const o=W.addUnit('meumeu','soldat',100,100);o.w=wid;o.nvOn=true;o.irLeft=5;o.fx=1;o.fy=0;o.post='debout';
  const ir=W.W(wid).ir;const dist=ir.range*.7*(1+.2*Math.log2(W.W(wid).optic?.mag||1));const a=offDeg*Math.PI/180;
  const r=W.visualRange(o,100+Math.cos(a)*dist,100+Math.sin(a)*dist,1);W.s.units=W.s.units.filter(u=>u!==o);return {seen:r>=dist,r,dist};};
const v15=vis('ir_etroit',10),v60=vis('ir_large',10),v15c=vis('ir_etroit',0);mk('ir_def',{});const v43=vis('ir_def',10);
line('7. la lampe ne voit qu’à l’intérieur de son faisceau',!v15.seen&&v60.seen&&v43.seen&&v15c.seen,`à 10° hors axe : 15° ${v15.seen?'vu':'non vu'} · 43° ${v43.seen?'vu':'non vu'} · 60° ${v60.seen?'vu':'non vu'} ; dans l’axe (15°) ${v15c.seen?'vu':'non vu'}`);
// 7. la signature
const sig=(wid)=>{const o=W.addUnit('meumeu','soldat',100,100);o.w=wid;o.nvOn=true;o.irLeft=5;o.post='debout';const s=W.sigOf(o);W.s.units=W.s.units.filter(u=>u!==o);return s;};
const sF=sig('ir_def'),sL=sig('ir_imp');
line('8. sans filtre, l’opérateur est plus visible la nuit',sL>sF,`signature ${typeof sF==='number'?sF.toFixed(2):JSON.stringify(sF)} avec filtre · ${typeof sL==='number'?sL.toFixed(2):JSON.stringify(sL)} sans filtre`);
// 9. la nuit, avec le réglage par défaut
{const W2=new World(6);for(let h=0;h<6;h++)W2.update(1);W2.light=()=>0;
  const base2=W2.s.designs.mle1;W2.s.designs.ir_std={...base2,id:'ir_std',name:'ir_std',base:false,p:{...base2.p,mods:['infrarouge']}};
  const o=W2.addUnit('meumeu','soldat',100,100);o.w='ir_std';o.fx=1;o.fy=0;o.post='debout';o.nvOn=true;o.irLeft=irOf({}).hours;o.irMax=irOf({}).hours;
  const r40=W2.visualRange(o,140,100,1);o.nvOn=false;const r0=W2.visualRange(o,140,100,1);
  o.nvOn=true;const left0=o.irLeft;for(let h=0;h<12;h++)W2.update(1);
  line('9. de nuit, un ennemi à 40 cases dans l’axe est vu avec l’infrarouge ; la batterie se vide mais une nuit entière en garde plus de la moitié',r40>=40&&r0<20&&(o.irLeft??0)<left0&&(o.irLeft??0)>=left0*.5,`portée avec ${r40.toFixed(0)} cases · sans ${r0.toFixed(0)} cases · batterie ${left0} → ${(o.irLeft??0).toFixed(1)} après 12 h de nuit`);}
