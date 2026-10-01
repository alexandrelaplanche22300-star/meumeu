import {BUILDINGS,UNITS,BEEE,HOUR_REAL} from './data.js';
const distance=(a,b,x,y)=>Math.hypot(a-x,b-y);
const active=u=>u&&u.hp>0&&u.h?.state!=='hors';
export const SOUND_LIFE={tirs:8,explosion:10,pas:4,train:5,usine:5,mine:5,chantier:5,abattage:5,ville:5};
export const PERCEPTION={
  eyeProfile(o){
    const D=o.f==='beee'?BEEE.units[o.k]:UNITS[o.k],W=o.w?this.W(o.w):null,night=this.light()<.4;
    const civ=!o.w&&!D?.img&&!o.tower,eye=(o.tower?1.8:o.scoutRole?1.5:D?.scout||(D?.choc?1.15:1))*(civ?.45:1)*(o.h?.state==='hors'?.3:1);
    const O=W?.optic,blend=Math.max(0,Math.min(1,(this.light()-.15)/.45));
    const scope=O?.mag>1?O.night+(O.day-O.night)*blend:1;
    const optic=this.sight()*eye*scope;
    const binocular=!night&&o.jum>0?o.jum:0;
    const nv=night&&o.nvOn&&(o.irLeft??0)>0?Math.max(W?.ir?.range||0,o.bino||0)*(1+.16*Math.log2(O?.mag||1))*eye:0;
    const wide=o.tower?2:o.task?.kind==='search'?2:o.task?.kind==='patrol'?1:0;
    const nvCos=W?.ir?.beam?Math.cos(W.ir.beam*Math.PI/360):.93;   // demi-largeur du faisceau de la lampe (43° = l'ancien 0,93)
    return {base:this.sight()*eye,optic:Math.max(optic,binocular),nv,nvCos,wide,civ,cos:o.observe?.cos??(this.t-(o.moved??-9)>.05?.82:.93),max:Math.max(this.sight()*eye,optic,binocular,nv,night&&o.lamp?5:0)};
  },
  visualRange(o,x,y,signature=1){
    const P=this.eyeProfile(o),d=distance(o.x,o.y,x,y);
    const fx=o.fx??1,fy=o.fy??0,c=d>.01?(fx*(x-o.x)+fy*(y-o.y))/d:1;
    const cone=o.tower||d<2?1:c>=.5?1:c>=-.2?[.55,.72,.88][P.wide]:[.22,.38,.62][P.wide];
    let r=P.base*cone;
    if(c>=P.cos)r=Math.max(r,P.optic);
    if(c>=P.nvCos)r=Math.max(r,P.nv);
    if(o.lamp&&this.isNight()&&d<5)r=Math.max(r,5);
    return Math.max(1.6,r*signature);
  },
  visibleAt(f,x,y,sig=1){
    if(!Number.isFinite(x+y))return false;
    const look=o=>o.f===f&&active(o)&&distance(o.x,o.y,x,y)<=this.visualRange(o,x,y,sig)&&this.los(o.x,o.y,x,y);
    if(this.near(x,y,220,look))return true;
    for(const b of this.s.buildings){if(b.f!==f||!b.done||b.ruin)continue;const [bx,by]=this.bc(b),r=BUILDINGS[b.k].defense?this.sight()*1.8:4+Math.max(...this.sizeOf(b))/2;if(distance(bx,by,x,y)<=r&&this.los(bx,by,x,y))return true;}
    for(const v of this.s.vehicles)if(v.f===f&&distance(v.x,v.y,x,y)<(v.alt>0?14:v.crew?.length?this.sight()*1.05:4)&&this.los(v.x,v.y,x,y))return true;
    return false;
  },
  // Le masque de vue : des rayons partent de chaque observateur (unité, bâtiment, véhicule), un tous les ~0,45 case à l'arrivée ; chacun avance
  // par demi-cases jusqu'à la portée de l'observateur DANS SA DIRECTION (même calcul que visualRange), s'arrête dans la fumée et après la première
  // case d'un bâtiment (qu'on voit). Chaque case n'est traversée qu'une fois par rayon — avant, chaque case refaisait sa ligne de vue entière
  // (mesuré, partie du joueur au jour 45 : 180 ms par calcul, quatre fois par seconde).
  visibilityMask(f,vis,explored){const N=this.N,occ=this.occ,T=this.s.t;const smokes=this.s.smokes.map(m=>({x:m.x,y:m.y,r:m.r*Math.min(1,(m.end-T)/1+.3)})).filter(m=>m.r>0);
    const mark=(x,y,r,o)=>{const P=o?this.eyeProfile(o):null,fx=o?(o.fx??1):1,fy=o?(o.fy??0):0,fl=Math.hypot(fx,fy)||1,lamp=o&&o.lamp&&this.isNight();
      const near=smokes.filter(m=>Math.hypot(m.x-x,m.y-y)<r+m.r);
      const Rd=(dx,dy)=>{if(!o)return r;const c=(fx*dx+fy*dy)/fl;const cone=o.tower?1:c>=.5?1:c>=-.2?[.55,.72,.88][P.wide]:[.22,.38,.62][P.wide];let R=P.base*cone;if(c>=P.cos)R=Math.max(R,P.optic);if(c>=P.nvCos)R=Math.max(R,P.nv);return Math.max(1.6,R);};
      {const i=Math.floor(x),j=Math.floor(y);if(i>=0&&j>=0&&i<N&&j<N){vis[j*N+i]=1;if(explored)explored[j*N+i]=1;}}
      for(let a=0;a<6.2832;){const dx=Math.cos(a),dy=Math.sin(a);let R=Math.max(Math.min(r,Rd(dx,dy)),o&&!o.tower?Math.min(r,2,P.base):0);
        for(let t=.35;t<=R+.7;t+=.35){const X=x+dx*t,Y=y+dy*t;const i=Math.floor(X),j=Math.floor(Y);if(i<0||j<0||i>=N||j>=N)break;
          let blind=false;for(const m of near)if((X-m.x)**2+(Y-m.y)**2<m.r*m.r){blind=true;break;}if(blind)break;
          const k=j*N+i;if((i+.5-x)**2+(j+.5-y)**2<=R*R){vis[k]=1;if(explored)explored[k]=1;}const ob=occ[k];if(ob>=0){const B=this.bIndex.get(ob);if(B&&!B.ruin&&this.distB(B,x,y)>.6)break;}}
        if(lamp)for(let t=.5;t<5;t+=.5){const i=Math.floor(x+dx*t),j=Math.floor(y+dy*t);if(i<0||j<0||i>=N||j>=N)break;vis[j*N+i]=1;if(explored)explored[j*N+i]=1;}
        a+=Math.min(.2,.45/Math.max(1,R));}};
    for(const u of this.s.units)if(u.f===f&&active(u))mark(u.x,u.y,this.eyeProfile(u).max,u);
    for(const b of this.s.buildings)if(b.f===f&&b.done&&!b.ruin){const [x,y]=this.bc(b);mark(x,y,BUILDINGS[b.k].defense?this.sight()*1.8:4+Math.max(...this.sizeOf(b))/2);}
    for(const v of this.s.vehicles)if(v.f===f)mark(v.x,v.y,v.alt>0?14:v.crew?.length?this.sight()*1.05:4);return vis;
  },
  observe(ids,x,y){let n=0;for(const id of ids){const u=this.unit(id);if(!active(u)||u.f!=='meumeu')continue;u.task={kind:'guard',tx:u.x,ty:u.y,fx:(x-u.x)/(distance(u.x,u.y,x,y)||1),fy:(y-u.y)/(distance(u.x,u.y,x,y)||1),hold:true};u.path=null;u.hold=true;u.observe={x,y,cos:.9};this.face(u,x-u.x,y-u.y);n++;}return {ok:n>0,text:`${n} observent le secteur sans avancer`,why:['aucun observateur']};
  },
  intelTick(dt){this.intT=(this.intT||0)+dt;if(this.intT<.25)return;this.intT=0;const I=this.s.intel??={},S=this.s.sightings??=[];
    for(const b of this.s.buildings){if(b.f!=='beee')continue;const [x,y]=this.bc(b);if(!this.visibleAt('meumeu',x,y))continue;
      const snapshot={id:b.id,f:b.f,k:b.k,i:b.i,j:b.j,size:b.size,done:b.done,progress:b.progress,hp:b.hp,max:b.max,ruin:!!b.ruin,city:b.city,fire:0,queue:[]};
      const counts={mil:0,civ:0};this.near(x,y,15,u=>{if(u.f==='beee'&&active(u)&&this.spotted(u,'meumeu')&&distance(u.x,u.y,x,y)<15)counts[u.w||u.k==='canon'?'mil':'civ']++;});
      I[b.id]={k:b.k,i:b.i,j:b.j,ruin:!!b.ruin,t:this.t,snapshot,counts};
    }
    for(const e of this.s.units){if(e.f!=='beee'||!active(e)||!this.spotted(e,'meumeu'))continue;let g=S.find(g=>distance(g.x,g.y,e.x,e.y)<8&&this.t-g.t<.5);if(!g){g={x:e.x,y:e.y,n:0,t:this.t,ids:[]};S.push(g);}if(!g.ids?.includes(e.id)){g.ids??=[];g.ids.push(e.id);}g.n=g.ids.length;g.x=e.x;g.y=e.y;g.t=this.t;}
    this.s.sightings=S.filter(g=>this.t-g.t<6).slice(-40);
  },
  acousticContact(ear,x,y,dB,kind){
    const base=Math.max(4,(dB-110)/1.6),night=this.light()<.4&&kind!=='pas',R=base*(night?1.5:1),d=distance(ear.x,ear.y,x,y),blocked=!this.los(ear.x,ear.y,x,y),range=R*(blocked?.62:1);
    if(d>range)return null;
    // Bruits de pas portent déjà leur portée jour/nuit dans stepRange(). Pour les autres sons,
    // le calme nocturne porte davantage. Une paroi atténue, sans révéler ni la distance exacte,
    // ni la position cachée de la source.
    // Plus la source est forte, plus le relèvement est net : un train (très fort, entendu de loin) se situe mieux qu'une usine, une mine
    // ou un chantier au même éloignement, et qu'un pas. strength : 0 (110 dB) à 1 (200 dB) ; le flou de distance est réduit jusqu'à 45 %.
    const strength=Math.max(0,Math.min(1,(dB-110)/90));
    const uncertainty=Math.max(.035,Math.min(1.25,(.06+d/(night?82:105))*(1.1-.55*strength)+(blocked?.24:0)));
    const angle=Math.atan2(y-ear.y,x-ear.x)+(this.rand()-.5)*uncertainty;
    const estimatedDistance=Math.max(0,d*(.72+this.rand()*.56));
    return {ox:ear.x,oy:ear.y,oid:ear.id,angle,uncertainty,d:estimatedDistance,t:this.t,kind,n:1,intensity:Math.max(0,1-d/range),db:dB,range:R,ttl:(SOUND_LIFE[kind]||6)/HOUR_REAL};
  },
  meumeuHear(x,y,dB,kind,team=1){const H=this.s.heard??=[];
    for(const ear of this.s.units){if(ear.f!=='meumeu'||!active(ear))continue;const h=this.acousticContact(ear,x,y,dB,kind);if(!h)continue;h.team=team;   // team : combien d'hommes marchent ensemble (une équipe s'entend de plus loin et s'annonce comme telle)
      const old=H.find(a=>a.oid===h.oid&&a.kind===kind&&this.t-a.t<a.ttl&&Math.abs(Math.atan2(Math.sin(a.angle-h.angle),Math.cos(a.angle-h.angle)))<.4);
      if(old){// le contact le plus précis l'emporte : un bruit plus lointain rafraîchit l'ancien contact sans jamais l'élargir
        const better=h.uncertainty<=old.uncertainty;Object.assign(old,better?h:{t:h.t,ttl:h.ttl,intensity:Math.max(old.intensity,h.intensity),db:Math.max(old.db||0,h.db),range:Math.max(old.range||0,h.range)},{n:Math.min(99,old.n+1),team:Math.max(old.team||1,team)});}else H.push(h);
    }
    this.s.heard=H.filter(h=>this.t-h.t<(h.ttl??2)).slice(-500);
  },
  observer(f,x,y){return this.near(x,y,220,o=>o.f===f&&active(o)&&distance(o.x,o.y,x,y)<this.visualRange(o,x,y)&&this.los(o.x,o.y,x,y));}
};
