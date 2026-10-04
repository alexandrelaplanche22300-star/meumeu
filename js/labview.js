// La vue recherche (V12.6), mélangée à View. Un clic sur un bâtiment de recherche (centre de recherche, laboratoire, bureau d'études, usine chimique) :
// la caméra vole jusqu'à lui et s'incline un peu, le toit s'envole (scene3d.liftRoof), l'intérieur paraît avec ses savants (scene3d.labFigures). Tant que
// la vue est ouverte, TOUS nos bâtiments de recherche à l'écran montrent leur intérieur. Par-dessus la scène : le reste du monde un peu assombri, le nom
// de chacun, ce qu'il fait (une icône), ce qu'il dit (une bulle à la fois par bâtiment, tirée des paroles de sa discipline ou de la réunion), les
// évènements (eurêka, accident, idée), et au-dessus de chaque bâtiment ce qui s'y passe (projets, réunion, école). Clic sur un savant : sa fiche dans
// le panneau ; sur un autre bâtiment de recherche : on y vole ; ailleurs : la vue se referme et le clic fait ce qu'il fait d'habitude.
import {BUILDINGS} from './data.js';
import {DISC,PHASES,LAB_KIND,MEETINGS,SAYS,GRADES,gradeOf} from './researchdata.js';

const TW=64,TH=32,ELEV_LAB=.66;   // l'élévation de la vue recherche (38°) : on voit mieux par-dessus les murs du fond
const ICON={consulte:'💭',etude:'📖',cours:'🎓',reunion:'💬',orateur:'🗣',travail:'✎',affecte:'⚙',pause:'☕',dort:'💤',attente:'⏳',oisif:'…',ouvrier:'⚒'};
const WORK_ICON={bureau:'✎',maitre:'✎',table:'✎',paillasse:'⚗',hotte:'⚗',balance:'⚖',planche:'📐',maquette:'🔧',cuve:'🔥',condenseur:'⚙',pupitre:'⏱'};
const EV={eureka:['Eurêka !','#ffd36a','#3a2a00'],accident:['Ça a sauté !','#e0705f','#fff8e6'],idee:['💡 Une idée !','#fff2b0','#3a2a00'],fini:['Ça y est !','#9fe0a0','#12341a'],bloque:['…ça bloque.','#c8c8c8','#2a2a2a']};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const hash=n=>{n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return n>>>0;};

