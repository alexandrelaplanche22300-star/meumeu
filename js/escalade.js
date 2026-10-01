// L'escalade, côté armes lourdes : à mesure que la guerre s'aggrave (niveau 0–5, voir beeeLevel), l'état-major bèè arme ses villes — des équipes de mitrailleuses
// lourdes dans les tranchées, des fusils antichars aux approches (dès qu'ils ont vu nos blindés). Les fusées, l'artillerie lourde, les blindés et les véhicules de combat
// sont la supériorité technologique des Meumeu : les Bèè n'en ont pas. Tout passe par les mêmes règles que le joueur : des armes fabriquées, des équipages sortis
// de la caserne (releaseCrew), des munitions portées par les servants.
import {BUILDINGS,DAY} from './data.js';
import {ACTIONS} from './ballistics.js';

const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
const alive=u=>u&&u.hp>0&&u.h?.state!=='hors';

export const ESCALADE={
  // ce que l'état-major veut à ce niveau : [conception, équipes voulues en tout]
  // (les villes qui comptent : celles qui ont une caserne — une colonie de six villageois ne garde pas une pièce de trois servants ; mesuré : 22 villes,
  // 44 équipes voulues, 44 caisses de bande commandées, aucune ne suffisait jamais à former la deuxième équipe)
  beeeHeavyWants(){const L=this.beeeLevel(),kas=this.beeeBuildings('caserne').filter(b=>b.done);
    const n=this.s.beee.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done&&kas.some(b=>this.distB(b,c.x,c.y)<28)).length;const out=[];
    const add=(id,from,teams)=>{const d=this.design(id);if(L>=from&&d&&d.status==='adopte'&&teams>0)out.push({id,teams:Math.ceil(teams)});};
    // la mitrailleuse très lourde protège les villes de caserne : une dès le niveau 1, deux dès le niveau 3 (la mitrailleuse légère, elle, suit la doctrine)
    // (au plus 2 + 2 × niveau équipes de chaque sorte en tout : une pièce lourde coûte trop cher à tenir pour en mettre partout — mesuré sans plafond : 68 voulues)
    const cap=2+2*L;
    add('bee_mg_lourde',1,Math.min(cap,n*(L>=3?2:1)));
    // le fusil antichar : seulement quand ils ont vu nos blindés (une équipe pour deux villes, puis une par ville au niveau 4)
    if(this.s.beee.sawArmor)add('bee_at',0,Math.min(cap,Math.max(1,n/(L>=4?1:2))));
    return out;},
  // ce qu'il faut au dépôt d'une caserne pour sortir UNE équipe (la règle de releaseCrew) : les caisses de la pièce (tireur + servants), les fusils des servants
  // et leurs cartouches — mesuré : la ville commandait 2 caisses quand l'équipe en demande 2,08 ; la mitrailleuse attendait au dépôt depuis le jour 7
  beeeTeamKit(id){const W=this.W(id),nsv=Math.max(0,(W.crew||1)-1),Ws=this.W('bee_fusil');
    return {m:nsv*this.servantCrates(W)+W.carry/Math.max(1,W.perCrate),side:nsv,sideM:Ws?.perCrate>0?nsv*Math.min(1,Ws.carry/Ws.perCrate)*.25:0};},
  beeeTeams(id){return this.s.units.filter(u=>u.f==='beee'&&u.w===id&&!u.servant&&u.hp>0);},
  // le stock de guerre : des armes et des munitions pour les équipes à former (le plan de fabrication les lit comme les armes de la doctrine)
  // (et les fusils de leurs servants : sans arme légère au dépôt de la caserne, releaseCrew refuse de sortir l'équipe — mesuré : deux mitrailleuses lourdes
  // fabriquées au jour 13 attendaient encore au jour 23, les fusils partant tous aux recrues)
  beeeHeavyPlan(T){for(const {id,teams} of this.beeeHeavyWants()){const have=this.beeeTeams(id).length,miss=Math.max(0,teams-have),nsv=Math.max(0,(this.W(id).crew||1)-1);
    const K=this.beeeTeamKit(id);T['a:'+id]=miss>0?1+Math.min(2,miss):0;T['m:'+id]=Math.max(3,Math.ceil(Math.min(3,miss)*K.m+teams));if(miss>0){T['a:bee_fusil']=(T['a:bee_fusil']||0)+Math.min(2,miss)*nsv;T['m:bee_fusil']=(T['m:bee_fusil']||0)+1;}}},
  // ce que la caserne d'une ville réclame au réseau pour ses équipes lourdes (l'arme et des caisses de munitions), pour que les usines ne gardent pas tout chez elles
  // les villes de caserne, de la plus proche de la menace (nos bâtiments qu'ils connaissent) à la plus éloignée — refait une fois par heure
  beeeHeavyCities(){if(this._hcT===this.s.t&&this._hc)return this._hc;const B=this.s.beee,kas=this.beeeBuildings('caserne').filter(b=>b.done);
    const foes=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&typeof B.known?.[b.id]==='object');const thr=c=>foes.length?Math.min(...foes.map(f=>d2(f.i,f.j,c.x,c.y))):d2(c.x,c.y,this.N*.12,this.N*.88);
    this._hcT=this.s.t;return this._hc=B.cities.filter(c=>!c.fallen&&kas.some(b=>this.distB(b,c.x,c.y)<28)).map(c=>({id:c.centre,d:thr(c)})).sort((a,z)=>a.d-z.d).map(o=>o.id);},
  // (au plus trois villes à la fois réclament le matériel d'une sorte d'équipe : 5 caisses dispersées sur dix villes ne formaient aucune équipe)
  beeeHeavyWants2(ct,set){let nsv=0;const rank=this.beeeHeavyCities().indexOf(ct.id);if(rank<0)return;for(const {id,teams} of this.beeeHeavyWants()){const miss=teams-this.beeeTeams(id).length;if(miss<=0||rank>=Math.min(3,miss))continue;const K=this.beeeTeamKit(id);set('a:'+id,1);set('m:'+id,Math.ceil(K.m*10)/10+.5);nsv=Math.max(nsv,K.side);}
    if(nsv>0){set('a:bee_fusil',6+nsv);set('m:bee_fusil',9);}},   // les fusils des servants, en plus de la dotation des recrues (6 et 8 d'une ville de caserne)

  // former les équipes qui manquent : une par ville et par passage, dans une ville qui a la caserne, l'arme et les recrues
  beeeHeavy(cities){const B=this.s.beee,t=this.s.t;if(this.beeeLevel()<1||t<(B.heavyT||0))return;B.heavyT=t+3;
    for(const {id,teams} of this.beeeHeavyWants()){const have=this.beeeTeams(id).length;if(have>=teams)continue;
      const W=this.W(id);if(!(W.crew>1)&&W.crew!==1)continue;
      // seule une ville dont le dépôt a déjà l'arme et ses caisses peut former l'équipe (le réseau les y amène : voir beeeHeavyWants2)
      const order=cities.filter(c=>!c.fallen).map(c=>({c,b:this.beeeBuildings('caserne').find(b=>b.done&&this.distB(b,c.x,c.y)<28)})).filter(o=>{if(!o.b||(o.b.inside?.length||0)<W.crew)return false;const H=this.have('beee',o.b.i+1,o.b.j+1);const K=this.beeeTeamKit(id);return (H['a:'+id]||0)>=1&&(H['m:'+id]||0)>=K.m&&(W.crew<2||(H['a:bee_fusil']||0)>=K.side&&(H['m:bee_fusil']||0)>=K.sideM);});
      // la ville qui a le moins de ces équipes d'abord
      order.sort((p,q)=>this.beeeTeams(id).filter(u=>u.city===p.c.id).length-this.beeeTeams(id).filter(u=>u.city===q.c.id).length);
      for(const {c,b} of order){const r=W.crew>1?this.releaseCrew(b,id):this.releaseRecruits(b,1,'soldat',id,null,null);if(!r.ok){B.heavyWhy=`${id} : ${(r.why||[]).join(' ; ')}`;continue;}
        const gun=r.gunner||this.s.units.filter(u=>u.f==='beee'&&u.w===id&&u.homeBarracks===b.id).sort((a,z)=>z.id-a.id)[0];if(!gun)break;
        gun.heavy=true;gun.city=c.id;const crew=this.servants?.(gun)||this.s.units.filter(u=>u.serve===gun.id);for(const s of crew){s.city=c.id;s.heavy=true;}
        const post=this.beeePost(c,id,W);gun.post=post;gun.task={kind:'guard',tx:post[0],ty:post[1]};gun.path=null;
        this.log(c.name,`${c.name} met en batterie : ${this.design(id).name}.`,'warn');break;}}},

  // où poster une équipe : face à la menace, sur la ligne de tranchée (mitrailleuses), aux approches (antichar), derrière la ligne (batteries)
  beeePost(c,id,W){const B=this.s.beee,N=this.N,A=ACTIONS[W.p.action]||{};
    const foes=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&typeof B.known?.[b.id]==='object');const near=foes.sort((a,z)=>d2(a.i,a.j,c.x,c.y)-d2(z.i,z.j,c.x,c.y))[0];
    const tx=near?near.i:N*.12,ty=near?near.j:N*.88,a0=Math.atan2(ty-c.y,tx-c.x);
    const taken=this.s.units.filter(u=>u.f==='beee'&&u.heavy&&u.post&&!u.servant).map(u=>u.post);const free=p=>!taken.some(q=>d2(q[0],q[1],p[0],p[1])<3.5);
    const at=(r,a)=>this.freeSpot(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r,4);
    if(W.p.action==='verrou'||W.p.action==='semi'){for(let k=0;k<10;k++){const p=at(15+k,a0+(k%2?.5:-.5)*(1+(k>>1)*.3));if(free(p))return p;}return at(16,a0);}
    // mitrailleuse : une case de tranchée déjà creusée, face à la menace ; à défaut l'arc à 12 cases
    const cells=Object.keys(this.s.trenches).map(Number).filter(k=>{const o=this.s.trenches[k];return o.f==='beee'&&o.b&&d2(k%N+.5,((k/N)|0)+.5,c.x,c.y)<26;}).map(k=>[k%N+.5,((k/N)|0)+.5]);
    const fit=cells.filter(p=>Math.abs(Math.atan2(Math.sin(Math.atan2(p[1]-c.y,p[0]-c.x)-a0),Math.cos(Math.atan2(p[1]-c.y,p[0]-c.x)-a0)))<.9&&free(p)).sort((p,q)=>d2(p[0],p[1],tx,ty)-d2(q[0],q[1],tx,ty));
    if(fit.length)return fit[0];for(let k=0;k<10;k++){const p=at(12,a0+(k%2?.4:-.4)*(1+(k>>1)*.35));if(free(p))return p;}return at(12,a0);},

  // une voiture blindée repérée : les Bèè le savent (et réclament des fusils antichars, voir beeeHeavyWants)
  // (un blindé : un engin dont le flanc arrête la balle — pas la jeep ; mesuré : les engins de combat ne portaient pas « armored », et les Bèè ne
  // voyaient jamais nos blindés)
  beeeSawArmor(){const B=this.s.beee;if(B.sawArmor)return;for(const v of this.s.vehicles||[]){if(v.f!=='meumeu'||v.hp<=0)continue;const V=this.vehDef?.(v);
    const arm=v.armored||(V?.blindage?.flanc?.[0]||0)>=.5;if(arm&&(V?.blindage?this.vehSeen('beee',v):this.visibleAt?.('beee',v.x,v.y))){B.sawArmor=true;this.log('Front','Les Bèè ont vu nos blindés : ils réclament des fusils antichars.','warn');return;}}}
};
