// Les attaches : un point de fixation ne porte qu'une pièce, et la physique compte exactement ce que le dessin montre.
// Avant : l'atelier complet laissait empiler frein + cache-flamme + silencieux (le dessin n'en montrait qu'un, la balistique multipliait les trois).
// CRITÈRES (fixés avant de lancer) :
//   A1 fitMods garde une seule pièce par attache, dans l'ordre du dessin (silencieux > frein > cache-flamme ; lunette > viseur à lichen ;
//      trépied > bipied) et ne touche à aucun module indépendant ; une liste sans conflit ressort identique
//   A2 toggleMod : le module choisi prend la place de l'ancien occupant de son attache, se retire d'un second clic, et laisse les autres modules
//   A3 la physique suit le dessin : une arme avec les trois dispositifs de bouche a le recul, l'éclair et le bruit d'un silencieux seul
//   A4 aucune conception du jeu (défauts, fiches du kit V6) n'est modifiée : mêmes modules avant et après normalisation
//   A5 le prototype enregistré ne garde pas de conflit ; le dessin (layout) mesure la même bouche que la physique compte
//   A6 chaque module de MODS sait dire son attache (ou aucune), et chaque attache ne nomme que des modules qui existent
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/attaches.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const B=await import('../js/ballistics.js');const {derive,MODS,PORTS,fitMods,toggleMod,portOf,portConflicts,kitToP}=B;
const {DEFAULT_DESIGNS}=await import('../js/designs.js');const {KIT_PRESETS}=await import('../js/kitdata.js');const {layout}=await import('../js/gunart.js');
const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const fusil=DEFAULT_DESIGNS.find(d=>d.id==='mle1').p;
// A1
{const a=fitMods(['frein','cacheflamme','manchon','poignee']);const b=fitMods(['reflex','lunette','bipied','trepied','baionnette']);const c=fitMods(['frein','poignee','lunette']);
  P(same(a,['manchon','poignee'])&&same(b,['lunette','trepied','baionnette'])&&same(c,['frein','poignee','lunette'])&&fitMods(undefined).length===0,'A1. une pièce par attache, dans l’ordre du dessin',`${a} | ${b} | ${c}`);}
// A2
{let m=toggleMod(['manchon','poignee'],'frein');const r1=same(m,['frein','poignee']);m=toggleMod(m,'frein');const r2=same(m,['poignee']);m=toggleMod(m,'lunette');m=toggleMod(m,'reflex');const r3=same(m,['poignee','reflex']);
  const t=toggleMod(['bipied'],'trepied');const r4=same(t,['trepied']);
  P(r1&&r2&&r3&&r4,'A2. le module choisi prend la place, se retire d’un second clic',`frein sur silencieux ${r1} · retrait ${r2} · lunette→lichen ${r3} · bipied→trépied ${r4}`);}
// A3
{const trois={...fusil,mods:['frein','cacheflamme','manchon']},seul={...fusil,mods:['manchon']};const D3=derive(trois),D1=derive(seul);
  const eq=(x,y)=>Math.abs(x-y)<1e-9;
  P(eq(D3.recoil,D1.recoil)&&eq(D3.flash,D1.flash)&&eq(D3.dB,D1.dB)&&same(D3.mods,['manchon']),'A3. trois dispositifs = le silencieux seul, comme sur le dessin',`recul ${D3.recoil.toFixed(3)}/${D1.recoil.toFixed(3)} · éclair ${D3.flash.toFixed(3)}/${D1.flash.toFixed(3)} · bruit ${D3.dB}/${D1.dB} dB · modules ${D3.mods}`);}
// A4
{const all=[...DEFAULT_DESIGNS.map(d=>[d.id,d.p.mods||[]]),...KIT_PRESETS.map(k=>[k.id,kitToP(k.design).mods||[]])];
  const bad=all.filter(([,m])=>!same(fitMods(m),m)).map(([id])=>id);
  P(bad.length===0&&all.length>=10,'A4. aucune conception du jeu n’est modifiée',`${all.length} conceptions contrôlées · modifiées : ${bad.join(',')||'aucune'}`);}
// A5
{const W=new World(3,{assisted:true});const b=W.s.buildings.find(x=>x.f==='meumeu'&&x.k==='armurerie'&&x.done)||(()=>{const at=W.buildSpot('meumeu','armurerie',W.capital().i+8,W.capital().j+8,0,24);return W.addBuilding('meumeu','armurerie',at[0],at[1],true);})();
  Object.assign(W.capital().stock,{pieces:500,fer:500,cuivre:500,bois:500});
  const r=W.propose(b,'Trop garnie',{...fusil,mods:['frein','cacheflamme','manchon','reflex','lunette']});const d=r.ok&&W.design(r.id);
  const D=d?derive(d.p):null;const G=D&&layout(D);const Dv=D&&derive({...fusil,mods:['manchon']});
  P(r.ok&&same(d.p.mods,['manchon','lunette'])&&G&&Math.abs(G.dev-layout(Dv).dev)<1e-9,'A5. l’enregistré est propre ; le dessin mesure la bouche que la physique compte',`ok ${r.ok} · modules gardés ${d?d.p.mods:'?'} · bouche ${G?.dev.toFixed(1)} mm contre ${Dv&&layout(Dv).dev.toFixed(1)} mm`);}
// A6
{const orphan=Object.keys(MODS).filter(m=>!portOf(m));const ghost=Object.values(PORTS).flatMap(p=>p.mods).filter(m=>!MODS[m]);
  const multi=portConflicts(['frein','manchon','lunette']).map(([k])=>k);
  P(orphan.length===0&&ghost.length===0&&same(multi,['bouche']),'A6. les attaches et les modules se répondent',`modules sans réponse : ${orphan.join(',')||'aucun'} · attaches fantômes : ${ghost.join(',')||'aucune'} · conflits vus : ${multi}`);}
process.exit(fail?1:0);