export const LABVIEW={
  isLab(b){return !!b&&b.f==='meumeu'&&!b.ally&&!!LAB_KIND[b.k]&&b.done&&!b.ruin;},
  // ouvrir la vue sur un bâtiment de recherche (ou passer à un autre) : la caméra vole jusqu'à lui
  enterLab(b){if(!this.isLab(b))return false;const W=this.world,[w,h]=W.sizeOf(b);if(!this.lab)this.labFrom={cx:this.cx,cy:this.cy,zoom:this.zoom,yaw:this.yaw||0,elev:this.elev??Math.asin(.5)};
    this.lab={b:b.id,t0:performance.now()};this.selB=b.id;this.sel.clear();this.selVs.clear();this.selV=null;this.labSel=null;
    const cw=this.canvas.width,z=Math.max(1.6,Math.min(8,.78*cw/((w+h)*TW/2)/this.dpr));
    this.labGo={t:0,dur:.9,a:{cx:this.cx,cy:this.cy,zoom:this.zoom,yaw:this.yaw||0,elev:this.elev??Math.asin(.5)},b:{cx:b.i+w/2,cy:b.j+h/2-.15,zoom:z,yaw:0,elev:ELEV_LAB}};
    this.labTick(0);return true;},
  // refermer : la caméra revient où elle était, les toits retombent
  exitLab(back=true){if(!this.lab)return;this.lab=null;this.labOpen=null;this.labSel=null;const F=this.labFrom;this.labFrom=null;
    if(back&&F)this.labGo={t:0,dur:.7,a:{cx:this.cx,cy:this.cy,zoom:this.zoom,yaw:this.yaw||0,elev:this.elev??Math.asin(.5)},b:F};},
  // à chaque image : le vol de la caméra, et la liste des bâtiments ouverts
  labTick(dt){const G=this.labGo;if(G){G.t=Math.min(1,G.t+dt/G.dur);const k=ease(G.t);for(const key of ['cx','cy','zoom','elev'])this[key]=G.a[key]+(G.b[key]-G.a[key])*k;
      let dy=G.b.yaw-G.a.yaw;dy=((dy+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;this.yaw=G.a.yaw+dy*k;if(G.t>=1)this.labGo=null;}
    if(!this.lab){this.labOpen=null;return;}const W=this.world,b=W.building(this.lab.b);if(!this.isLab(b)){this.exitLab();return;}
    this.labOpen=new Set(W.s.buildings.filter(x=>this.isLab(x)).map(x=>x.id));},
  // le savant (ou l'élève) sous le pointeur, dans un bâtiment ouvert
  labFigAt(sx,sy){const L=this.g3?.labDraw;if(!L?.length)return null;let best=null,bd=1e9;const z=this.z();
    for(const f of L){const q=this.toScreen(f.x,f.z,f.top*.55/.8165),d=Math.hypot(q.x-sx,q.y-sy);if(d<Math.max(10*this.dpr,.32*TH*z)&&d<bd){bd=d;best=f;}}return best;},
  // un clic gauche quand la vue est ouverte : rend vrai s'il est pris
  labClick(sx,sy,w){const f=this.labFigAt(sx,sy);if(f){this.labSel=f.u.id;this.ui.labPick?.(f.u.id);this.ui.changed();return true;}
    const t=this.world.targetAt(w.x,w.y),b=t?.type==='building'?this.world.building(t.id):null;if(this.isLab(b)){if(b.id!==this.lab.b){this.enterLab(b);this.ui.changed();}return true;}
    this.exitLab();return false;},
  labOnEvent(e){const W=this.world,b=e.b!=null?W.building(e.b):null;if(!b)return;const [w,h]=W.sizeOf(b),x=b.i+w/2,y=b.j+h/2;
    if(e.type==='labboom'){this.flash(x,y,3,.5,'255,170,90');this.puff(x,y,{n:16,color:e.chem?'#c8d8a8':'#b8b0a0',size:9,spread:.6,up:1.2,life:2.6});this.puff(x,y,{n:8,color:'#ffb060',size:5,spread:.3,up:.8,life:.5,glow:true});this.shake=Math.max(this.shake,.25);}
    else if(e.type==='eureka')this.puff(x,y,{n:10,color:'#ffe08a',size:3,spread:.5,up:1.4,life:1.2,glow:true});
    else if(e.type==='graduate')this.puff(x,y,{n:14,color:'#f6f0d8',size:3,spread:.7,up:1.6,life:1.6});},
  // par-dessus la scène : le monde assombri autour, les noms, les icônes, la bulle, les bandeaux des bâtiments
  labOverlay(){if(!this.lab||!this.g3)return;const ctx=this.ctx,W=this.world,dpr=this.dpr,z=this.z(),now=performance.now()/1000,b0=W.building(this.lab.b);if(!b0)return;
    const cw=this.canvas.width,ch=this.canvas.height,[w0,h0]=W.sizeOf(b0),c0=this.toScreen(b0.i+w0/2,b0.j+h0/2),R=(w0+h0)*TW/2*z*.62;
    ctx.save();const g=ctx.createRadialGradient(c0.x,c0.y,R*.85,c0.x,c0.y,R*2.4);g.addColorStop(0,'rgba(12,16,20,0)');g.addColorStop(1,'rgba(12,16,20,.42)');ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);ctx.restore();
    {const Lt=W.light();if(Lt<.7){ctx.save();ctx.globalCompositeOperation='lighter';for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const [w,h]=W.sizeOf(b),q=this.toScreen(b.i+w/2,b.j+h/2,.2),Rg=(w+h)*TW/2*z*.42;
      const fl=.92+.08*Math.sin(now*3.1+b.id);const gr=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,Rg);gr.addColorStop(0,`rgba(255,196,120,${.2*fl*(1-Lt)})`);gr.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(q.x,q.y,Rg,Rg*.6,0,0,7);ctx.fill();}ctx.restore();}}
    const figs=this.g3.labDraw||[],small=z<2.2;const font=(px,wgt=700)=>`${wgt} ${px*dpr}px system-ui,"Segoe UI Emoji",sans-serif`;
    // la bulle : une à la fois par bâtiment, toutes les 3,2 s, à quelqu'un qui parle (réunion d'abord, puis le travail, la pause, le cours)
    const speak=new Map();const slot=Math.floor(now/3.2);
    for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const L=figs.filter(f=>f.b===b.id&&!f.moving&&f.act!=='dort'&&f.act!=='oisif');if(!L.length)continue;
      const talk=L.filter(f=>f.act==='orateur'||f.act==='reunion');const pool=talk.length?talk:L;const f=pool[hash(slot*31+b.id)%pool.length];
      const M=b.meet,cat=talk.length&&M?M.type:f.act==='pause'?'cafe':f.act==='cours'||f.act==='etude'?(f.act==='cours'?'ecole':null):f.u.sci?.pid&&W.project(f.u.sci.pid)?.block?'bloque':f.u.sci?.disc;const lines=cat&&SAYS[cat];
      if(lines&&now%3.2<2.6)speak.set(f.u.id,lines[hash(slot*7+f.u.id)%lines.length]);}
    const placed=[];   // (les noms déjà posés : un nom qui en chevauche un autre descend d'une ligne)
    for(const f of figs){const q=this.toScreen(f.x,f.z,f.top/.8165),sel=this.labSel===f.u.id,u=f.u,disc=u.sci?.disc?DISC[u.sci.disc]:null;
      if(sel||this.labHover===u.id){const p=this.toScreen(f.x,f.z);ctx.save();ctx.strokeStyle='#ffd36a';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.ellipse(p.x,p.y,.16*TW*z,.16*TH*z,0,0,7);ctx.stroke();ctx.restore();}
      // l'évènement, sinon la parole, sinon l'icône de ce qu'il fait
      const ev=f.ev&&EV[f.ev],say=speak.get(u.id);
      if(ev||say){const [txt,bg,fg]=ev||[say,'#fffdf4','#233c43'];ctx.save();ctx.font=font(ev?13:11.5,ev?900:700);const tw=ctx.measureText(txt).width,pad=7*dpr,bw=tw+pad*2,bh=(ev?24:21)*dpr,bx=q.x-bw/2,by=q.y-bh-14*dpr;
        ctx.fillStyle=bg;ctx.strokeStyle='#233c43';ctx.lineWidth=1.4*dpr;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,8*dpr);ctx.moveTo(q.x-5*dpr,by+bh);ctx.lineTo(q.x,by+bh+8*dpr);ctx.lineTo(q.x+5*dpr,by+bh);ctx.fill();ctx.stroke();
        ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,q.x,by+bh/2+.5);ctx.restore();}
      else if(!small){const ic=f.act==='travail'?WORK_ICON[f.k]||ICON.travail:ICON[f.act];if(ic){ctx.save();ctx.font=font(13);ctx.textAlign='center';ctx.textBaseline='bottom';ctx.globalAlpha=.92;ctx.fillText(ic,q.x,q.y-4*dpr);ctx.restore();}}
      // le nom, et la discipline en couleur
      if(!small||sel){ctx.save();ctx.font=font(10.5,800);ctx.textAlign='center';ctx.textBaseline='top';const p=this.toScreen(f.x,f.z);const ny=p.y+3*dpr;ctx.lineWidth=3*dpr;ctx.strokeStyle='#173d44';
        const nm=u.name||'?',tw=ctx.measureText(nm).width,lh=12*dpr;let y=ny;for(let k=0;k<3&&placed.some(r=>Math.abs(r[0]-p.x)<(r[2]+tw)/2&&Math.abs(r[1]-y)<lh);k++)y+=lh;placed.push([p.x,y,tw]);
        ctx.strokeText(nm,p.x,y);ctx.fillStyle=disc?disc.col:'#e8e4d4';ctx.fillText(nm,p.x,y);ctx.restore();}}
    // le bandeau de chaque bâtiment ouvert : ce qui s'y passe
    for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const [w,h]=W.sizeOf(b),q=this.toScreen(b.i+w/2,b.j,1.25);if(q.x<-200||q.x>cw+200||q.y<-60||q.y>ch+60)continue;const kind=LAB_KIND[b.k];
      const lines=[BUILDINGS[b.k].name+(b===b0?'':' ')];const here=new Set((b.staff||[]).map(u=>u.id));
      for(const P of W.s.research.projects){if(P.st!=='actif')continue;const ph=P.phases[P.ph];if(ph.k!==kind||!P.team.some(id=>here.has(id)))continue;lines.push(`${P.name} — ${PHASES[ph.k].name} ${Math.round(ph.done/ph.need*100)} %${P.block?' · bloqué':''}`);}
      if(b.meet){const M=MEETINGS[b.meet.type];lines.push(`${M.name}${b.meet.wait?' (on attend du monde)':''} ${Math.round((1-b.meet.left/b.meet.total)*100)} %`);}
      const st=(b.staff||[]).filter(u=>u.k!=='savant');if(st.length)lines.push(`École : ${st.length} élève${st.length>1?'s':''}`);
      if(b.k==='armurerie'&&b.proto)lines.push(`Prototype : encore ${Math.ceil(b.proto.left)} h (×${W.protoRate(b).toFixed(1)})`);if(b.k==='poudrerie'&&W.labBoost(b)>1.001)lines.push(`Chimistes : production ×${W.labBoost(b).toFixed(2)}`);
      ctx.save();ctx.font=font(11.5,700);const tw=Math.max(...lines.map(l=>ctx.measureText(l).width)),lh=16*dpr,bw=tw+16*dpr,bh=lines.length*lh+8*dpr,fix=b===b0,bx=fix?14*dpr:Math.max(4*dpr,Math.min(cw-bw-4*dpr,q.x-bw/2)),by=fix?14*dpr:Math.max(4*dpr,q.y-bh);
      ctx.fillStyle=b===b0?'rgba(23,61,68,.92)':'rgba(23,61,68,.72)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7*dpr);ctx.fill();ctx.textAlign='left';ctx.textBaseline='top';
      lines.forEach((l,i)=>{ctx.font=font(i?11:12.5,i?600:800);ctx.fillStyle=i?'#d8efe8':'#ffd36a';ctx.fillText(l,bx+8*dpr,by+4*dpr+i*lh);});ctx.restore();}},
};
