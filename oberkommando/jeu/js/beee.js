// Les Bèè commandent les mêmes villageois, chantiers, usines, dépôts et casernes que le joueur.
import {BUILDINGS,BEEE,BEEE_CITIES,NODES,PRODUCTS,VEHICLES,TERRAIN,HOUR_REAL} from './data.js';

const distance=(a,b,x,y)=>Math.hypot(a-x,b-y);
const live=u=>u.hp>0&&u.h?.state!=='hors';
// la nourriture vient du moulin (un domaine de 3×3, ses champs autour) : plus de fermes ni d'enclos
const FOOD='moulin';
// l'écart minimal entre deux villes bèè (des villes serrées ne tiennent pas plus de terrain et se gênent)
const SPACE=45;
const SUPPLY_HOP=58;

// La doctrine : une armée de fusils. Les équipements coûteux (mitraillettes, mitrailleuses, fusils de chasse, fusils à lunette,
// protections) ne se fabriquent qu'en temps de stabilité, avec des ressources en trop (beeeStable) ; sinon, des fusils seulement.
const DOCTRINE={bee_fusil:.8,bee_pm:.07,bee_mg:.06,bee_chasse:.04,bee_lunette:.03};const ASSAULT=new Set(['bee_pm','bee_chasse','bee_mg']);

