// (V12.9) LA GUERRE CHIMIQUE — les bouteilles à gaz, à la manière de 1915 : fabriquer, poser, remplir (barre), porter, poser, combiner en
// batterie, ouvrir ; elles fuient, et crèvent sous les obus. Mécanique de jeu FICTIVE (unités de jeu). Conception : docs/GUERRE-CHIMIQUE.md §4.
// Mixin sur World : gasCylTick(dt) — appelé par gasTick (gaz.js) ; gasCylBlast(x,y,E) — appelé par heBlast (world.js) ; les ordres du joueur
// (cylPlace, cylFill, cylCarry, cylDrop, cylOpen, cylClose) — appelés par l'interface (ui.js). Chaque ordre rend {ok, text | why[]}.
import {AGENTS} from './gaz.js';
import {NUAGE} from './gaz-nuages.js';
import {TILE_M} from './ballistics.js';

export const BOUTEILLE={
  CAP:4,            // caisses d'agent dans une bouteille pleine
  FILL_RATE:1,      // caisses/h au remplissage, près d'un dépôt qui a l'agent
  FILL_R:6,         // cases : la distance au dépôt pour remplir
  REACH:1.2,        // cases : un soldat prend, ouvre ou ferme une bouteille à portée de main
  VALVE:6,          // caisses/h : le débit d'une vanne ouverte
  BATT_R:3,         // cases : les bouteilles à moins de 3 cases l'une de l'autre forment une batterie
  BATT_BONUS:.15,   // ouverture synchronisée : +15 % de nuage par bouteille en plus (un mur de gaz, pas des bouffées)
  LEAK:.005,        // par heure : la petite fuite d'une bouteille saine (les joints)
  LEAK_HURT:.12,    // par heure : la fuite d'une bouteille cabossée (moins de la moitié de sa solidité)
  HP:30,
  SLOW:.6,          // le porteur marche à ×0,6
};

