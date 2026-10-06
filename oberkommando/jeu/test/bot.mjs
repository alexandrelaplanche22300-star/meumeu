// Le joueur automatique de la campagne (bâtit, se nourrit, arme une garnison) — partagé par les simulations longues
const {BUILDINGS}=await import('../js/data.js');
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
export function player(W){const F='meumeu';const did={};const cap=W.capital();const CX=cap.i+2,CY=cap.j+2;
  const mine=k=>W.s.buildings.filter(b=>b.f===F&&b.k===k&&!b.ruin);const vil=()=>W.s.units.filter(u=>u.f===F&&u.k==='villageois'&&u.h?.state==='ok');
  const spot=(k,cx,cy,r0=6,r1=30)=>{for(let r=r0;r<=r1;r++)for(let a=0;a<32;a++){const i=Math.round(cx+Math.cos(a/32*6.283+r*.37)*r),j=Math.round(cy+Math.sin(a/32*6.283+r*.37)*r);if(W.canPlace(F,k,i,j).ok)return [i,j];}return null;};
  // un moulin : sur la meilleure terre à portée (le rendement compte plus que quelques cases de marche)
  const soilSpot=(k,cx,cy,r0=5,r1=26)=>{let best=null,bs=-1e9;for(let j=Math.round(cy-r1);j<=cy+r1;j++)for(let i=Math.round(cx-r1);i<=cx+r1;i++){const d=d2(i,j,cx,cy);if(d<r0||d>r1||!W.canPlace(F,k,i,j).ok||!W.depots(F,i+1,j+1,13).length)continue;const sc=W.cropYield(null,i,j,k)*30-d*.25;if(sc>bs){bs=sc;best=[i,j];}}return best;};
  const place=(k,cx=CX,cy=CY,r0,r1)=>{const s=BUILDINGS[k].soil?soilSpot(k,cx,cy,r0,r1):spot(k,cx,cy,r0,r1);if(!s)return false;const r=W.place(F,k,s[0],s[1]);return r.ok?r.b:false;};
  const nodes=(t,x=CX,y=CY)=>W.s.nodes.filter(n=>n.type===t&&n.left>0).sort((a,b)=>d2(a.i,a.j,x,y)-d2(b.i,b.j,x,y));
  const want=(key,cond,fn)=>{if(did[key]||!cond())return false;const r=fn();if(r!==false)did[key]=r||true;return true;};
  return {did,tick(){const V=vil();const idle=V.filter(u=>!u.task);const sites=W.s.buildings.filter(b=>b.f===F&&!b.done&&!b.ruin);const busy=sites.length>=2;const st=W.have(F,CX,CY);
    const order=[['camp',()=>place('camp',nodes('tree')[0].i,nodes('tree')[0].j,2,8)],['moulin',()=>place('moulin')],['grenier',()=>place('grenier')],['moulin2',()=>place('moulin')],['entrepot',()=>place('entrepot')],
      ['four',()=>place('four')],['atelier',()=>place('atelier')],['caserne',()=>place('caserne')],['labo',()=>place('labo')],['hopital',()=>place('hopital')],['tour1',()=>place('tour',CX,CY,9)],['tour2',()=>place('tour',CX,CY,9)],['arsenal',()=>place('arsenal')],['manufacture',()=>place('manufacture')]];
    if(!busy)for(const [k,fn] of order){if(want(k,()=>true,fn))break;}
    for(const b of W.s.buildings)if(b.f===F&&b.done&&BUILDINGS[b.k].factory&&!b.prod&&!b._p){b._p=1;const p={four:'charbon',atelier:'pieces',arsenal:'m:mle1',manufacture:'a:mle1'}[b.k];if(p)W.setProduct(b,p);}
    for(const s of sites){for(let n=V.filter(u=>u.task?.b===s.id).length;n<3&&idle.length;n++)W.order([idle.shift().id],{type:'building',id:s.id});}
    for(const b of W.s.buildings.filter(b=>b.f===F&&b.done&&BUILDINGS[b.k].workers&&b.k!=='camp'&&b.k!=='caserne')){const need=BUILDINGS[b.k].workers-W.workers(b).length;for(let n=0;n<need&&idle.length;n++)W.order([idle.shift().id],{type:'building',id:b.id});}
    for(const cp of mine('camp').filter(b=>b.done)){for(let n=W.workers(cp).length;n<4&&idle.length;n++)W.order([idle.shift().id],{type:'building',id:cp.id});}
    // ramasser ce qui manque, pas au-delà (des dépôts pleins de bois arrêtent les moulins)
    for(const u of idle){const need=(st.pierre||0)<120?'rock':(st.bois||0)<500?'tree':null;const n=need&&nodes(need,u.x,u.y)[0];if(n)W.order([u.id],{type:'node',id:n.id});}
    for(const u of V.filter(u=>u.task?.kind==='gather'&&((u.task.res==='bois'||u.task.type==='tree')&&(st.bois||0)>700||(u.task.res==='pierre'||u.task.type==='rock')&&(st.pierre||0)>500))){u.task=null;u.path=null;}
    // se nourrir : un moulin de plus quand les vivres fondent (un domaine nourrit une vingtaine de bouches)
    const pop=W.s.units.filter(u=>u.f===F).length,food=mine('moulin').length*24;
    if(!busy&&pop>food-4&&!sites.some(b=>BUILDINGS[b.k].soil))place('moulin');
    if((st.vivres||0)>80&&!cap.queue.length&&pop<food+6)W.train(cap,'villageois');
    // l'armée : au jour 8, six villageois à la caserne ; deux jours plus tard, ils sortent et gardent la capitale
    const cas=mine('caserne').find(b=>b.done);if(cas&&!did.want){did.want=1;W.setWant(cap,'pieces',40);W.setWant(cap,'a:mle1',10);W.setWant(cap,'m:mle1',10);W.setPrio?.(cap,5);}
    if(cas&&W.day>=8&&!did.draft){const g=V.filter(u=>u.task?.kind==='gather').slice(0,6);if(g.length>=4){W.order(g.map(u=>u.id),{type:'building',id:cas.id});did.draft=W.day;}}
    if(cas&&did.draft&&W.day>=did.draft+2&&(cas.inside||[]).length&&!did.out){const r=W.releaseRecruits(cas,cas.inside.length,'soldat','mle1',null);if(!r.ok&&process.env.DBG&&W.day%2<1/24)console.log('sortie refusée',r.why);if(r.ok){did.out=true;const us=W.s.units.filter(u=>u.f===F&&u.k==='soldat');for(const [n,u] of us.entries()){u.task={kind:'guard',tx:CX+Math.cos(n)*6,ty:CY+Math.sin(n)*6};}if(us.length>=2)W.formSquad(us.map(u=>u.id));}}
    if(cas&&W.day>=20&&!did.draft2){const g=V.filter(u=>u.task?.kind==='gather').slice(0,6);if(g.length>=4){W.order(g.map(u=>u.id),{type:'building',id:cas.id});did.draft2=W.day;}}
    if(cas&&did.draft2&&W.day>=did.draft2+2&&(cas.inside||[]).length&&!did.out2){const r=W.releaseRecruits(cas,cas.inside.length,'soldat','mle1',null);if(!r.ok&&process.env.DBG&&W.day%2<1/24)console.log('sortie refusée',r.why);if(r.ok)did.out2=true;}
    {const fr=W.savants().filter(u=>!u.sci.pid);for(const x of [...(W.s.innov.ideas||[])]){if(!fr.length)break;W.startProject(x.id,[fr.shift().id]);}}}};}