export const BEE_POP_CAP=2500;
export const BEEE_AI={
  // la stabilité : pas de faim, deux jours de vivres, l'armée à son effectif, du fer, des pièces et des cartouches en trop — alors
  // seulement l'armurerie se permet les équipements coûteux (jugé sur le plan de l'heure précédente)
  beeeStable(P=this.s.beee.plan){if(!P?.T)return false;const n=P.nat,T=P.T;
    return (this.s.beee.hunger||0)<1&&(n.vivres||0)>=(T.vivres||60)*2/3&&P.sold>=P.pop*.25&&(n.fer||0)>=(T.fer||60)*1.3&&(n.pieces||0)>=(T.pieces||30)*1.3&&(n['m:bee_fusil']||0)>=(T['m:bee_fusil']||8);},
  // les armes du moment : des fusils seulement, sauf en temps de stabilité (toute la doctrine)
  beeeArms(){const all=Object.keys(DOCTRINE).filter(id=>this.design(id)?.status==='adopte');return this.beeeStable()?all:all.filter(id=>id==='bee_fusil');},
  // ce qu'une ville de caserne réclame au réseau : les armes du moment (des fusils seulement hors des temps de stabilité) et leurs cartouches ;
  // les protections en temps de stabilité seulement. Ce qui n'est plus d'actualité est retiré : une demande restée d'une période
  // faste gardait pour toujours des manques qu'aucune usine ne comblait plus. big : une ville de caserne (sinon une colonie).
  beeeArmWants(ct,big){ct.want??={};const keep=new Set();const bk=this.beeeBuildings('caserne').find(b=>b.done&&this.distB(b,ct.i+1,ct.j+1)<28);
    const ex=bk?.armNeed&&this.s.t-bk.armNeed.t<10?bk.armNeed.need:{},set=(k,n)=>{keep.add(k);ct.want[k]=n+(ex[k]||0);};
    for(const w of this.beeeArms()){const main=w==='bee_fusil';set('a:'+w,main?(big?6:4):(big?2:1));set('m:'+w,main?(big?8:5):(big?3:2));}
    if(bk)this.beeeHeavyWants2(ct,set);   // toute ville de caserne (escalade.js choisit lesquelles, face à la menace)
    if(this.beeeStable()){set('p:bee_casque',4);if(big)set('p:bee_plaque',2);}else if(ex['p:bee_casque'])set('p:bee_casque',0);
    for(const k of Object.keys(ct.want))if(/^[amp]:/.test(k)&&!keep.has(k))delete ct.want[k];ct.prio=Math.max(ct.prio||3,4);},
  beeeArmyMix(){const n={};for(const u of this.s.units)if(u.f==='beee'&&u.k==='soldat'&&u.hp>0&&u.w)n[u.w]=(n[u.w]||0)+1;return n;},
  // l'arme qui manque le plus à l'armée (par rapport à la doctrine), parmi celles que la caserne a sous la main
  beeeNextArm(H,mix){const tot=Object.values(mix).reduce((a,b)=>a+b,0)+1;return this.beeeArms().filter(id=>(H['a:'+id]||0)>=1&&(H['m:'+id]||0)>=.3).sort((a,z)=>(mix[a]||0)/tot/DOCTRINE[a]-(mix[z]||0)/tot/DOCTRINE[z])[0]||null;},
  beeeTick(dt){const B=this.s.beee;B.econT=(B.econT||0)+dt;
    if(B.econT>=1){B.econT%=1;this.beeeEconomy();}
    this.beeeLevelTick();this.fortTick?.();this.cityFortTick?.();this.amphiBeeTick?.();
    const cities=B.cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);if(this.atWar)this.beeeSearch(cities);
    // l'état-major veille toujours (défense, contre-batterie, reprise) ; l'offensive attend que les deux peuples soient installés
    this.beeeStaff(cities,this.day>=BEEE.firstRaid&&this.beeeReady());},
  // L'escalade : la guerre ne reste pas polie. Un niveau de 0 à 5, qui ne redescend jamais, monte avec les jours de guerre (jours 4, 8, 13, 19, 27)
  // et avec les pertes bèè (un cran par quarante morts). Chaque niveau rend l'état-major plus audacieux (colonnes plus nombreuses, plus tôt, avec
  // moins de marge), fait creuser plus tôt et plus profond, et — voir les autres modules — ouvre les armes lourdes.
  beeeLevel(){return this.s.beee.lvl||0;},
  beeeLevelTick(){const B=this.s.beee;B.lvlT=(B.lvlT||0)+this.dts;if(B.lvlT<HOUR_REAL)return;B.lvlT=0;   // une fois par heure de jeu
    let L=0;for(const th of [4,8,13,19,27])if(this.day>=th)L++;
    const dead=this.s.corpses.filter(c=>c.f==='beee').length;L=Math.min(5,L+Math.floor(dead/40));
    if(L>(B.lvl||0)){B.lvl=L;this.emit({type:'escalade',lvl:L});}},
  // les réglages de l'offensive selon le niveau : colonnes simultanées, armée minimale, marge d'écrasement, garde laissée aux villes, jours entre deux départs
  // (V12.5, choix du joueur) un plafond de population : au-delà de BEE_POP_CAP Bèè vivants (le niveau d'environ J35), plus de naissances, plus de renforts,
  // plus de fondations — la guerre continue avec ce qu'ils ont. Mesuré sans plafond : 6 763 Bèè et 62 villes à J60, une riposte sans fin pour toute tête de pont,
  // 10 s de calcul par heure de jeu. (w.beeePopCap le change pour un banc.)
  beeeFull(){const t=this.s.t;if(this._bfT!==t){this._bfT=t;let n=0;for(const u of this.s.units)if(u.f==='beee'&&u.hp>0)n++;this._bfN=n;}return this._bfN>=(this.beeePopCap??BEE_POP_CAP);},
  raidK(){const L=this.beeeLevel();return {maxcol:1+(L>=3?1:0)+(L>=5?1:0),armyMin:Math.max(24,30-2*L),odds:2.5,keep:Math.max(.3,.5-.04*L),gap:Math.max(.25,.6-.07*L)};},
  beeeReady(){return [FOOD,'atelier','poudrerie','caserne','arsenal'].every(k=>this.s.buildings.some(b=>b.f==='beee'&&b.k===k&&b.done&&!b.ruin));},
  meumeuReady(){return [FOOD,'atelier'].every(k=>this.s.buildings.some(b=>b.f==='meumeu'&&b.k===k&&b.done&&!b.ruin));},
  beeeCrowded(b){return this.s.buildings.some(o=>o!==b&&o.f==='beee'&&o.k==='centre'&&!o.ruin&&distance(o.i,o.j,b.i,b.j)<SPACE*(this.mapK||1));},
  beeeBuildings(k){return this.s.buildings.filter(b=>b.f==='beee'&&!b.ruin&&(!k||b.k===k));},
  beeeCivilians(){return this.s.units.filter(u=>u.f==='beee'&&u.k==='villageois'&&live(u));},
  beeeAssign(u,task){if(u.carry&&task.kind!=='gather'){const d=this.dropAt(u);if(d){this.put(d,u.carry.k,u.carry.n);u.carry=null;}}u.task=task;u.path=null;},
  beeeAvailable(x,y,range=50){return this.beeeCivilians().filter(u=>!u.task||u.task.kind==='gather'||u.task.kind==='work'&&this.building(u.task.b)?.k==='camp').filter(u=>distance(u.x,u.y,x,y)<range).sort((a,b)=>Number(!!a.task)-Number(!!b.task)||distance(a.x,a.y,x,y)-distance(b.x,b.y,x,y));},
  beeeBuild(k,x,y,range=8){const W=this;let choice=null,score=1e9;
    // une ville dont deux chantiers attendent déjà leurs matériaux n'en ouvre pas d'autre : ses porteurs et ses bâtisseurs ne suivent
    // pas (les villes, les camps et les moulins passent quand même)
    if(!['centre','camp',FOOD].includes(k)&&this.s.buildings.filter(b=>b.f==='beee'&&!b.done&&!b.ruin&&distance(b.i,b.j,x,y)<26&&/attend|chercher|arrivent/.test(b.why||'')).length>=2)return null;
    for(let r=0;r<=range;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){
      if(r&&Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
      const i=Math.round(x+dx),j=Math.round(y+dy);if(!W.canPlace('beee',k,i,j).ok)continue;
      const s=distance(i,j,x,y)-(BUILDINGS[k].soil?W.cropYield(null,i,j,k)*14:0);if(s<score){score=s;choice=[i,j];}}
    if(!choice)return null;const out=W.place('beee',k,...choice);if(!out.ok)return null;
    const b=out.b;const worker=W.beeeAvailable(b.i,b.j,65)[0];if(worker)W.beeeAssign(worker,{kind:'build',b:b.id});return b;},
  beeeOre(kind,from,max=110){const ores=this.ores??=this.s.nodes.filter(n=>n.type==='ore');const taken=new Set(this.s.buildings.filter(b=>b.k==='mine'&&!b.ruin&&(b.f==='meumeu'||b.f==='beee')).map(b=>b.ore));
    return ores.filter(n=>n.res===kind&&n.left>20&&!taken.has(n.id)&&distance(n.i,n.j,from.x,from.y)<max)
    .sort((a,b)=>distance(a.i,a.j,from.x,from.y)-distance(b.i,b.j,from.x,from.y))[0];},
  beeeEconomy(){const cities=this.s.beee.cities;const B0=this.s.beee;
    // une ville qui tombe : si c'était un grenier (une terre noire), c'est la faim qui menace — ils le savent, et ils le feront payer
    for(const c of cities){const was=c.fallen;const ct=this.building(c.centre);c.fallen=!ct||ct.ruin;if(!was&&c.fallen){B0.lostT=this.s.t;if(ct?.granary){B0.reprisal={t:this.s.t,x:c.x,y:c.y,name:c.name};B0.hurtBy=(B0.hurtBy||0)+3;}}}
    // la faim : ce que leurs fermes produisent (selon la terre) contre ce que mange leur peuple
    {const us=this.s.units.filter(u=>u.f==='beee'&&u.hp>0);const eat=us.reduce((a,u)=>a+(u.k==='villageois'?.12:.2),0)*(BEEE.frugal||1);const prod=this.beeeBuildings(FOOD).filter(b=>b.done).reduce((a,b)=>a+(b.yield??this.cropYield(b))*BUILDINGS[FOOD].makes.vivres*Math.min(BUILDINGS[FOOD].workers,this.workers(b).length||2),0);B0.hunger=+(eat/Math.max(.1,prod)).toFixed(2);}
    const capital=cities.find(c=>!c.fallen);if(!capital)return;
    const base=this.building(capital.centre),built=k=>this.beeeBuildings(k),ready=k=>built(k).some(b=>b.done),pending=k=>built(k).some(b=>!b.done);
    // un chantier qui n'avance plus depuis quatre jours (inaccessible, sans matériaux, bâtisseurs tués) est abandonné et remboursé :
    // il ne bloque plus les suivants (une colonie en panne empêchait toutes les autres)
    // (un chantier dont les matériaux continuent d'arriver n'est pas « arrêté » : la progression reste à 0 tant que le matériau le
    // moins payé n'est pas là, mais les livraisons comptent comme de l'avancement)
    for(const b of this.beeeBuildings().filter(b=>!b.done)){const adv=b.progress+Object.values(b.paid||{}).reduce((a,v)=>a+v,0)/1000;if(b.stallP!==adv){b.stallP=adv;b.stallT=this.s.t;continue;}
      // (l'industrie de guerre payée à plus de moitié attend dix jours ses derniers matériaux plutôt que de tout recommencer)
      const paidF=Object.values(b.paid||{}).reduce((a,v)=>a+v,0)/Math.max(1,Object.values(BUILDINGS[b.k].cost||{}).reduce((a,v)=>a+v,0));if(['manufacture','arsenal','caserne','poudrerie'].includes(b.k)&&paidF>=.5&&this.s.t-(b.stallT??this.s.t)<=240)continue;if(BUILDINGS[b.k]?.bunker||BUILDINGS[b.k]?.launch)continue;   // (un ouvrage de la côte n'est jamais abandonné : l'état-major le relance)
      if(this.s.t-(b.stallT??this.s.t)>96){if(b.k==='centre'||b.k==='camp')for(const n of this.s.nodes)if(n.type==='ore'&&distance(n.i,n.j,b.i,b.j)<12)n.beeeFail=this.s.t+10*24;this.cancel(b.id);}}
    // l'entretien : chaque ville bèè brûle du bois pour vivre (le chauffage, les fours à pain, les forges), à la mesure de ses habitants —
    // un peuple gourmand, qui épuise ses forêts et doit aller en chercher toujours plus loin
    for(const c of cities.filter(c=>!c.fallen)){const ct=this.building(c.centre);if(!ct?.done)continue;const need=this.cityStats(ct).res*.012;if(need>0)this.take('beee',ct.i+1,ct.j+1,'bois',need,26);}
    // la famine renvoie des soldats aux champs : le pays a faim et moins d'un jour de vivres — trois soldats par heure au plus (les
    // garnisons gardent quatre hommes) redeviennent villageois ; leurs armes et leurs cartouches vont au dépôt, pour plus tard
    {const Pv=this.s.beee.plan;const eatD=(Pv?.T?.vivres||60)/3;if((B0.hunger||0)>1.1&&(Pv?.nat?.vivres||0)<eatD){let n=0;
      for(const c of cities.filter(c=>!c.fallen)){if(n>=3)break;const g=this.beeeGuards?.(c)||[];for(const u of g.slice(4)){if(n>=3)break;const D=this.dropAt(u);if(!D)continue;
          if(u.w){this.put(D,'a:'+u.w,1);const Wd=this.W(u.w);const cr=Wd.perCrate>0?((u.mag||0)+(u.pouch||0))/Wd.perCrate:0;if(cr>0)this.put(D,'m:'+u.w,cr);}if(u.armor){this.put(D,'p:'+u.armor,1);u.armor=null;u.plates={};}
          u.k='villageois';u.w=null;u.mag=0;u.pouch=0;u.task=null;u.path=null;u.sentry=false;u.band=null;n++;}}
      if(n&&this.s.t-(B0.famineLogT??-99)>24&&(B0.famineLogT=this.s.t)&&!this.s.fog)this.log('Front',`La famine renvoie ${n} soldats bèè aux champs.`,'good');}}
    // La ville attaquée (tirée ou bombardée ces 6 dernières heures) : ses civils quittent les postes sous le feu et rentrent au centre ; et elle arme
    // ses civils avec les fusils de ses dépôts, tout de suite, sans caserne (une milice : quatre par passage, tant qu'elle a moins de deux fois sa garnison)
    {const T0=this.s.t,loss=(B0.lossAt||[]).filter(p=>T0-p.t<1.5);
      for(const c of cities.filter(c=>!c.fallen&&c.shelled&&T0-c.shelled.at<6)){const ct=this.building(c.centre);if(!ct)continue;const [cx,cy]=this.bc(ct);
        for(const u of this.beeeCivilians()){if(distance(u.x,u.y,cx,cy)>30)continue;if(loss.some(p=>distance(p.x,p.y,u.x,u.y)<12)&&u.task?.kind!=='move'){u.task={kind:'move',tx:cx+(this.rand()-.5)*3,ty:cy+(this.rand()-.5)*3};u.path=null;}}
        const guards=this.beeeGuards(c).length,civ=this.beeeCivilians().length;let n=0;
        if(guards<2*this.beeeGarrisonMin(c)&&civ>20)for(const u of this.beeeCivilians().filter(u=>distance(u.x,u.y,cx,cy)<30&&!u.inBarracks)){if(n>=4)break;
          const w=this.bestRifle('beee'),Wd=this.W(w);if(this.take('beee',cx,cy,'a:'+w,1,160)<1)break;const cr=this.take('beee',cx,cy,'m:'+w,1,160);
          u.k='soldat';u.w=w;u.mag=Wd.p.mag;u.pouch=Math.min(Wd.carry,Math.max(Wd.p.mag*2,Math.round(cr*(Wd.perCrate||20))));u.carry=null;u.city=c.id;u.home=c.centre;u.task={kind:'guard',tx:cx+(this.rand()-.5)*8,ty:cy+(this.rand()-.5)*8};u.path=null;n++;}
        if(n&&!this.s.fog)this.log(c.name,`${c.name} arme ${n} civils pour se défendre.`,'warn');}}
    // Les renforts (V12.4, demande du joueur : « beaucoup plus de soldats bèè ») : toutes les 8 h, chaque ville qui a une caserne voit arriver 1 + niveau
    // soldats armés (fusil bèè, une caisse de cartouches), tant que l'armée est sous 120 + 40 × villes. Une aide donnée à l'IA, pour des vagues massives.
    {const sol=this.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.hp>0&&u.h?.state!=='hors').length,live_=cities.filter(c=>!c.fallen),capS=200+70*live_.length+Math.min(400,this.fortNeed?.()||0),L=this.beeeLevel();let room=this.beeeFull()?0:capS-sol;
      for(const c of live_){if(room<=0)break;if(this.s.t-(c.reinfT??-99)<8)continue;const bk=this.beeeBuildings('caserne').find(b=>b.done&&!b.ruin&&this.distB(b,c.x,c.y)<28);if(!bk)continue;c.reinfT=this.s.t;
        const n=Math.min(room,2+L),w=this.bestRifle('beee'),Wd=this.W(w),[bx,by]=[bk.i+1,bk.j+3];for(let k=0;k<n;k++){const [x,y]=this.freeSpot(bx+(this.rand()-.5)*4,by+(this.rand()-.5)*3,3);const u=this.addUnit('beee','soldat',x,y,{w});
          u.mag=Wd.p.mag;u.pouch=Math.max(0,Wd.carry-Wd.p.mag);   /* (V12.5) une dotation, plus une caisse entière */u.city=c.id;u.home=c.centre;u.task={kind:'guard',tx:c.x+3+(this.rand()-.5)*8,ty:c.y+3+(this.rand()-.5)*8};}room-=n;}}
    // Le ravitaillement des usines (V12.4) : sans triche. Une gare du réseau ferré alimente d'elle-même les usines proches (≤ 14 cases) — mais
    // seulement avec ce qu'elle a en stock, c'est-à-dire ce que les trains y ont apporté. Voie coupée, plus de train, plus rien dans la gare :
    // l'usine attend. Plus de prélèvement dans « tous les dépôts du pays ». Une usine sans gare proche reste servie par les porteurs.
    if(this.s.t-(B0.supT??-99)>=2){B0.supT=this.s.t;const gares=this.beeeBuildings('gare').filter(g=>g.done&&!g.ruin&&this.netOf(g)!=null);
      if(gares.length)for(const b of this.s.buildings){if(b.f!=='beee'||!b.done||b.ruin||!BUILDINGS[b.k].factory||!b.prod)continue;const S=this.building(b.sup);if(!S)continue;const R=this.recipe(b,b.prod);if(!R)continue;
        const [fx,fy]=this.bc(b);let G=null,gd=14;for(const g of gares){const d=this.distB(g,fx,fy);if(d<gd){gd=d;G=g;}}if(!G||G===S)continue;
        const want={...Object.fromEntries(Object.entries(R.in).map(([k,v])=>[k,v*2]))};const coal=this.coalRate(b)*Math.max(2,BUILDINGS[b.k].workers||2)*(R.hours||4)*2;if(coal>0)want.charbon=(want.charbon||0)+coal;
        for(const [k,w] of Object.entries(want)){const have=S.stock[k]||0;if(have>=w)continue;const q=Math.min(w-have,Math.max(0,G.stock[k]||0));if(q<=0)continue;const got=this.put(S,k,q);if(got>0)G.stock[k]-=got;}}}
    // L'intendance : le plan (ce qui manque, en remontant la chaîne), puis chaque villageois au poste qui vaut le plus.
    const stock=this.have('beee',base.i+1,base.j+1);const plan=this.beeePlan();this.beeeLabour(plan);this.beeePorters(plan);this.beeeTrains();this.beeeSiting(plan);
    const stillBuilding=this.beeeBuildings().some(b=>!b.done&&!['camp','mine','centre','maison','gare'].includes(b.k)&&distance(b.i,b.j,base.i,base.j)<32);   // l'expansion (camps, mines, colonies) ne bloque pas l'industrie
    if(!stillBuilding){const queue=[FOOD,'maison','atelier','four','poudrerie','arsenal','caserne','manufacture'];
      for(const k of queue)if(k==='caserne'||k===FOOD||k==='maison'?!built(k).some(b=>distance(b.i,b.j,base.i,base.j)<30):!ready(k)&&!pending(k)){
        // on compte les réserves de tout le pays (les convois portent au chantier), pas le seul centre-ville
        const cash=plan.nat;const cost=BUILDINGS[k].cost;
        if(Object.entries(cost).some(([key,n])=>(cash[key]||0)<n*.6))break;
        if(this.beeeBuild(k,base.i+5,base.j+5,18))break;}
    }
    // Le plan alimentaire : ce que les fermes peuvent donner (selon leur terre, à plein effectif) contre ce que mange le peuple,
    // avec une marge ; il manque de quoi manger → une ferme de plus, dans la ville dont la terre est la meilleure (deux chantiers
    // à la fois en cas de faim). Le blé ne pousse pas sur le plateau : les colonies de terre noire nourrissent les autres.
    {let eatAll=0,canAll=0,built2=0;const Y=BUILDINGS[FOOD].makes.vivres*BUILDINGS[FOOD].workers;const P0civ=plan.civ;
      for(const c of cities.filter(c=>!c.fallen)){const ct=this.building(c.centre);if(!ct?.done)continue;const eat=this.cityFoodRate(ct);const fs=built(FOOD).filter(f=>distance(f.i,f.j,c.x,c.y)<24);
        const can=fs.reduce((a,f)=>a+(f.done?f.yield??this.cropYield(f):this.cropYield(f))*Y,0);eatAll+=eat;canAll+=can;
        // la terre autour de la ville : si elle ne vaut rien, on ne s'y acharne pas (les convois la nourriront)
        let sy=0,n=0;for(let dj=-12;dj<=12;dj+=3)for(let di=-12;di<=12;di+=3){sy+=this.fertYield(this.fertAt(Math.round(c.x+di),Math.round(c.y+dj)));n++;}
        const famine=(B0.hunger||0)>1.1||(plan.city?.get(ct.id)?.days??9)<.5;   // la faim : on bâtit même sur une terre médiocre (la meilleure parcelle)
        if(built2<2&&can<eat*1.25+.5&&(sy/n>=.3||famine)&&built(FOOD).length*BUILDINGS[FOOD].workers<P0civ*.55+3&&!fs.some(f=>!f.done)&&Object.entries(BUILDINGS[FOOD].cost).every(([k,n])=>(plan.nat[k]||0)>=n)&&this.beeeBuild(FOOD,c.x,c.y+2,16))built2++;}
      B0.foodCan=+canAll.toFixed(1);B0.foodEat=+eatAll.toFixed(1);}
    // l'armement et la caserne tournent en continu, même quand un chantier est en cours
    // le nombre : la manufacture sort des fusils simples (une mitraillette sur quatre), l'arsenal leurs cartouches
    // les usines chimiques : la poudre d'abord (les cartouches en dépendent) ; une seule fait des explosifs — pour les charges de
    // démolition de leurs saboteurs, rien d'autre (pas de grenades) : lents (le salpêtre seul, neuf heures), et seulement quand la
    // poudre dépasse ce qu'il faut
    {const P=this.beeeBuildings('poudrerie').filter(b=>b.done);const ex=(plan.nat.explosifs||0)<(plan.T.explosifs||14)&&((plan.nat.poudre||0)>=(plan.T.poudre||30)*1.2||(this.fortMineWant?.()||0)>0&&(plan.nat.poudre||0)>=(plan.T.poudre||30)*.5);
      P.forEach((b,i)=>{const want=ex&&i>=P.length-Math.max(1,Math.floor(P.length/3))&&(P.length>1||(plan.nat.poudre||0)>(plan.T.poudre||30)*2)?'explosifs':'poudre';if(b.prod!==want)this.setProduct(b,want);});}
    // l'armurerie : chaque manufacture fabrique ce qui manque le plus au stock de guerre (les armes de la doctrine pour les recrues
    // à venir, les casques, les plastrons), chaque arsenal les cartouches les plus en retard ; on ne change pas de fabrication pour
    // un rien (un lot commencé serait démonté)
    // (le fusil d'abord tant que l'armée est trop petite pour ses garnisons ; les protections après les armes ; jamais ce que le pays
    // ne peut pas fabriquer faute de matière — un fusil à lunette sans cuivre bloquait toute la manufacture)
    {const T=plan.T,short=plan.sold<plan.pop*.3;const heavyK=new Set([...this.beeeHeavyWants().flatMap(w=>['a:'+w.id,'m:'+w.id]),...Object.keys(this.fortArmsWant?.()||{}).flatMap(w=>['a:'+w,'m:'+w])]);const wt=k=>k==='a:bee_fusil'||k==='m:bee_fusil'?(short?3:1.2):heavyK.has(k)?.9:k.startsWith('p:')?(short?.3:.6):short?.35:1;   // les armes lourdes voulues par l'escalade passent devant les autres armes, jamais devant le fusil
      const need=k=>Math.max(0,(T[k]||0)-(plan.nat[k]||0))/Math.max(1,T[k]||1)*wt(k);
      const can=(m,k)=>{const R=this.recipe(m,k);return !!R&&Object.entries(R.in||{}).every(([r,n])=>(plan.nat[r]||0)>=Math.max(n*6,4));};
      for(const [kind,pre] of [['manufacture',/^([ap]:|mine$)/],['arsenal',/^m:/]]){const L=Object.keys(T).filter(k=>pre.test(k)).sort((a,z)=>need(z)-need(a));const taken=new Set();
        for(const m of this.beeeBuildings(kind).filter(b=>b.done)){if(m.prod&&L.includes(m.prod)&&need(m.prod)>.12&&!taken.has(m.prod)&&can(m,m.prod)){taken.add(m.prod);continue;}
          const want=L.find(k=>!taken.has(k)&&need(k)>.05&&can(m,k))||L.find(k=>can(m,k));if(!want)continue;taken.add(want);if(m.prod!==want)this.setProduct(m,want);}}}
    // la dotation des casernes : chaque ville qui en a une (la capitale comprise) réclame au réseau des armes de chaque sorte, leurs
    // cartouches et des protections — sans elles, les recrues formées attendent
    for(const c of cities.filter(c=>!c.fallen)){const ct=this.building(c.centre);if(!ct?.done||!this.beeeBuildings('caserne').some(b=>b.done&&this.distB(b,c.x,c.y)<28))continue;ct.want??={};
      this.beeeArmWants(ct,true);}
    if(ready('caserne'))this.beeeRecruit(capital);
    // l'expansion : chaque ville pousse ses camps vers les filons (un chantier de camp à la fois par ville)
    const live=cities.filter(c=>!c.fallen);if(this.day>=3&&(stock.bois||0)>=40&&this.beeeBuildings('camp').length<3+2*live.length)for(const c of live)if(!this.beeeBuildings('camp').some(b=>!b.done&&distance(b.i,b.j,c.x,c.y)<60))this.beeeExpand(c);
    // l'expansion : le cadastre choisit où fonder, partout sur la carte (voir beeeColonize)
    this.beeeConquer(plan,base,cities,built);
    this.beeeColonize(plan,base);
    for(const b of built('centre').filter(b=>b.done&&b.colony&&!cities.some(c=>c.centre===b.id))){
      const [x,y]=this.bc(b),c={id:this.id(),name:b.city,x,y,centre:b.id,fallen:false};cities.push(c);
      // cinq colons s'y installent ; leur centre commande au réseau des vivres pour tenir jusqu'aux premières moissons, et de quoi
      // bâtir ses premiers bâtiments (moulin, maisons, grenier) — de vrais convois, porteurs et trains, qu'on peut intercepter
      for(const u of this.beeeAvailable(x,y,400).slice(0,6)){u.home=b.id;u.city=c.id;this.beeeAssign(u,{kind:'move',tx:x+2,ty:y+3});}
      {b.want??={};for(const [k,n] of Object.entries({vivres:90,bois:160,pierre:120,pieces:24}))b.want[k]=Math.max(b.want[k]||0,n);b.prio=Math.max(b.prio||3,5);}
      this.log('Front',`${c.name} : les Bèè ont fondé une ville près des filons.`, 'warn');}
    // Les colonies se développent : une ferme, des maisons, un grenier ; puis une voie ferrée jusqu'à la capitale (d'abord la voie,
    // puis une gare à chaque bout, au bord des rails), que leurs villageois posent ; la voie finie, un train y roule.
    const capGare=built('gare').find(g=>g.done&&distance(g.i,g.j,base.i,base.j)<30);
    for(const c of cities.filter(c=>!c.fallen)){const ct=this.building(c.centre);if(!ct||!ct.done||ct===base)continue;const near=k=>built(k).filter(b=>distance(b.i,b.j,c.x,c.y)<24);
      // deux chantiers à la fois : le moulin d'abord, des maisons dès que la place manque, un moulin de plus si la ville a faim,
      // un grenier, une caserne (la garnison se recrute sur place)
      const sites=this.beeeBuildings().filter(b=>!b.done&&!['camp','mine','gare'].includes(b.k)&&distance(b.i,b.j,c.x,c.y)<22);
      if(sites.length<2){const has=k=>sites.some(b=>b.k===k);const st=this.cityStats(ct);const can=k=>!has(k)&&Object.entries(BUILDINGS[k].cost).every(([r,n])=>(plan.nat[r]||0)>=n);
        const Yc=BUILDINGS[FOOD].makes.vivres*BUILDINGS[FOOD].workers;const grow=near(FOOD).reduce((a,f)=>a+(f.done?f.yield??this.cropYield(f):this.cropYield(f))*Yc,0);
        if(!near(FOOD).length&&can(FOOD))this.beeeBuild(FOOD,c.x-5,c.y+5,14);
        else if(st.cap-st.res<3&&near('maison').length<12&&can('maison'))this.beeeBuild('maison',c.x+5,c.y+5,14);
        else if((ct.granary&&near(FOOD).length<3||grow<this.cityFoodRate(ct)*1.2+.3&&near(FOOD).length<4)&&!has(FOOD)&&can(FOOD))this.beeeBuild(FOOD,c.x,c.y+6,16);
        else if(!near('grenier').length&&can('grenier'))this.beeeBuild('grenier',c.x+6,c.y-4,14);
        // le filon qui a fait naître la ville : une mine dessus dès qu'elle a de quoi manger
        const ore=(near(FOOD).length||st.res>=8)&&!this.beeeBuildings('mine').some(m=>!m.done&&distance(m.i,m.j,c.x,c.y)<16)&&(this.ores??=this.s.nodes.filter(n=>n.type==='ore')).find(n=>n.left>20&&!(n.beeeFail>this.s.t)&&distance(n.i,n.j,c.x,c.y)<14&&!this.s.buildings.some(b=>b.k==='mine'&&!b.ruin&&b.ore===n.id));
        if(ore&&Object.entries(BUILDINGS.mine.cost).every(([r,n])=>(plan.nat[r]||0)>=n)){const m=this.beeeBuild('mine',ore.i,ore.j,2);if(m)m.ore=ore.id;else ore.beeeFail=this.s.t+48;}
        else if(!near('caserne').length&&this.day>=10&&built('caserne').some(b=>b.done&&distance(b.i,b.j,base.i,base.j)<30)&&can('caserne'))this.beeeBuild('caserne',c.x-6,c.y-5,14);}
      if(near('caserne').some(b=>b.done))this.beeeArmWants(ct,false);
      if(!c.railPlanned&&this.s.beee.conqCells?.[c.centre]){c.railPlanned=true;c.railCells=this.s.beee.conqCells[c.centre];c.trainAsked=true;}   // fondée au bout d'une conquête : la voie existe déjà
      if(!c.railPlanned&&this.day>=4&&(plan.nat.bois||0)>100){const a=[Math.round(c.x-7),Math.round(c.y-7)];   // la voie d'abord : une colonie sans terre à blé vit des trains
        // le réseau se maille : la voie part vers la ville déjà reliée la plus proche (la capitale, ou une ville qui a sa voie), pas toujours vers la capitale
        const hubs=cities.filter(o=>o!==c&&!o.fallen&&(o.centre===base.id||o.railPlanned)).map(o=>o.centre===base.id?[base.i-8,base.j-7]:o.railCells[0]);const z=hubs.sort((p,q)=>distance(p[0],p[1],a[0],a[1])-distance(q[0],q[1],a[0],a[1]))[0]||[base.i-8,base.j-7];const cells=this.railRoute(a[0],a[1],z[0],z[1]);
        if(cells?.length>1){this.planLine('beee','rail',cells);c.railPlanned=true;c.railCells=cells;this.log('Front',`Les Bèè tracent une voie ferrée de ${c.name} à leur réseau.`,'warn');}}
      if(c.railCells)this.beeeRailWork(c,near,built);
    }
    // La population progresse avec des maisons, des vivres et des places, exactement comme côté joueur.
    {const st=this.cityStats(base),pend=built('maison').filter(m=>!m.done&&distance(m.i,m.j,base.i,base.j)<26).length;
      if(pend<(st.cap-st.res<3?2:1)&&ready(FOOD)&&st.cap-st.res<6&&built('maison').filter(m=>distance(m.i,m.j,base.i,base.j)<26).length<24&&Object.entries(BUILDINGS.maison.cost).every(([r,n])=>(plan.nat[r]||0)>=n))this.beeeBuild('maison',base.i+8,base.j+6,18);}
    // les tranchées : l'état-major (beeeFortify) les trace en arcs continus face à la menace et les fait creuser
    for(const c of cities.filter(c=>!c.fallen))this.beeeRecruit(c);
    // l'industrie suit l'empire : un atelier (les pièces), un arsenal (les cartouches) pour trois villes, une manufacture, une
    // usine chimique, un four pour quatre ; bâtis dans la plus grande ville qui n'en a pas, pas seulement à la capitale
    {const live=cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);const nC=live.length;const want={atelier:1+Math.floor(nC/3),arsenal:1+Math.floor(nC/3),manufacture:1+Math.floor(nC/3)+(plan.sold<plan.pop*.3&&nC>=3?1:0),poudrerie:1+Math.floor(nC/4),four:1+Math.floor(nC/4)};
      // d'abord l'usine dont le produit manque le plus au plan (mesuré : la manufacture passait toujours devant, 11 manufactures et 900 fusils en trop contre
      // 1 à 4 arsenaux, des centaines de recrues sans cartouches dans les casernes)
      const dOf=pre=>Math.max(0,...Object.entries(plan.D||{}).filter(([k])=>k.startsWith(pre)).map(([,v])=>v));
      const lack={manufacture:dOf('a:'),arsenal:dOf('m:'),poudrerie:plan.D?.poudre||0,atelier:plan.D?.pieces||0,four:plan.D?.charbon||0};
      const order=Object.keys(want).sort((a,z)=>lack[z]-lack[a]);
      // (deux chantiers d'industrie à la fois dès six villes : un seul pour tout l'empire, la manufacture de la graine 101 restait seule jusqu'au jour 19)
      // (et rien de plus tant que la capitale n'a pas son arsenal, sa caserne et sa manufacture : trois arsenaux de plus prenaient la pierre de la première
      // manufacture, restée en chantier du jour 6 au jour 14 — sans elle, ni mitrailleuse lourde ni antichar)
      if(['arsenal','caserne','manufacture'].every(ready)&&this.beeeBuildings().filter(b=>!b.done&&want[b.k]!=null).length<(nC>=6?2:1))for(const k of order){const n=want[k];if(!ready(k)||built(k).length>=n)continue;if(Object.entries(BUILDINGS[k].cost).some(([r,q])=>(plan.nat[r]||0)<q*1.3))continue;
        const c=live.map(c=>({c,st:this.cityStats(this.building(c.centre))})).filter(o=>!built(k).some(b=>distance(b.i,b.j,o.c.x,o.c.y)<26)).sort((a,z)=>z.st.res-a.st.res)[0];
        if(c&&this.beeeBuild(k,c.c.x-8,c.c.y-6,16))break;}}},
  // La pose d'une voie pour une ville (ou pour un front en cours de conquête) : des gares aux deux bouts, six poseurs au plus, un train quand
  // la ligne est finie. c.railCells : les cases, de l'extrémité côté ville (A) à l'extrémité côté réseau (Z).
  beeeRailWork(c,near,built){const N=this.N;const A=c.railCells[0],Z=c.railCells[c.railCells.length-1];
        if(!near('gare').length)this.beeeBuild('gare',A[0],A[1],6);
        if(!built('gare').some(g=>distance(g.i,g.j,Z[0],Z[1])<10))this.beeeBuild('gare',Z[0],Z[1],6);
        const todo=c.railCells.filter(([i,j])=>this.s.rails[j*N+i]&&!this.s.rails[j*N+i].b);
        // les poseurs de voie : jusqu'à six, deux de plus par heure ; une voie qui n'avance plus depuis un jour et demi change d'équipe
        // (un poseur coincé devant une case inaccessible) ; les dernières cases introuvables au bout de quatre jours sont posées d'office
        if(todo.length){if(c.railTodo!==todo.length){c.railTodo=todo.length;c.railT=this.s.t;}
          const layers=this.s.units.filter(u=>u.f==='beee'&&u.task?.kind==='line'&&u.task.line==='rail');
          if(this.s.t-c.railT>36&&this.s.t-(c.railReset||0)>36){c.railReset=this.s.t;for(const u of layers)if(todo.some(([i,j])=>distance(i,j,u.x,u.y)<16)){u.task=null;u.path=null;}}
          if(this.s.t-c.railT>96&&todo.length<=4){for(const [i,j] of todo){const k=j*N+i;this.s.rails[k].paid=1;this.lineBuilt('rail',k);}c.railT=this.s.t;}
          for(let n=layers.length;n<Math.min(6,layers.length+2);n++){const [i,j]=todo[Math.floor(this.rand()*todo.length)];const u=this.beeeAvailable(i,j,500)[0];if(u)this.beeeAssign(u,{kind:'line',line:'rail',x:i,y:j});}}
        else{const gz=built('gare').find(g=>g.done&&distance(g.i,g.j,Z[0],Z[1])<10);if(!c.trainAsked&&gz){
          const r=this.train(gz,'train');if(r.ok){c.trainAsked=true;this.log('Front',`Un train bèè roule sur la ligne de ${c.name}.`,'warn');}
          else{gz.want??={};for(const [k,n] of Object.entries(VEHICLES.train.cost))gz.want[k]=Math.max(gz.want[k]||0,n);gz.prio=5;}
        }}},
  // ---------- l'expansion : des villes partout ----------
  // Le cadastre : tous les dix pas, un emplacement de ville possible, noté pour ce qu'il a autour (filons par sorte, arbres,
  // rochers, terre à blé). Refait tous les deux jours (les filons s'épuisent, les forêts tombent).
  beeeCadastre(){if(this._cad&&this.s.t-this._cad.t<48&&this._cad.t<=this.s.t)return this._cad.L;const N=this.N,S=10,L=[];
    const bins=new Map();for(const n of this.s.nodes){if(!(n.left>0))continue;const k=((n.j/16)|0)*64+((n.i/16)|0);let a=bins.get(k);if(!a)bins.set(k,a=[]);a.push(n);}
    for(let j=S;j<N-S;j+=S)for(let i=S;i<N-S;i+=S){if(!TERRAIN[this.G.terrain[j*N+i]]?.walk)continue;const ore={};let trees=0,rocks=0;
      for(let bj=Math.max(0,(j-16)>>4);bj<=(j+16)>>4;bj++)for(let bi=Math.max(0,(i-16)>>4);bi<=(i+16)>>4;bi++)for(const n of bins.get(bj*64+bi)||[]){if(distance(n.i,n.j,i,j)>16)continue;
        if(n.type==='ore')ore[n.res]=(ore[n.res]||0)+1;else if(n.type==='tree')trees++;else if(n.type==='rock')rocks++;}
      let fy=0,m=0;for(let dj=-9;dj<=9;dj+=3)for(let di=-9;di<=9;di+=3){fy+=this.fertYield(this.fertAt(Math.max(0,Math.min(N-1,i+di)),Math.max(0,Math.min(N-1,j+dj))));m++;}
      L.push({i,j,ore,trees,rocks,fert:fy/m,fail:0});}
    const old=this._cad?.L;if(old)for(const c of L){const o=old.find(o=>o.i===c.i&&o.j===c.j);if(o)c.fail=o.fail;}
    this._cad={t:this.s.t,L};return L;},
  // Fonder : dès que le pays a de quoi (le prix d'un centre, des vivres pour les colons) et des bras (ou des chômeurs), on choisit
  // sur tout le cadastre l'emplacement qui vaut le plus : les filons qui manquent, la forêt, la pierre, la terre à blé ;
  // à 45–80 cases d'une ville bèè (le rail suit vite), en gagnant du terrain vers le milieu de la carte et vers nous ; jamais sous
  // nos canons (40 cases de nos bâtiments). Plusieurs fondations à la fois quand l'empire est grand ou qu'il a des bras en trop.
  beeeColonize(plan,base){const B=this.s.beee,t=this.s.t,N=this.N;const cities=B.cities.filter(c=>!c.fallen);const cities0=B.cities;const ctrs=this.beeeBuildings('centre');
    const founding=ctrs.filter(b=>!b.done).length;const idle=this.beeeCivilians().filter(u=>!u.task).length;
    const LV=this.beeeLevel();const maxF=2+Math.floor(cities.length/4)+(idle>25?1:0)+3;B.colonyWhy='';   // trois fondations de plus à la fois (mesuré)
    if(this.day<(BEEE.colonyDay||5)){B.colonyWhy='trop tôt';return;}if(this.beeeFull()){B.colonyWhy='population au plafond';return;}if(founding>=maxF){B.colonyWhy=`${founding} fondation(s) en cours`;return;}if(t<(B.colonyT||0)){B.colonyWhy='délai';return;}
    const cost=this.colonyPrice();if(Object.entries(cost).some(([k,n])=>(plan.nat[k]||0)<n*1.25)||(plan.nat.vivres||0)<140){B.colonyWhy='pas de quoi fonder';return;}
    if(plan.pop<(cities.length+founding)*16&&idle<6){B.colonyWhy='pas assez de monde';return;}
    // les chantiers en retard (ils attendent plus de bois ou de pierre que le pays n'en a) : on les finit avant d'en ouvrir d'autres
    if(['bois','pierre','pieces'].some(k=>(plan.site?.[k]||0)>(plan.nat[k]||0)*1.2+20)){B.colonyWhy='chantiers en retard';B.colonyT=t+6;return;}
    const lack=k=>plan.D[k]||0,hungry=(B.foodCan||0)<(B.foodEat||0)*1.15;const ours=this.s.buildings.filter(b=>b.f==='meumeu'&&!b.ruin&&B.known?.[b.id]);/* seulement ce qu'ils ont repéré : ils ne savent pas où nous sommes */const all=ctrs.map(b=>[b.i,b.j]);
    const cx=all.reduce((a,p)=>a+p[0],0)/all.length,cy=all.reduce((a,p)=>a+p[1],0)/all.length;let best=null,bs=-1e9;
    /* (V12.5, carte V2) les villes à SPACE × 2 l'une de l'autre ; la portée des porteurs se compte depuis les villes ET les camps-dépôts : un site trop loin
       reçoit d'abord un camp-relais à mi-chemin (relay), la colonie vient ensuite */
    const KM=this.mapK||1,anchors=all.concat(KM>1?this.beeeBuildings('camp').filter(b=>b.done&&!b.ruin).map(b=>[b.i,b.j]):[]);
    for(const c of this.beeeCadastre()){if(c.fail>t)continue;const dcc=Math.min(...all.map(([x,y])=>distance(x,y,c.i,c.j)));if(dcc<SPACE*KM)continue;const dc=Math.min(...anchors.map(([x,y])=>distance(x,y,c.i,c.j)));
      c.relay=!!(KM>1&&dc>SUPPLY_HOP&&dc<=SUPPLY_HOP*2&&(LV<1||B.conq));   /* (V12.7 : un booléen — l’objet de conquête y entrait, et la sauvegarde bouclait : site → relay → conquête → site) */ if(!c.relay&&dc>SUPPLY_HOP+38*LV)continue;   // avec le rail, une colonie n'a plus à coller à sa mère : de 58 cases (niveau 0) à 250 (niveau 5)
      if(!c.relay&&dc>SUPPLY_HOP&&(LV<1||B.conq))continue;   // au-delà de la portée des porteurs : seulement par une conquête ferroviaire (une à la fois)
      c.dcity=dc;   // pas plus loin que la portée des porteurs (60 cases) : une colonie hors de portée n'était jamais approvisionnée (mesuré : chantiers abandonnés après 5 à 7 jours avec 34 à 49 bois livrés)
      const dm=ours.reduce((a,b)=>Math.min(a,distance(b.i,b.j,c.i,c.j)),999);if(dm<55)continue;
      let v=0;for(const [r,n] of Object.entries(c.ore))v+=Math.min(3,n)*(1.2+3*lack(r))*(1+.25*LV);   // les gisements riches valent le voyage
      v+=Math.min(4,c.trees/8)*(.5+lack('bois'))+Math.min(3,c.rocks/4)*(.5+lack('pierre'))+c.fert*(hungry?9:5);
      v-=Math.max(0,dc-80)*(LV>=1?.025:.1);                     // trop loin de tout : mal relié (le rail compense : pénalité réduite dès le niveau 1)
      v+=(1-distance(c.i,c.j,N/2,N/2)/(N*.72))*4;                // gagner le milieu de la carte
      v+=(1-distance(c.i,c.j,N*.12,N*.88)/(N*.95))*(1+2*this.beeeLevel());   // le front : à mesure que la guerre s'aggrave, on pousse vers l'ennemi (le coin d'en face)
      v+=Math.min(1,distance(c.i,c.j,cx,cy)/150)*2;              // s'étaler, pas s'entasser
      if(dm<90)v-=(90-dm)*.1;                                    // trop près de nous : risqué
      if(v>bs){bs=v;best=c;}}
    if(!best){B.colonyWhy='aucun emplacement';B.colonyT=t+12;return;}
    if(best.relay){const [ax,ay]=anchors.slice().sort((p,q)=>distance(p[0],p[1],best.i,best.j)-distance(q[0],q[1],best.i,best.j))[0],d=distance(ax,ay,best.i,best.j),k=Math.min(1,50/d);
      if(this.beeeBuildings('camp').some(cp=>!cp.done&&distance(cp.i,cp.j,ax+(best.i-ax)*k,ay+(best.j-ay)*k)<14)){B.colonyWhy='le camp-relais se monte';B.colonyT=t+3;return;}
      const camp=this.beeeBuild('camp',Math.round(ax+(best.i-ax)*k),Math.round(ay+(best.j-ay)*k),10);if(camp){camp.prio=4;B.colonyWhy='camp-relais vers un site lointain';B.colonyT=t+3;for(const u of this.beeeAvailable(camp.i,camp.j,500).slice(0,2))this.beeeAssign(u,{kind:'build',b:camp.id});}else{best.fail=t+96;B.colonyT=t+1;B.colonyWhy='pas de place pour le relais';}return;}
    if(best.dcity>SUPPLY_HOP){if(this.beeeConquerStart(best,plan,base,cities0)){B.colonyWhy='voie vers un site lointain';B.colonyT=t+6;}else{best.fail=t+48;B.colonyWhy='pas de quoi tracer la voie';B.colonyT=t+3;}return;}
    // un centre se bâtit près d'un dépôt (qui recevra ses matériaux) : d'abord un camp-dépôt, gratuit, sur place ; la ville ensuite
    if(!this.depots('beee',best.i+2,best.j+2,14).some(d=>!BUILDINGS[d.k].foodOnly)){if(this.beeeBuildings('camp').some(cp=>!cp.done&&distance(cp.i,cp.j,best.i,best.j)<12)){B.colonyWhy='le camp des colons se monte';B.colonyT=t+2;return;}
      const camp=this.beeeBuild('camp',best.i+4,best.j+3,8);if(camp){camp.prio=4;B.colonyWhy='camp des colons posé';B.colonyT=t+2;for(const u of this.beeeAvailable(camp.i,camp.j,500).slice(0,2))this.beeeAssign(u,{kind:'build',b:camp.id});}else{best.fail=t+96;B.colonyT=t+1;B.colonyWhy='pas de place pour le camp';}return;}
    let city=this.beeeBuild('centre',best.i,best.j,9);if(city&&this.beeeCrowded(city)){this.cancel(city.id);city=null;}
    if(!city){best.fail=t+96;B.colonyT=t+1;B.colonyWhy='emplacement impossible';return;}
    city.city=this.beeeCityName();city.colony=true;this.beeeKit(city,{vivres:60,bois:80,pierre:60,pieces:12});
    for(const u of this.beeeAvailable(city.i,city.j,500).slice(0,10))this.beeeAssign(u,{kind:'build',b:city.id});
    B.colonyT=t+(idle>25?6:idle>8?10:16)*.4;   // dix bâtisseurs, une colonie toutes les quelques heures
    B.founded=(B.founded||0)+1;B.colonyWhy='fondation : '+city.city;},
  // La conquête ferroviaire : un site trop loin pour les porteurs (plus de SUPPLY_HOP cases d'une ville) se prend par la voie. On trace la ligne
  // depuis le réseau jusqu'au site, des poseurs la construisent, des gares s'élèvent aux deux bouts, puis seulement la ville est fondée au
  // bout de la ligne — ses matériaux arrivent en train. Une seule conquête à la fois ; abandonnée (et le site mis de côté) au bout de dix jours.
  beeeConquer(plan,base,cities,built){const B=this.s.beee,t=this.s.t,N=this.N,R=B.conq;if(!R)return;
    if(t-R.t0>240){B.conq=null;R.site.fail=t+168;this.log('Front',`Les Bèè renoncent à la voie vers ${R.name}.`,'warn');return;}
    const c=R.pc,near=k=>built(k).filter(b=>distance(b.i,b.j,c.x,c.y)<24);this.beeeRailWork(c,near,built);
    const todo=R.cells.filter(([i,j])=>this.s.rails[j*N+i]&&!this.s.rails[j*N+i].b);const gare=built('gare').some(g=>g.done&&distance(g.i,g.j,R.site.i,R.site.j)<16);
    if(todo.length||!gare)return;
    let city=this.beeeBuild('centre',R.site.i,R.site.j,10);if(city&&this.beeeCrowded(city)){this.cancel(city.id);city=null;}
    if(!city){if(t-R.t0>120){B.conq=null;R.site.fail=t+96;}return;}
    city.city=this.beeeCityName();city.colony=true;this.beeeKit(city,{vivres:60,bois:80,pierre:60,pieces:12});(B.conqCells??={})[city.id]=R.cells;const LV=this.beeeLevel();
    for(const u of this.beeeAvailable(city.i,city.j,500).slice(0,4+LV))this.beeeAssign(u,{kind:'build',b:city.id});
    B.founded=(B.founded||0)+1;B.conq=null;this.log('Front',`Au bout de la voie : les Bèè fondent ${city.city}, loin de tout, reliée par le rail.`,'warn');},
  // démarrer une conquête vers `site` : la ville du réseau la plus proche, sa voie (ou la capitale), le tracé, le prix
  beeeConquerStart(site,plan,base,cities){const B=this.s.beee,t=this.s.t;if(B.conq||this.beeeFull())return false;
    const live=cities.filter(c=>!c.fallen&&this.building(c.centre)?.done);const src=live.slice().sort((p,q)=>distance(p.x,p.y,site.i,site.j)-distance(q.x,q.y,site.i,site.j))[0];if(!src)return false;
    const hub=src.centre===base.id?[base.i-8,base.j-7]:src.railCells?.[0]||[Math.round(src.x-7),Math.round(src.y-7)];
    const a=[Math.round(site.i-5),Math.round(site.j-5)];const cells=this.railRoute(a[0],a[1],hub[0],hub[1]);if(!cells||cells.length<2)return false;
    if((plan.nat.bois||0)<cells.length*1.3+80||(plan.nat.pierre||0)<cells.length*.7+40)return false;
    this.planLine('beee','rail',cells);const name=this.beeeCityName();
    B.conq={site,cells,t0:t,name,pc:{id:'conq',name:'le front',x:a[0],y:a[1],railCells:cells,railPlanned:true}};
    this.log('Front',`Les Bèè tracent une voie de ${cells.length} cases vers ${name}, loin de leurs villes : le rail ira d'abord, la ville suivra.`,'warn');return true;},
  // Les colons partent avec leur équipement : le prix du centre est prélevé d'un coup sur le stock du pays (dans les dépôts qui en ont le plus) et versé
  // au chantier, au lieu d'être porté caisse par caisse sur des dizaines de cases (mesuré : 14 à 20 jours pour bâtir une ville). Faux si le pays n'a pas de quoi.
  beeeKit(b,extra=null){const need={...this.siteCost(b)},deps=this.s.buildings.filter(d=>d.f==='beee'&&!d.ruin&&d.done&&this.isDepot(d));
    // seulement le surplus : ce que les chantiers à moins de 30 cases d'un dépôt attendent encore y reste (mesuré : le kit vidait la capitale de sa pierre à
    // chaque fondation, sa manufacture restait à 76 % faute de 24 pierre, puis était abandonnée — les Bèè n'avaient plus aucune arme neuve en 23 jours)
    const sites=this.s.buildings.filter(s=>s.f==='beee'&&!s.done&&!s.ruin&&s!==b).map(s=>({s,r:this.siteRemaining(s)}));
    const held=new Map(deps.map(d=>{const o={};for(const {s,r} of sites)if(distance(s.i,s.j,d.i,d.j)<30)for(const [k,n] of Object.entries(r))o[k]=(o[k]||0)+n;return [d,o];}));
    const spare=(d,k)=>Math.max(0,(d.stock[k]||0)-(held.get(d)[k]||0));
    const have=k=>deps.reduce((a,d)=>a+spare(d,k),0);const want={...need};if(extra)for(const [k,n] of Object.entries(extra))want[k]=(want[k]||0)+n;
    if(Object.entries(want).some(([k,n])=>have(k)<n))return false;
    const pull=(k,n)=>{let left=n;for(const d of deps.slice().sort((p,q)=>spare(q,k)-spare(p,k))){const t=Math.min(left,spare(d,k));if(t>0){d.stock[k]-=t;left-=t;}if(left<=1e-6)break;}};
    for(const [k,n] of Object.entries(want))pull(k,n);b.paid??={};for(const [k,n] of Object.entries(need))b.paid[k]=n;
    if(extra){b.stock??={};for(const [k,n] of Object.entries(extra))b.stock[k]=(b.stock[k]||0)+n;}return true;},
  // le prix d'un centre de colonie (moitié du prix normal : les colons partent équipés), le même que celui du chantier (eco.js siteCost)
  colonyPrice(){return Object.fromEntries(Object.entries(BUILDINGS.centre.cost).map(([k,v])=>[k,Math.max(1,Math.round(v*(BEEE.colonyCost??1)))]));},
  beeeCityName(){const used=new Set([...this.s.beee.cities.map(c=>c.name),...this.beeeBuildings('centre').map(b=>b.city)]);const f=BEEE_CITIES.find(n=>!used.has(n));if(f)return f;
    for(let k=2;;k++)for(const n of BEEE_CITIES)if(!used.has(n+' '+k))return n+' '+k;},
  // ---------- l'intendance bèè ----------
  // L'état-major de l'économie. Il sait ce que le pays a et où (chaque ville, chaque dépôt), ce dont il aura besoin : de quoi
  // manger trois jours, les chantiers en cours, la ville qu'il compte fonder, les usines, l'armée (des fusils pour les recrues,
  // des munitions pour les soldats). Il remonte la chaîne : sans munitions il faut de la poudre, donc du salpêtre et du charbon,
  // donc du bois ; sans fusils, du fer et des pièces. Chaque manque vaut de 0 à 1 ; chaque poste de travail vaut ce que vaut
  // le manque qu'il comble.
  beeePlan(){const B=this.s.beee;const deps=this.s.buildings.filter(d=>d.f==='beee'&&this.isDepot(d));const nat={};for(const d of deps)for(const [k,v] of Object.entries(d.stock))nat[k]=(nat[k]||0)+Math.max(0,v);
    const us=this.s.units.filter(u=>u.f==='beee'&&u.hp>0);const pop=us.length,sold=us.filter(u=>u.k==='soldat').length,civ=us.length-sold;
    const site={};for(const b of this.beeeBuildings().filter(b=>!b.done))for(const [k,n] of Object.entries(this.siteRemaining(b)))site[k]=(site[k]||0)+n;
    const colonize=this.day>=(BEEE.colonyDay||9);const col=colonize?this.colonyPrice():{};
    // le rail vit de charbon : chaque gare en garde de quoi remplir les tenders (sans lui, plus rien ne va au-delà de 45 cases)
    const trains=this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='train').length;for(const g of this.beeeBuildings('gare').filter(g=>g.done)){g.want??={};g.want.charbon=Math.max(g.want.charbon||0,15+4*trains);g.prio=Math.max(g.prio||3,5);}
    const T={vivres:(civ*.12+sold*.2)*(BEEE.frugal||1)*24*3+60,bois:150+pop*.012*24*3+(site.bois||0)+(col.bois||0),pierre:110+(site.pierre||0)+(col.pierre||0),pieces:30+pop*.2+(site.pieces||0)+(col.pieces||0),charbon:40+sold*.5+trains*20+(site.charbon||0),salpetre:40+sold,poudre:40+(sold+Math.max(8,civ*.12))*1.5,fer:60+pop*.4+(site.fer||0),plomb:15,cuivre:15,
      // l'armement suit l'armée : des fusils pour les recrues à venir, des caisses de munitions pour la tenir au feu
    };
    // le stock de guerre : des armes de chaque sorte pour les recrues à venir, des cartouches pour ceux qui les portent, des protections
    {const share=[.32,.45,.62][Math.min(2,Math.floor(this.beeeLevel()/2))];const R=Math.max(8,Math.ceil(civ*.12),Math.ceil((civ+sold)*share-sold)),mix=this.beeeArmyMix();   /* (les armes suivent l'armée VOULUE, pas un petit stock : au jour 72 les usines n'avaient plus aucun ouvrier) */for(const w of this.beeeArms()){T['a:'+w]=Math.max(1,Math.ceil(R*DOCTRINE[w]));T['m:'+w]=Math.max(2,Math.ceil((mix[w]||0)*1.2+R*DOCTRINE[w]));}
      if(this.beeeStable())if(this.armorsOf?.('beee')?.some(a=>a.id==='bee_casque'))T['p:bee_casque']=Math.ceil(R*.9);if(this.beeeStable())if(this.armorsOf?.('beee')?.some(a=>a.id==='bee_plaque'))T['p:bee_plaque']=Math.ceil(R*.3);}
    {const AW=this.fortArmsWant?.()||{};for(const [w,n] of Object.entries(AW)){if(!n||!this.design(w))continue;const Wd=this.W(w);T['a:'+w]=Math.max(T['a:'+w]||0,Math.min(12,n));T['m:'+w]=Math.max(T['m:'+w]||0,Math.ceil(Math.min(12,n)*Wd.carry/Math.max(1,Wd.perCrate))+2);}}
    // la flotte d'assaut : ce que coûtent les bateaux qui manquent entre dans le plan (les ateliers font aussi leurs pièces — mesuré : chantiers ouverts à J21,
    // premier bateau à J30, faute de pièces prises par les armes)
    {const AR=this.amphiBeeReserve?.()||{};for(const [k,n] of Object.entries(AR))if(n>0)T[k]=(T[k]||0)+n;}
    {const mw=this.fortMineWant?.();if(mw){T.mine=mw;T.explosifs=Math.max(T.explosifs||14,14+mw);}}
    this.beeeHeavyPlan(T);   // l'escalade : des armes lourdes et leurs munitions, selon le niveau de la guerre
    const D={};for(const [k,n] of Object.entries(T))D[k]=Math.max(0,Math.min(1,(n-(nat[k]||0))/n));
    // ce que les usines attendent à leur dépôt : le pays en a peut-être ailleurs, mais là où il le faut il en manque — on continue à
    // en produire et le réseau le porte (des mines de fer arrêtées « faute de besoin » pendant que les manufactures attendaient du fer)
    const waiting=new Set();for(const b of this.beeeBuildings()){if(!b.done||!b.prod||!BUILDINGS[b.k].factory)continue;const R=this.recipe(b,b.prod),S=this.building(b.sup);if(!R||!S)continue;
      for(const [k,n] of Object.entries(R.in||{}))if((S.stock[k]||0)<n){waiting.add(k);if(T[k]!=null)D[k]=Math.max(D[k]||0,.35);}}
    // de même un chantier : ce qui lui reste à recevoir et que les dépôts à moins de 30 cases n'ont pas (la pierre dormait dans les colonies pendant que la
    // manufacture de la capitale attendait ses 24 dernières pierres — le pays « en avait assez », personne n'en cassait près d'elle)
    for(const b of this.beeeBuildings().filter(b=>!b.done&&b.k!=='centre'&&b.k!=='camp')){const H=this.have('beee',b.i+1,b.j+1,30);for(const [k,n] of Object.entries(this.siteRemaining(b)))if(n>0&&(H[k]||0)<n){waiting.add(k);if(T[k]!=null)D[k]=Math.max(D[k]||0,.5);}}
    // les vivres se jugent au flux : ce que les fermes tenues produisent contre ce que le peuple mange (et un peu de réserve)
    {const eat=us.reduce((a,u)=>a+(u.k==='villageois'?.12:.2),0)*(BEEE.frugal||1);const prod=this.beeeBuildings(FOOD).filter(f=>f.done).reduce((a,f)=>a+(f.yield??this.cropYield(f))*BUILDINGS[FOOD].makes.vivres*Math.min(BUILDINGS[FOOD].workers,this.workers(f).length),0);
      D.vivres=Math.max(Math.max(0,Math.min(1,(eat*1.15-prod)/Math.max(.5,eat*.5))),.85*Math.max(0,Math.min(1,(T.vivres-(nat.vivres||0))/T.vivres)));}
    // chaque ville : ce qu'elle mange, ce qu'elle a (son centre et ses dépôts), en jours de réserve
    const city=new Map();for(const c of B.cities.filter(c=>!c.fallen)){const ct=this.building(c.centre);if(!ct?.done)continue;const eatD=this.cityFoodRate(ct)*24;const have=this.have('beee',ct.i+1,ct.j+1,26).vivres||0;city.set(ct.id,{eatD,have,days:have/Math.max(1,eatD)});}
    // la chaîne : un manque en aval tire sur l'amont (sauf si l'amont déborde déjà)
    const CH={poudre:['salpetre','charbon'],pieces:['fer','bois'],charbon:['bois']};if(T.mine)CH.mine=['explosifs','fer','pieces'];if(T.explosifs)CH.explosifs=['salpetre'];for(const k of Object.keys(T)){if(k.startsWith('m:'))CH[k]=['poudre','fer','pieces','plomb','cuivre'];else if(k.startsWith('a:'))CH[k]=['fer','pieces','bois'];else if(k.startsWith('p:'))CH[k]=['fer','pieces'];}
    for(let r=0;r<3;r++)for(const [p,ins] of Object.entries(CH))for(const k of ins){const rich=(nat[k]||0)>T[k]*2;D[k]=Math.max(D[k]||0,(D[p]||0)*(rich?.15:.85));}
    // les fermes s'arrêtent quand leur dépôt a de quoi (sinon les vivres engorgent les centres des colonies, qui ne reçoivent plus rien)
    const overV=(nat.vivres||0)>T.vivres*2;for(const f of this.beeeBuildings(FOOD))f.limit=overV?600:0;
    // l'armement : le plafond d'une usine suit ce que l'armée réclame (pas un petit stock fixe)
    for(const b of this.beeeBuildings().filter(b=>b.done&&b.prod&&T[b.prod]!=null&&/^(a:|m:|poudre$|explosifs$)/.test(b.prod)))b.limit=Math.max(b.limit||0,Math.ceil(T[b.prod]*1.3));
    return B.plan={t:this.s.t,nat,T,D,pop,civ,sold,city,site,waiting};},
  // Les postes : fermes (manger passe avant tout), mines et camps, usines (qui valent presque zéro sans leurs matières), cueillette
  // du bois, de la pierre et des filons sans mine, chantiers. Les villageois vont d'abord aux postes vides les plus précieux ; un
  // villageois déjà occupé ne change que pour un vrai gain, après trois heures au moins au même poste, et pas plus de douze à la fois.
  beeeLabour(P){const t=this.s.t,D=P.D;
    // un dépôt à moins de 22 cases d'un arbre, d'un rocher, d'un filon ? les dépôts rangés par secteurs de 32 cases, une fois pour
    // l'heure : on ne regarde que les neuf secteurs voisins (la recherche triée de tous les dépôts, pour chaque arbre, faisait les à-coups)
    const DB=new Map();for(const d of this.depotList('beee')){const k=((d.j/32)|0)*4096+((d.i/32)|0);let a=DB.get(k);if(!a)DB.set(k,a=[]);a.push(d);}const DN=new Map();
    // les arbres, rochers et filons d'une ressource, listés une fois pour l'heure (on les triait tous pour chaque cueilleur placé)
    const GN={};const gatherNodes=res=>GN[res]??=this.s.nodes.filter(n=>n.left>1&&(n.res===res||res==='bois'&&n.type==='tree'||res==='pierre'&&n.type==='rock'));
    const depNear=n=>{let v=DN.get(n.id);if(v!=null)return v;v=false;const I=(n.i/32)|0,J=(n.j/32)|0;for(let dj=-1;dj<=1&&!v;dj++)for(let di=-1;di<=1&&!v;di++)for(const d of DB.get((J+dj)*4096+I+di)||[])if(this.distB(d,n.i,n.j)<=22){v=true;break;}DN.set(n.id,v);return v;};const civs=this.beeeCivilians().filter(u=>!u.inBarracks&&(!u.task||['work','gather','build','repair'].includes(u.task.kind)));
    const slots=[];const add=(key,val,cap,assign,near)=>{if(cap>0)slots.push({key,val,cap,assign,near,have:0,fails:0});};
    // ce qui déborde (trois fois le nécessaire) ne se ramasse plus : les bras vont ailleurs, les dépôts ne s'engorgent pas
    const over={};for(const k of Object.keys(P.T))over[k]=(P.nat[k]||0)>P.T[k]*3&&!P.waiting?.has(k);
    // le plafond se lit au dépôt de sortie (l'étiquette d'une usine sans ouvriers ne se met plus à jour : s'y fier la bloquerait pour de bon)
    const capped=b=>{const o=this.building(b.out);return b.limit>0&&!!o&&(o.stock[b.prod||'vivres']||0)>=b.limit;},jam=b=>{const o=this.building(b.out);return !!o&&this.room(o)<5;};
    const outOf=b=>{const P0=PRODUCTS[b.prod];return b.prod?.startsWith('m:')||b.prod?.startsWith('a:')?b.prod:P0?Object.keys(P0.out)[0]:null;};
    const fed=b=>{const R=this.recipe(b,b.prod);if(!R)return false;const H=this.have('beee',b.i+1,b.j+1);return Object.entries(R.in||{}).every(([k,n])=>(H[k]||0)>=n);};
    // les chantiers qui attendent du bois ou de la pierre : le camp de leur ville travaille davantage
    const siteWait=this.s.buildings.filter(b=>b.f==='beee'&&!b.done&&!b.ruin&&/bois|pierre/.test(b.why||''));
    for(const b of this.beeeBuildings().filter(b=>b.done&&BUILDINGS[b.k].workers)){const k=b.k,go=u=>this.beeeAssign(u,{kind:'work',b:b.id}),at=[b.i+1,b.j+1];
      if(k===FOOD){if(!capped(b)){const ct=this.cityOf(b),C=ct&&P.city?.get(ct.id);const loc=C?Math.max(0,Math.min(1,1-C.days/2.5)):0;const d=Math.max(D.vivres||0,loc);
        add('w'+b.id,.45+1.2*d*Math.min(1.3,b.yield??this.cropYield(b)),d>.1?BUILDINGS[FOOD].workers:Math.min(2,BUILDINGS[FOOD].workers),go,at);}}
      else if(k==='mine'){const n=this.s.nodes[b.ore];if(n&&n.left>0&&!jam(b)&&!over[n.res])add('w'+b.id,.15+1.1*(D[n.res]||0),BUILDINGS.mine.workers,go,at);}
      else if(k==='camp'){if(this.room(b)>60&&!(over.bois&&over.pierre)){const local=siteWait.some(s=>distance(s.i,s.j,b.i,b.j)<30);const dd=Math.max(D.bois||0,D.pierre||0,local?.6:0);add('w'+b.id,.18+.6*dd,dd>.3?3:1,go,at);}}
      else if(BUILDINGS[k].factory&&b.prod&&!(b.sabUntil>t)&&!capped(b)){const o=outOf(b);add('w'+b.id,fed(b)?.12+1.1*(D[o]??.3):.1+.9*(D[o]??.3),fed(b)?Math.min(2,BUILDINGS[k].workers):1,go,at);   /* (sans sa matière : un ouvrier qui va la chercher) */}}
    // la cueillette : le bois et la pierre toujours un peu ; un filon sans mine, à la main, s'il manque
    const ore=r=>(D[r]||0)>.3?2+Math.floor(P.civ/25):1;const caps={bois:(D.bois||0)>.05?2+Math.floor(P.civ/7):1,pierre:(D.pierre||0)>.05?2+Math.floor(P.civ/10):1,fer:ore('fer'),salpetre:ore('salpetre'),charbon:1,plomb:ore('plomb'),cuivre:ore('cuivre')};
    for(const res of Object.keys(caps)){if(over[res])continue;const base=res==='bois'||res==='pierre';const v=(base?.15:.05)+(D[res]||0)*(base?1:.6);
      add('g:'+res,v,caps[res],u=>{let node=null,bd=120;for(const n of gatherNodes(res)){const d=distance(n.i,n.j,u.x,u.y);if(d<bd&&depNear(n)){bd=d;node=n;}}
        if(!node)return false;this.beeeAssign(u,{kind:'gather',node:node.id,type:node.type,res:node.res||NODES[node.type].res});},null);}
    // les chantiers : deux bâtisseurs (trois pour une ville) ; une ferme quand on a faim, une ville, une caserne passent devant
    const full=c=>{const st=c?this.cityStats(c):null;return st&&st.cap-st.res<3;};
    for(const b of this.beeeBuildings().filter(b=>!b.done)){const pr={centre:.35,[FOOD]:.25*(1+(D.vivres||0)),caserne:.15,poudrerie:.1+.2*(D.poudre||0),arsenal:.15,maison:full(this.cityOf(b))?.4:.15,mine:.2,gare:.12,manufacture:.12}[b.k]||.08;
      add('s'+b.id,.75+pr,b.k==='centre'?3:2,u=>this.beeeAssign(u,{kind:'build',b:b.id}),[b.i+1,b.j+1]);}
    // les ruines : un jour de calme, et des bâtisseurs les relèvent (les matériaux sont déjà là) ; une ville tombée d'abord
    const calm=b=>!this.near(b.i+1,b.j+1,20,e=>e.f==='meumeu'&&e.hp>0&&e.h?.state!=='hors');
    for(const b of this.s.buildings){if(b.f!=='beee'||!b.ruin)continue;b.ruinT??=t;if(!calm(b)){b.ruinT=t;continue;}if(t-b.ruinT<12)continue;add('s'+b.id,b.k==='centre'?1.3:.9,b.k==='centre'?4:2,u=>this.beeeAssign(u,{kind:'build',b:b.id}),[b.i+1,b.j+1]);}
    // les réparations : un bâtiment abîmé (ou qui brûle) au calme
    for(const b of this.beeeBuildings()){if(!b.done||!(b.hp<b.max*.8||b.fire>0)||!calm(b))continue;add('r'+b.id,b.fire>0?1.4:.85,b.fire>0?4:2,u=>this.beeeAssign(u,{kind:'repair',b:b.id}),[b.i+1,b.j+1]);}
    // qui occupe quoi
    const keyOf=u=>{const T0=u.task;if(!T0)return null;if(T0.kind==='work')return 'w'+T0.b;if(T0.kind==='build')return 's'+T0.b;if(T0.kind==='repair')return 'r'+T0.b;if(T0.kind==='gather')return 'g:'+T0.res;return null;};
    const byKey=new Map(slots.map(s=>[s.key,s]));const cur=new Map();
    for(const u of civs){const s0=byKey.get(keyOf(u));if(s0&&s0.have<s0.cap){s0.have++;cur.set(u,s0.val);u.jobVal=s0.val;}else{cur.set(u,0);u.jobVal=0;}}
    const rk=new Map(civs.map(u=>[u,this.rand()]));const pool=civs.slice().sort((a,z)=>cur.get(a)-cur.get(z)||rk.get(a)-rk.get(z));let moves=0;
    for(const s0 of slots.sort((a,z)=>z.val-a.val)){while(s0.have<s0.cap&&moves<12){let best=null,bs=-1e9;
        for(const u of pool.slice(0,50)){const cv=cur.get(u);if(cv>0&&(cv>=s0.val-.25||t-(u.jobT??-99)<3)||cv===0&&s0.val<.05)continue;const d=s0.near?distance(u.x,u.y,s0.near[0],s0.near[1]):0;if(d>160)continue;const sc=(s0.val-cv)-d/250;if(sc>bs){bs=sc;best=u;}}
        if(!best)break;const was=cur.get(best);const r=s0.assign(best);pool.splice(pool.indexOf(best),1);if(r===false){pool.push(best);if(++s0.fails>3)break;continue;}best.jobT=t;best.jobVal=s0.val;s0.have++;if(was>0)moves++;cur.set(best,s0.val);}}   // seuls les changements de poste comptent : un sans-emploi est placé tout de suite
    // Personne à ne rien faire : un villageois qu'aucun poste n'attend aide le chantier le plus proche, sinon ramasse ce qui manque
    // le plus (le bois, la pierre, un filon) près d'un dépôt — quarante par heure au plus
    {const idle=civs.filter(u=>!u.task).slice(0,40);if(idle.length){const sites=this.beeeBuildings().filter(b=>!b.done);
      const order=['bois','pierre','fer','charbon','salpetre','plomb','cuivre'].sort((a,z)=>(D[z]||0)-(D[a]||0));const pools={};
      const nodesOf=res=>pools[res]??=this.s.nodes.filter(n=>n.left>1&&(n.res===res||res==='bois'&&n.type==='tree'||res==='pierre'&&n.type==='rock'));
      for(const u of idle){const s=sites.filter(b=>distance(b.i,b.j,u.x,u.y)<60).sort((a,z)=>distance(a.i,a.j,u.x,u.y)-distance(z.i,z.j,u.x,u.y))[0];
        if(s&&this.rand()<.6){this.beeeAssign(u,{kind:'build',b:s.id});u.jobVal=.1;continue;}
        for(const res of order){let node=null,bd=60;for(const n of nodesOf(res)){const d=distance(n.i,n.j,u.x,u.y);if(d<bd&&depNear(n)){bd=d;node=n;}}
          if(node){this.beeeAssign(u,{kind:'gather',node:node.id,type:node.type,res:node.res||NODES[node.type].res});u.jobVal=.05;break;}}}}}
    P.slots=slots.map(s=>({key:s.key,val:+s.val.toFixed(2),have:s.have,cap:s.cap}));},
  // Les porteurs : autant que la logistique en réclame (les manques qu'aucun convoi ne sert), jamais plus d'un villageois sur cinq ;
  // un porteur sans travail redevient villageois quand il y en a trop.
  beeeTrains(){const gares=this.beeeBuildings('gare').filter(g=>g.done&&this.netOf(g)!=null);const trains=this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='train').length;
    if(gares.length<2||trains>=Math.ceil(gares.length/2)||gares.some(g=>g.queue?.length))return;const g=gares[Math.floor(this.rand()*gares.length)];const r=this.train(g,'train');
    if(!r.ok){g.want??={};for(const [k,n] of Object.entries(VEHICLES.train.cost))g.want[k]=Math.max(g.want[k]||0,n);g.prio=Math.max(g.prio||3,4);}},
  beeePorters(P){const V=this.s.vehicles.filter(v=>v.f==='beee'&&v.k==='porteur');const cities=this.s.beee.cities.filter(c=>!c.fallen);
    const M=this.marketC('beee');const need=M.deps.map(d=>({d,n:this.deficits(M,d).reduce((a,it)=>a+it.n,0)}));const unmet=need.reduce((a,o)=>a+o.n,0);
    const want=Math.max(1,Math.min(Math.floor(P.civ/4),Math.ceil(unmet/60),3+4*cities.length));P.porters={have:V.length,want,unmet:Math.round(unmet)};
    // jusqu'à trois de plus par heure, chacun au dépôt qui manque le plus pour les porteurs qu'il a déjà (pas tous au même endroit)
    if(V.length<want){const base=new Map();for(const v of V){const b=v.base??v.home;base.set(b,(base.get(b)||0)+1);}
      for(let q=0;q<Math.min(3,want-V.length);q++){const D=need.filter(o=>o.d.done&&o.n>1).sort((a,z)=>z.n/(1+(base.get(z.d.id)||0))-a.n/(1+(base.get(a.d.id)||0)))[0]?.d;if(!D)break;const val=Math.min(.9,.25+unmet/600);
        const u=this.beeeCivilians().filter(u=>!u.inBarracks&&(!u.task||['work','gather','build'].includes(u.task.kind))&&(u.jobVal||0)<val&&distance(u.x,u.y,D.i,D.j)<60).sort((a,z)=>(a.jobVal||0)-(z.jobVal||0))[0];
        if(!u)break;u.task=null;u.path=null;if(u.carry){const dd=this.dropAt(u);if(dd){this.put(dd,u.carry.k,u.carry.n);u.carry=null;}}const r=this.addPorters(D,1);if(r?.ok===false)break;base.set(D.id,(base.get(D.id)||0)+1);}}
    else if(V.length>want+1){const v=V.find(v=>!v.job&&!Object.keys(v.cargo).length);if(v)this.releasePorter(v);}},
  // Bâtir l'usine là où sont ses matières : un tas de salpêtre loin de toute poudrerie en appelle une sur place ; du fer, un atelier ;
  // de la poudre, un arsenal. Plutôt que d'attendre des convois qui ne viennent pas.
  beeeSiting(P){const D=P.D,cities=this.s.beee.cities.filter(c=>!c.fallen);const why=P.siting=[];
    if(!this.beeeBuildings().some(b=>!b.done&&(b.k==='grenier'||b.k==='entrepot'))){const full=this.s.buildings.find(d=>d.f==='beee'&&this.isDepot(d)&&d.done&&!BUILDINGS[d.k].hub&&this.stored(d)>BUILDINGS[d.k].store*.9);
      if(full){const food=(full.stock.vivres||0)>this.stored(full)*.5;const k=food?'grenier':'entrepot';if(!this.beeeBuildings(k).some(e=>this.distB(e,full.i,full.j)<12)&&Object.entries(BUILDINGS[k].cost).every(([r,n])=>(P.nat[r]||0)>=n)&&this.beeeBuild(k,full.i+4,full.j+3,10)){why.push(`${k} bâti : ${full.k} plein`);return;}}}
    if(!this.beeeBuildings('entrepot').some(b=>!b.done)){const jam=this.beeeBuildings().find(b=>b.done&&(b.k==='mine'||b.k===FOOD||BUILDINGS[b.k].factory)&&/plein/.test(b.why||''));const J=jam&&this.building(jam.out);
      if(J&&!this.beeeBuildings('entrepot').some(e=>this.distB(e,J.i,J.j)<14)&&(P.nat.bois||0)>=BUILDINGS.entrepot.cost.bois){this.beeeBuild('entrepot',J.i+4,J.j+3,10);return;}}
    // la pénurie locale : une usine précieuse qui attend une matière que le pays a, mais ailleurs — on bâtit sur place ce qui la
    // produit (un four si le bois est là), sinon on passe la commande en priorité aux convois
    const MAKER={charbon:['four','bois'],pieces:['atelier','fer'],poudre:['poudrerie','salpetre']};
    for(const b of this.beeeBuildings().filter(b=>b.done&&BUILDINGS[b.k].factory&&b.prod)){const R=this.recipe(b,b.prod);if(!R)continue;const o=b.prod.includes(':')?b.prod:Object.keys(R.out)[0];if((D[o]||0)<.5)continue;
      const H=this.have('beee',b.i+1,b.j+1);const need={...R.in};const cr=this.coalRate?.(b)||0;if(cr>0)need.charbon=(need.charbon||0)+cr*4;
      for(const [k,n] of Object.entries(need)){if((H[k]||0)>=n)continue;const M=MAKER[k];
        if(M&&!this.beeeBuildings(M[0]).some(x=>distance(x.i,x.j,b.i,b.j)<20)&&(H[M[1]]||0)>=30&&!this.beeeBuildings().some(x=>!x.done&&x.k===M[0])&&Object.entries(BUILDINGS[M[0]].cost).every(([r,q])=>(P.nat[r]||0)>=q)){if(this.beeeBuild(M[0],b.i-3,b.j+3,10)){why.push(`${M[0]} bâti près de ${b.k} (manque ${k})`);return;}}
        const S=this.building(b.sup);if(S&&this.isDepot(S)){S.want??={};S.want[k]=Math.max(S.want[k]||0,Math.ceil(n*6));S.prio=5;}}}{const pend=this.beeeBuildings().find(b=>!b.done&&['poudrerie','atelier','arsenal','four'].includes(b.k));if(pend){why.push(`chantier ${pend.k} ${Math.round(pend.progress*100)}% ${pend.why||''}`);return;}}
    // le dépôt (ville, camp minier, gare) où dort le plus de la matière : c'est là qu'on bâtit
    const deps=this.s.buildings.filter(d=>d.f==='beee'&&this.isDepot(d)&&d.done);
    for(const [k,inp,out,min] of [['poudrerie','salpetre','poudre',50],['four','bois','charbon',150],['atelier','fer','pieces',25],['arsenal','poudre','m:bee_fusil',20]]){if((D[out]||0)<.35){why.push(k+' : pas de manque');continue;}
      const top=deps.map(d=>({d,n:this.have('beee',d.i+1,d.j+1)[inp]||0})).sort((a,z)=>z.n-a.n)[0];if(!top||top.n<min){why.push(k+' : pas assez de '+inp);continue;}const c={c:{x:top.d.i+1,y:top.d.j+1}};
      // une deuxième usine du même genre au même endroit, si le manque est criant et que celles qui existent tournent à plein
      const here=this.beeeBuildings(k).filter(b=>distance(b.i,b.j,c.c.x,c.c.y)<20);const full=this.beeeBuildings(k).every(b=>b.done&&this.workers(b).length>=2);
      if(here.length>=((D[out]||0)>.7&&full?2:1)||this.beeeBuildings(k).length>=cities.length+2){why.push(`${k} : déjà ${here.length} ici (${here.map(b=>(b.done?'':'chantier ')+this.workers(b).length+' ouvriers '+(b.why||'')).join(' / ')})`);continue;}
      if(Object.entries(BUILDINGS[k].cost).some(([r,n])=>(P.nat[r]||0)<n)){why.push(k+' : coût');continue;}why.push(k+' : on bâtit');
      if(this.beeeBuild(k,c.c.x+6,c.c.y+4,14)){this.s.beee.sited=(this.s.beee.sited||0)+1;return;}}},
  beeeRecruit(c){const barracks=this.beeeBuildings('caserne').find(b=>b.done&&this.distB(b,c.x,c.y)<28);if(!barracks)return;const nC=this.s.beee.cities.filter(c=>!c.fallen).length;
    const soldiers=this.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&live(u)).length;
    const inside=barracks.inside?.length||0,civ=this.beeeCivilians().length;
    const idle=this.beeeCivilians().filter(u=>!u.task).length;// la part de soldats suit l'escalade : au début, surtout des civils (bâtisseurs, cueilleurs : l'expansion en dépend), puis l'armée grossit (mesuré : 8 villes au jour 24 avec 40-60 % de soldats, 11 avec 22 %)
    const armed=[.32,.45,.62][Math.min(2,Math.floor(this.beeeLevel()/2))]+(idle>civ*.12?.1:0);
    const waiting=(barracks.inside||[]).filter(u=>(u.drillT||0)>=8).length;   // des recrues formées attendent une arme : on n'en appelle pas d'autres
    const famine=(this.s.beee.hunger||0)>1.1&&(this.s.beee.plan?.nat?.vivres||0)<(this.s.beee.plan?.T?.vivres||60)/3;   // pas d'enrôlement pendant la famine
    if(!famine&&inside<14&&waiting<6&&soldiers+inside<Math.min(BEEE.cap+55*(nC-1),Math.floor((civ+soldiers+inside)*armed)+1)&&civ>12){
      for(const u of this.beeeAvailable(barracks.i,barracks.j,35).slice(0,3))this.beeeAssign(u,{kind:'enlist',b:barracks.id});}
    // formation courte (une demi-journée) : ils sortent vite, nombreux, moins bien formés que nos soldats
    // des recrues formées attendent leurs armes : la caserne ajoute leur besoin (les armes de la doctrine, une caisse de cartouches
    // chacune, des casques) à la commande de son centre, pour dix heures — porteurs et trains les apportent (voir beeeArmWants)
    {const wait=(barracks.inside||[]).filter(u=>(u.drillT||0)>=8).length;if(wait>0){const nat=this.s.beee.plan?.nat||{};const mix=this.beeeArmyMix();const got={};const need={};
      // (douze : mesuré, 6 à 19 recrues formées attendaient par caserne pendant que 300 à 550 fusils dormaient aux manufactures)
      for(let q=0;q<Math.min(12,wait);q++){const avail={};for(const w of this.beeeArms())avail['a:'+w]=(nat['a:'+w]||0)-(need['a:'+w]||0),avail['m:'+w]=(nat['m:'+w]||0)-(need['m:'+w]||0);const w=this.beeeNextArm(avail,{...mix,...got});if(!w)break;
        need['a:'+w]=(need['a:'+w]||0)+1;need['m:'+w]=(need['m:'+w]||0)+1;got[w]=(got[w]||0)+1;if((nat['p:bee_casque']||0)>(need['p:bee_casque']||0)+1)need['p:bee_casque']=(need['p:bee_casque']||0)+1;}
      if(Object.keys(need).length)barracks.armNeed={need,t:this.s.t};
      // les armes existent ailleurs dans le pays mais ne venaient pas (mesuré, jour 72 : 26 recrues formées attendaient, 22 fusils et 59 caisses dormaient dans
      // d'autres dépôts, aucun porteur ne les menait) : la caserne fait venir ce qui manque des dépôts à 160 cases, toutes les trois heures
      if(Object.keys(need).length&&this.s.t-(barracks.pullT??-99)>=3){barracks.pullT=this.s.t;const bx=barracks.i+1,by=barracks.j+1;const here=this.have('beee',bx,by);const D0=this.depots('beee',bx,by).find(d=>!BUILDINGS[d.k].foodOnly);
        if(D0)for(const [k,n] of Object.entries(need)){const miss=Math.max(0,n-(here[k]||0));if(miss<=0)continue;const got=this.take('beee',bx,by,k,miss,160);if(got>0)this.put(D0,k,got);}}}}
    // chacun sort avec l'arme qui manque le plus à l'armée ; un casque, et un plastron pour l'assaut
    const ready=(barracks.inside||[]).filter(u=>(u.drillT||0)>=8);let outN=0;const mix=this.beeeArmyMix();
    for(const u of ready.slice(0,8)){const H=this.have('beee',barracks.i+1,barracks.j+1);const w=this.beeeNextArm(H,mix);if(!w)break;
      const armor=ASSAULT.has(w)&&(H['p:bee_plaque']||0)>=1?'bee_plaque':(H['p:bee_casque']||0)>=1?'bee_casque':null;const r=this.releaseRecruits(barracks,1,'soldat',w,armor,[u.id]);if(!r.ok)break;outN++;mix[w]=(mix[w]||0)+1;}
    {const out={ok:outN>0};
      if(out.ok)for(const u of this.s.units.filter(u=>u.f==='beee'&&u.k==='soldat'&&u.city==null&&!u.band&&!u.head&&!u.stage&&u.amphi==null)){   /* (V12.5 : pas ceux d'une tête de pont, d'un assaut ou du port) */
        u.city=c.id;u.home=c.centre;u.task={kind:'guard',tx:c.x+3+(this.rand()-.5)*7,ty:c.y+3+(this.rand()-.5)*7};}}},
  beeeExpand(c){const base=this.building(c.centre);if(!base)return;
    // la ressource qui manque d'abord (le fer sans lequel ni pièces ni fusils), puis la plus proche ; un filon raté est mis de côté deux jours
    const st=this.have('beee',base.i+1,base.j+1);const need={fer:(st.fer||0)<40?3:1,charbon:(st.charbon||0)<30?2:1,salpetre:(st.poudre||0)<20&&(st.salpetre||0)<20?5:(st.salpetre||0)<20?2:1,plomb:(st.plomb||0)<20?2:1,cuivre:(st.cuivre||0)<20?1.5:1};
    // et le manque du pays, tel que le plan le mesure (mesuré : cuivre à 3 pour 15 voulus pendant vingt jours, aucune mine de cuivre — le seul stock local comptait)
    {const D=this.s.beee.plan?.D||{};for(const r of Object.keys(need))need[r]=Math.max(need[r],1+4*(D[r]||0));}
    const target=['fer','salpetre','charbon','cuivre','plomb'].map(res=>this.beeeOre(res,c)).filter(n=>n&&!(n.beeeFail>this.s.t))
      .sort((a,b)=>distance(a.i,a.j,c.x,c.y)/need[a.res]-distance(b.i,b.j,c.x,c.y)/need[b.res])[0];
    if(!target)return;
    const nearest=this.depots('beee',target.i,target.j,this.N).filter(d=>d.k==='camp'||d.k==='centre')[0];if(!nearest)return;
    const [sx,sy]=this.bc(nearest),dx=target.i-sx,dy=target.j-sy,L=Math.hypot(dx,dy);
    if(L<9){if(!this.beeeBuildings('mine').some(b=>b.ore===target.id||!b.done)&&this.beeeBuildings('mine').length<4+2*this.s.beee.cities.filter(c=>!c.fallen).length){
      const mine=this.beeeBuild('mine',target.i,target.j,2);if(mine)mine.ore=target.id;else target.beeeFail=this.s.t+48;}return;}
    if(this.beeeBuildings('camp').length>=4+3*this.s.beee.cities.filter(c=>!c.fallen).length)return;
    const step=Math.min(14,L-5),x=sx+dx/L*step,y=sy+dy/L*step;
    const camp=this.beeeBuild('camp',x,y,6);if(!camp)target.beeeFail=this.s.t+48;if(camp){camp.prio=4;camp.want={bois:70,pierre:50,pieces:10,vivres:25};}},
};
