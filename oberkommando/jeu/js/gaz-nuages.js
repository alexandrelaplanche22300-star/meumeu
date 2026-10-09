// (V12.9) LA GUERRE CHIMIQUE — les nuages : le vent, le temps, la diffusion, la décroissance, le dépôt et la réévaporation, les points bas,
// les obus à gaz, la fuite des Bèè. Mécanique de jeu FICTIVE : agents inventés, nombres de réglage (unités de jeu). Conception : docs/GUERRE-CHIMIQUE.md §3.
// Mixin sur World (après GAZ) : gasCloudTick(dt) — appelé par gasTick (gaz.js) ; gasShell(x,y,E,o) — appelé par heBlast (world.js).
// Unités : dt en heures de jeu ; une cellule = GAS_CELL × GAS_CELL cases ; C en « unités de concentration » (1 : on le sent ; 5 : dangereux ; 20 : mortel vite).
import {AGENTS,GAS_CELL} from './gaz.js';
import {CRATE_KG} from './ballistics.js';

// Les réglages du nuage (tous de jeu)
export const NUAGE={
  STEP:.05,          // h : le pas du nuage (le calcul tourne par pas fixes, quel que soit le rythme du jeu)
  MIN:.02,           // en dessous, la cellule est vidée (plus rien de sensible)
  DIFF:.9,           // part diffusée par heure pour un agent qui monte (densité 0) ; ×(1 − 0,8·densité)
  DRIFT_DENSE:.55,   // un agent dense (1) ne suit le vent qu'à 45 % de sa force (il rampe)
  POOL:.8,           // par heure : la part d'un agent dense qui glisse vers la cellule voisine la plus basse
  LOW_MAX:2,         // un point bas (cratère, tranchée) retient jusqu'à ×2
  REEVAP:.04,        // par heure : la part du dépôt qui remonte dans l'air (×2 par temps chaud, ×0,2 sous la pluie)
  PER_CRATE:2,       // unités de concentration·cellule apportées par caisse d'agent (× AGENTS.pot)
  SMALL_CAL:18,      // mm : en dessous, un obus ne fait qu'une bouffée locale
  PUFF:.15,          // la part d'agent d'une bouffée (petit calibre)
  PUFF_FAST:3,       // la bouffée se dissipe trois fois plus vite
  WIND_TURN:.35,     // rad/√h : le vent tourne lentement (marche au hasard)
  WIND_MIN:1.5,WIND_MAX:14,   // cases/h
  NIGHT_K:.35,       // la nuit, le vent tombe : le gaz stagne
  METEO_H:[8,20],    // le temps change toutes les 8 à 20 h
  FLEE_C:.6,         // les Bèè fuient un nuage au-delà de cette concentration (vers l'amont du vent)
};
// Le temps : facteurs sur la demi-vie dans l'air (hl), au sol (sol), le dépôt (dep), la réévaporation (ev), le vent (v)
export const METEO={
  sec:{name:'temps sec',hl:1,sol:1,dep:1,ev:1,v:1},
  chaud:{name:'chaleur',hl:.5,sol:.5,dep:.8,ev:2,v:.8},
  pluie:{name:'pluie',hl:.6,sol:1.4,dep:2.5,ev:.2,v:1.2},
};

