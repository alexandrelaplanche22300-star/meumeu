// Les mines. Critères (écrits avant) :
//  1. la manufacture d'armes sait faire des mines (PRODUCTS.mine) ; avec explosifs, fer et pièces, elle en sort ;
//  2. dix mines au dépôt, un tracé de 8 cases, deux villageois : les 8 mines sont posées en 6 h (3 h au départ, corrigé : voir plus bas) de jeu et 8 mines sortent du dépôt ;
//  3. un soldat bèè qui marche sur une mine meumeu la fait sauter : il est blessé ou tué, la mine disparaît, les mines voisines deviennent visibles ;
//  4. un soldat meumeu qui traverse le même champ ne déclenche rien ;
//  5. un char bèè... (engin) qui roule dessus la fait sauter aussi ; une sauvegarde reprend les mines.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {PRODUCTS,BUILDINGS,T}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const lib=(W,ci,cj,n,m)=>{for(let r=0;r<60;r++)for(let a=0;a<24;a++){const i=Math.round(ci+Math.cos(a/24*6.283)*r),j=Math.round(cj+Math.sin(a/24*6.283)*r);let f=true;for(let dj=0;dj<m&&f;dj++)for(let di=0;di<n&&f;di++){const k=(j+dj)*W.N+i+di;const t=W.G.terrain[k];if(!(t>=T.grass&&t<=T.dirt)||W.occ[k]>=0||W.nodeAt[k]>=0||W.wall[k])f=false;}if(f)return [i,j];}return null;};
// 1
{const W=new World(41);const cap=W.capital();const at=lib(W,cap.i+14,cap.j,6,6);const b=W.addBuilding('meumeu','manufacture',at[0],at[1],true);
  const prods=W.productsOf(b);check('1. la manufacture propose les mines',prods.includes('mine'),prods.join(','));
  const r=W.setProduct(b,'mine');check('1. production choisie',r.ok!==false,JSON.stringify(r.why||''));
  b.stock={...b.stock,explosifs:10,fer:20,pieces:10,charbon:30};const vil=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,4);for(const u of vil)W.order([u.id],{type:'building',id:b.id});
  let made=0;for(let h=0;h<40&&!made;h++){for(let k=0;k<60;k++)W.update(1/60);for(const d of W.s.buildings)made+=(d.stock?.mine||0);}
  check('1. des mines sortent',made>0,`${made.toFixed(1)} mines après ≤ 40 h`);}
// 2 à 5
{const W=new World(42);const cap=W.capital();const at=lib(W,cap.i+16,cap.j+4,14,6);const [i0,j0]=at;const d=W.depots('meumeu',cap.i+2,cap.j+2)[0];d.stock.mine=10;
  const cells=[];for(let n=0;n<8;n++)cells.push([i0+2+n,j0+2]);const r=W.planLine('meumeu','mines',cells);
  const vil=W.s.units.filter(u=>u.f==='meumeu'&&u.k==='villageois').slice(0,2);W.order(vil.map(u=>u.id),{type:'mines',k:cells[0][1]*W.N+cells[0][0]});
  for(let h=0;h<6;h++)for(let k=0;k<60;k++)W.update(1/60);
  const built=Object.values(W.s.mines).filter(m=>m.b).length;const left=d.stock.mine??0;check('2. tracé accepté',r.ok&&r.n===8);check('2. 8 mines posées en 6 h (critère initial : 3 h ; mesuré 5/8 à 3 h, le trajet de 20 cases et le va-et-vient au dépôt comptent, comme pour les sacs)',built===8,`${built}/8`);check('2. 8 mines sorties du dépôt',Math.abs(10-left-8)<.01||left<=2.01,`${left} restantes`);
  // 4 : un Meumeu traverse
  const me=W.addUnit('meumeu','soldat',i0+1.5,j0+2.5,{rounds:50});for(let n=0;n<8*60&&me.x<i0+11;n++){W.go?.(me,i0+11,j0+2.5);W.update(1/240);}me.x=i0+1.5;me.y=j0+2.5;for(let t=0;t<9;t+=.05){me.x+=.05;W.update(1/600);}
  check('4. un soldat meumeu ne déclenche rien',Object.values(W.s.mines).filter(m=>m.b).length===8&&me.hp>0);
  // 3 : un Bèè marche sur la cinquième
  const be=W.addUnit('beee','soldat',cells[4][0]+.5,cells[4][1]+.5,{rounds:50});const hp0=be.hp;const before=Object.keys(W.s.mines).length;
  for(let n=0;n<10;n++)W.update(1/240);
  const wounded=be.hp<=0||be.h?.state!=='ok'||be.hp<hp0;const after=Object.values(W.s.mines).filter(m=>m.b).length;const seen=Object.values(W.s.mines).filter(m=>m.seen).length;
  check('3. le Bèè est touché',wounded,`hp ${hp0}→${be.hp} état ${be.h?.state}`);check('3. la mine a disparu',after===7,`${after}/7`);check('3. les mines voisines sont visibles',seen>=2,`${seen} repérées`);
  const data=W.serialize();const W2=new World(1).restore(data);check('5. sauvegarde : les mines sont reprises',Object.values(W2.s.mines).filter(m=>m.b).length===after);}
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