export const GAZ_BOUTEILLES={
  cylState(){return this.gasState().cyl;},
  cyl(id){return this.gasState().cyl.find(c=>c.id===id)||null;},
  cylsNear(x,y,r,f){return this.gasState().cyl.filter(c=>(!f||c.f===f)&&Math.hypot(c.x-x,c.y-y)<=r);},
  cylLevel(c){return c?Math.max(0,Math.min(1,c.amt/BOUTEILLE.CAP)):0;},   // la barre de remplissage (0-1)
  cylName(c){return c.agent?`bouteille de ${AGENTS[c.agent].name.toLowerCase()}`:'bouteille vide';},
  // POSER une bouteille vide : un soldat à moins de 6 cases d'un dépôt qui en a (la manufacture les fait)
  cylPlace(u){if(!u||!u.w||!u.h||u.h.state!=='ok')return {ok:false,why:['seul un soldat valide pose une bouteille']};if(u.f!=='meumeu')return {ok:false,why:['les Bèè n’ont pas de gaz']};
    if(!this.unlocked('prod:bouteille_gaz'))return {ok:false,why:['il faut d’abord la découverte « Les bouteilles à gaz »']};
    if(u.cyl!=null)return {ok:false,why:['il porte déjà une bouteille']};
    const D=this.depots(u.f,u.x,u.y,BOUTEILLE.FILL_R).find(d=>(d.stock.bouteille_gaz||0)>=1);if(!D)return {ok:false,why:['aucune bouteille au dépôt le plus proche (6 cases) : la manufacture en fabrique']};
    D.stock.bouteille_gaz-=1;const g=this.gasState();const c={id:g.nid++,f:u.f,x:u.x,y:u.y,agent:null,amt:0,fill:false,open:false,sync:1,hp:BOUTEILLE.HP,by:null};g.cyl.push(c);
    this.emit({type:'cyl',what:'pose',id:c.id,x:c.x,y:c.y});return {ok:true,text:`${u.name||'Le soldat'} pose une bouteille vide`,c};},
  // REMPLIR : choisir l'agent ; la barre monte tant qu'un dépôt proche en a (1 caisse/h)
  cylFill(c,agent){if(!c)return {ok:false,why:['pas de bouteille']};if(!AGENTS[agent])return {ok:false,why:['agent inconnu']};
    if(!this.unlocked('prod:'+AGENTS[agent].res))return {ok:false,why:[`${AGENTS[agent].name} : pas encore découvert`]};
    if(c.agent&&c.agent!==agent&&c.amt>.01)return {ok:false,why:[`elle contient déjà du ${AGENTS[c.agent].name.toLowerCase()}`]};
    if(c.open)return {ok:false,why:['fermez d’abord la vanne']};c.agent=agent;c.fill=true;return {ok:true,text:`remplissage en ${AGENTS[agent].name.toLowerCase()}`};},
  // PORTER : un soldat valide à portée la charge sur le dos (×0,6 en marchant ; pleine, elle est repérable)
  cylCarry(u,c){if(!u||!c||!u.h||u.h.state!=='ok')return {ok:false,why:['il faut un soldat valide']};if(c.by!=null)return {ok:false,why:['déjà portée']};if(u.cyl!=null)return {ok:false,why:['il porte déjà une bouteille']};
    if(Math.hypot(c.x-u.x,c.y-u.y)>BOUTEILLE.REACH+.5)return {ok:false,why:['trop loin : approchez-le de la bouteille']};if(c.open)return {ok:false,why:['la vanne est ouverte']};
    c.by=u.id;c.fill=false;u.cyl=c.id;return {ok:true,text:`${u.name||'Le soldat'} charge la ${this.cylName(c)} (${Math.round(this.cylLevel(c)*100)} %)`};},
  cylDrop(u){const c=u&&u.cyl!=null?this.cyl(u.cyl):null;if(u)u.cyl=null;if(!c)return {ok:false,why:['il ne porte rien']};c.by=null;c.x=u.x;c.y=u.y;return {ok:true,text:`${this.cylName(c)} posée`};},
  // LA BATTERIE : les bouteilles posées, chargées, à moins de BATT_R cases de proche en proche
  cylBattery(c){const all=this.gasState().cyl.filter(o=>o.f===c.f&&o.by==null&&o.amt>.01);const out=[c],seen=new Set([c.id]);
    for(let q=0;q<out.length;q++){const a=out[q];for(const o of all)if(!seen.has(o.id)&&Math.hypot(o.x-a.x,o.y-a.y)<=BOUTEILLE.BATT_R){seen.add(o.id);out.push(o);}}return out;},
  // OUVRIR : une bouteille ; ou toute la batterie d'un coup (recherche « Les batteries de bouteilles ») — un seul nuage, plus gros
  cylOpen(c,all=false){if(!c||c.by!=null)return {ok:false,why:['posez-la d’abord']};if(!(c.amt>.01)||!c.agent)return {ok:false,why:['elle est vide']};
    let L=[c];if(all){if(!this.unlocked('gaz:batterie'))return {ok:false,why:['l’ouverture synchronisée demande la découverte « Les batteries de bouteilles »']};L=this.cylBattery(c);}
    const sync=1+BOUTEILLE.BATT_BONUS*(L.length-1);for(const o of L){o.open=true;o.fill=false;o.sync=sync;}
    const w=this.s.gas.wind;this.emit({type:'cyl',what:'ouvre',id:c.id,x:c.x,y:c.y,n:L.length});
    return {ok:true,text:`${L.length>1?`batterie de ${L.length} bouteilles ouverte`:'vanne ouverte'} — vent ${Math.round(w.v)} cases/h vers ${dirName(w.a)}`};},
  cylClose(c){if(!c)return {ok:false,why:['pas de bouteille']};c.open=false;c.sync=1;return {ok:true,text:'vanne fermée'};},
  // le pas des bouteilles : remplissage, port, vannes ouvertes, petites fuites
  gasCylTick(dt){const g=this.s.gas;if(!g?.cyl?.length)return;
    for(const c of [...g.cyl]){
      if(c.by!=null){const u=this.unit(c.by);if(!u||!(u.hp>0)||u.h?.state!=='ok'){c.by=null;if(u)u.cyl=null;}else{c.x=u.x;c.y=u.y;}}
      if(c.fill&&c.agent&&c.by==null&&c.amt<BOUTEILLE.CAP){const res=AGENTS[c.agent].res;const D=this.depots(c.f,c.x,c.y,BOUTEILLE.FILL_R).find(d=>(d.stock[res]||0)>0);
        if(D){const q=Math.min(BOUTEILLE.CAP-c.amt,BOUTEILLE.FILL_RATE*dt,D.stock[res]);D.stock[res]-=q;c.amt+=q;}if(c.amt>=BOUTEILLE.CAP-1e-6){c.fill=false;c.amt=BOUTEILLE.CAP;}}
      if(!c.agent||!(c.amt>0))continue;
      // la vanne ouverte : le gaz part au débit de la vanne (une batterie synchronisée : un nuage plus gros)
      let out=0;if(c.open&&c.by==null){out=Math.min(c.amt,BOUTEILLE.VALVE*dt);if(c.amt-out<.01){out=c.amt;c.open=false;}}
      // les fuites : les joints, puis une bouteille cabossée
      const leak=c.amt*(c.hp<BOUTEILLE.HP/2?BOUTEILLE.LEAK_HURT:BOUTEILLE.LEAK)*dt;
      if(out>0){c.amt-=out;this.gasRelease(c.x,c.y,c.agent,out*AGENTS[c.agent].pot*NUAGE.PER_CRATE*c.sync,{r:.8,src:'bouteille'});}
      if(leak>0){c.amt-=leak;this.gasRelease(c.x,c.y,c.agent,leak*AGENTS[c.agent].pot*NUAGE.PER_CRATE,{r:0,src:'fuite'});}
      if(c.amt<=1e-4){c.amt=0;c.open=false;}}},
  // UN OBUS PRÈS DES BOUTEILLES (appelé par heBlast) : tout près, elle crève et vide tout sur place ; un peu plus loin, cabossée, elle fuit
  gasCylBlast(x,y,E){const g=this.s.gas;if(!g?.cyl?.length)return;const rBurst=Math.max(.5,(E.inj||1)/TILE_M),rDent=Math.max(1,(E.conc||2)/TILE_M*1.5);
    for(const c of [...g.cyl]){const d=Math.hypot(c.x-x,c.y-y);if(d>rDent)continue;
      if(d<=rBurst||(c.hp-=E.dmgB*.5*(1-d/rDent)+5)<=0)this.cylBurst(c,'un obus');}},
  // une bouteille crève : tout l'agent sur place, d'un coup (et le porteur au milieu)
  cylBurst(c,why){const g=this.s.gas;const i=g.cyl.indexOf(c);if(i<0)return;g.cyl.splice(i,1);if(c.by!=null){const u=this.unit(c.by);if(u)u.cyl=null;}
    if(c.agent&&c.amt>0)this.gasRelease(c.x,c.y,c.agent,c.amt*AGENTS[c.agent].pot*NUAGE.PER_CRATE,{r:1.2,src:'fuite'});
    this.emit({type:'cyl',what:'crève',id:c.id,x:c.x,y:c.y,agent:c.agent,why});
    if(c.f==='meumeu'&&c.agent&&c.amt>.2)this.log?.(this.nearCity?.(c),`Une ${this.cylName(c)} a crevé (${why}) : le gaz sort sur nos lignes.`,'bad');},
};
// le vent : vers où il souffle
export function dirName(a){const n=['l’est','le sud-est','le sud','le sud-ouest','l’ouest','le nord-ouest','le nord','le nord-est'];return n[((Math.round(a/(Math.PI/4))%8)+8)%8];}