export const GAZ_NUAGES={
  // le pas des nuages : par tranches fixes de NUAGE.STEP heures
  gasCloudTick(dt){const g=this.s.gas;if(!g)return;g.acc=(g.acc||0)+dt;let n=0;
    while(g.acc>=NUAGE.STEP&&n<8){g.acc-=NUAGE.STEP;n++;this.gasWeather(NUAGE.STEP);this.gasStep(NUAGE.STEP);}
    if(g.acc>NUAGE.STEP*8)g.acc=0;   // (jeu accéléré : on ne court pas après le retard)
    if(n)this.gasBeeeFlee();},
  // le vent tourne, tombe la nuit ; le temps change
  gasWeather(h){const g=this.s.gas,w=g.wind;w.a+=(this.rand()*2-1)*NUAGE.WIND_TURN*Math.sqrt(h)*2;
    w.base??=w.v;w.base=Math.max(NUAGE.WIND_MIN,Math.min(NUAGE.WIND_MAX,w.base+(this.rand()*2-1)*1.5*Math.sqrt(h)));
    w.v=w.base*(this.isNight?.()?NUAGE.NIGHT_K:1)*(METEO[g.meteo]||METEO.sec).v;
    g.meteoT??=this.s.t+NUAGE.METEO_H[0];if(this.s.t>=g.meteoT){const r=this.rand();g.meteo=r<.55?'sec':r<.8?'chaud':'pluie';g.meteoT=this.s.t+NUAGE.METEO_H[0]+this.rand()*(NUAGE.METEO_H[1]-NUAGE.METEO_H[0]);}},
  // la profondeur d'une cellule : les cratères et les tranchées (sacs) de ses cases — 0 (plat) à 1 (tout en creux)
  gasLow(key){const L=this._gasLow??=new Map();let v=L.get(key);if(v!=null)return v;
    const NC=this.gasNC(),ci=key%NC,cj=(key-ci)/NC,N=this.N;let s=0,n=0;
    for(let j=cj*GAS_CELL;j<Math.min(N,(cj+1)*GAS_CELL);j++)for(let i=ci*GAS_CELL;i<Math.min(N,(ci+1)*GAS_CELL);i++){const k=j*N+i;n++;s+=Math.min(1,(this.crater?.[k]||0))*.8+(this.s.sacs?.[k]?.b?1:0);}
    v=n?Math.min(1,s/n):0;L.set(key,v);return v;},
  // un pas : décroissance, dépôt, réévaporation, vent, diffusion, points bas — la grille est commune, deux nuages qui se recouvrent s'additionnent
  gasStep(h){const g=this.s.gas,NC=this.gasNC(),M=METEO[g.meteo]||METEO.sec,W=g.wind;g.fast??={};this._gasLow=new Map();   // (les creux changent : obus, tranchées)
    const wx=Math.cos(W.a)*W.v/GAS_CELL*h,wy=Math.sin(W.a)*W.v/GAS_CELL*h;   // en cellules pendant le pas
    const next={};const add=(k,a,c)=>{if(!(c>0))return;const o=next[k]??={};o[a]=(o[a]||0)+c;};
    const inside=(i,j)=>i>=0&&j>=0&&i<NC&&j<NC;
    for(const ks in g.air){const k=+ks,cell=g.air[ks],ci=k%NC,cj=(k-ci)/NC;const fast=(g.fast[ks]||0)>this.s.t?NUAGE.PUFF_FAST:1;
      for(const a in cell){let C=cell[a];const A=AGENTS[a];if(!A||!(C>0))continue;
        // décroissance (½-vie dans l'air, selon le temps ; une bouffée de petit calibre trois fois plus vite)
        C*=Math.pow(.5,h*fast/Math.max(.05,A.vol*M.hl));
        // dépôt : un agent persistant tombe au sol (la pluie le rabat)
        if(A.sol>0&&A.dep>0){const d=C*Math.min(.9,A.dep*M.dep*h);C-=d;const sc=g.sol[ks]??={};sc[a]=(sc[a]||0)+d;}
        // le vent : un agent dense rampe et le suit moins ; il glisse aussi vers un point bas voisin
        const kd=1-NUAGE.DRIFT_DENSE*A.dens;let fx=wx*kd,fy=wy*kd;const low=this.gasLow(k);fx*=1-.6*low*A.dens;fy*=1-.6*low*A.dens;
        const mx=Math.min(.95,Math.abs(fx)),my=Math.min(.95,Math.abs(fy));const sx=Math.sign(fx),sy=Math.sign(fy);
        const pX=mx*(1-my),pY=my*(1-mx),pXY=mx*my;let stay=1-pX-pY-pXY;
        // la diffusion : un agent léger s'étale plus vite (il se dilue d'autant)
        const df=Math.min(.6,NUAGE.DIFF*(1-.8*A.dens)*h);stay-=df;
        // les points bas : un agent dense glisse vers la voisine plus creuse (et un creux retient : moins de diffusion vers le plat)
        let poolK=-1,poolP=0;if(A.dens>.45){let best=low;for(const [di,dj] of NB4){const i=ci+di,j=cj+dj;if(!inside(i,j))continue;const l=this.gasLow(j*NC+i);if(l>best+.05){best=l;poolK=j*NC+i;}}
          if(poolK>=0){poolP=Math.min(.5,NUAGE.POOL*A.dens*(best-low)*h);stay-=poolP;}}
        const put=(i,j,p)=>{if(p<=0)return;if(inside(i,j))add(j*NC+i,a,C*p);};   // hors de la carte : perdu
        add(k,a,C*Math.max(0,stay));put(ci+sx,cj,pX);put(ci,cj+sy,pY);put(ci+sx,cj+sy,pXY);
        for(const [di,dj] of NB4){const i=ci+di,j=cj+dj;const l=inside(i,j)?this.gasLow(j*NC+i):0;put(i,j,df/4*(low>l+.05&&A.dens>.45?.4:1));}
        if(poolK>=0)add(poolK,a,C*poolP);}}
    // le sol : la flaque se dégrade lentement et remonte dans l'air (persistance, interdiction du terrain)
    for(const ks in g.sol){const cell=g.sol[ks];for(const a in cell){const A=AGENTS[a];let S=cell[a];if(!A||!(S>0)){delete cell[a];continue;}
        S*=Math.pow(.5,h/Math.max(.1,A.sol*M.sol));const ev=S*Math.min(.5,NUAGE.REEVAP*M.ev*h);S-=ev;add(+ks,a,ev);if(S<NUAGE.MIN)delete cell[a];else cell[a]=S;}
      if(!Object.keys(cell).length)delete g.sol[ks];}
    // le ménage : les traces trop faibles disparaissent
    for(const ks in next){const cell=next[ks];let any=false;for(const a in cell){if(cell[a]<NUAGE.MIN)delete cell[a];else any=true;}if(!any)delete next[ks];}
    g.air=next;for(const ks in g.fast)if(g.fast[ks]<=this.s.t)delete g.fast[ks];},
  // la concentration ressentie dans une case : la cellule, majorée dans un creux pour un agent dense (jusqu'à ×LOW_MAX)
  gasFeel(x,y){const C=this.gasAt(x,y);const N=this.N,k=Math.floor(y)*N+Math.floor(x);const low=Math.min(1,(this.crater?.[k]||0)*.8+(this.s.sacs?.[k]?.b?1:0));if(!low)return C;
    const o={};for(const a in C)o[a]=C[a]*(1+(NUAGE.LOW_MAX-1)*low*(AGENTS[a]?.dens||0));return o;},
  // le total d'une cellule, et l'agent dominant (pour l'affichage et les Bèè)
  gasSum(C){let t=0,top=null,m=0;for(const a in C){t+=C[a];if(C[a]>m){m=C[a];top=a;}}return {t,top};},
  // UN OBUS À GAZ (appelé par heBlast quand le chargement a un agent) : à partir de 18 mm, un vrai nuage, masse ∝ chargement, rayon ∝ ∛masse ;
  // en dessous, une bouffée locale qui se dissipe trois fois plus vite.
  gasShell(x,y,E,o={}){const F=E.fill;const a=F?.gas;if(!a||!AGENTS[a])return;const Wo=o.w&&this.W(o.w);const cal=Wo?.p?.d||o.cal||0;
    const crates=Math.max(.02,(E.g||100)/1000/CRATE_KG);let amount=crates*AGENTS[a].pot*NUAGE.PER_CRATE;const real=cal>=NUAGE.SMALL_CAL;
    if(!real){amount*=NUAGE.PUFF;this.gasRelease(x,y,a,amount,{r:.5,src:'obus'});const g=this.s.gas;g.fast??={};   // la bouffée et ses abords : ×3 pendant 2 h
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const k=this.gasKey(x+di*GAS_CELL,y+dj*GAS_CELL);g.fast[k]=Math.max(g.fast[k]||0,this.s.t+2);}return {real,amount};}
    const r=Math.min(6,1+1.3*Math.cbrt(crates));this.gasRelease(x,y,a,amount,{r,src:'obus'});
    // les persistants arrosent aussi le sol (la flaque autour du point de chute)
    if(AGENTS[a].sol>0){const g=this.s.gas,sc=g.sol[this.gasKey(x,y)]??={};sc[a]=(sc[a]||0)+amount*.3;}
    return {real,amount,r};},
  // Les Bèè (IA) fuient un nuage vers l'amont du vent ; nos soldats, non (le joueur commande)
  gasBeeeFlee(){const g=this.s.gas;if(!g||!Object.keys(g.air).length)return;const t=this.s.t;const ux=-Math.cos(g.wind.a),uy=-Math.sin(g.wind.a);
    for(const u of this.s.units){if(u.f!=='beee'||!(u.hp>0)||!u.h||u.h.state!=='ok'||(u.gasFleeT||0)>t)continue;const {t:c}=this.gasSum(this.gasAt(u.x,u.y));if(c<NUAGE.FLEE_C)continue;
      u.gasFleeT=t+.5;const tx=Math.max(1,Math.min(this.N-2,u.x+ux*8+(this.rand()-.5)*3)),ty=Math.max(1,Math.min(this.N-2,u.y+uy*8+(this.rand()-.5)*3));
      u.task={kind:'move',tx,ty};u.path=null;u.why='fuit le gaz';}},
};
const NB4=[[1,0],[-1,0],[0,1],[0,-1]];
