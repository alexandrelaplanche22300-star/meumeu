// La vue recherche (V12.6 ; V12.7 : les savants sont des unités, la réunion a son script, chacun pense), mélangée à View. Un clic sur un bâtiment de
// recherche (centre de recherche, laboratoire de chimie, bureau d'études) : la caméra vole jusqu'à lui et s'incline un peu, le toit s'envole
// (scene3d.liftRoof), l'intérieur paraît avec ses savants (scene3d.labFigures). Tant que la vue est ouverte, TOUS nos bâtiments de recherche à l'écran
// montrent leur intérieur. Par-dessus la scène :
//  - le FLUX : les bâtiments d'un même programme reliés (le bureau d'origine, le laboratoire, le centre où l'on se réunit), et les savants en chemin
//    de l'un à l'autre (un point, un trait vers où ils vont) ;
//  - les BULLES : en réunion, la réplique en cours sur la tête de celui qui la dit (les chiffres de la conception, les propositions, les objections) ;
//    ailleurs, ce que pense un savant — le calcul qu'il vient de faire sur sa piste (« le pas de rayure 11,0 → 6,2 cm… mieux ! ») ;
//  - les évènements (eurêka, accident, piste mûre), les noms, ce que chacun fait ; au-dessus de chaque bâtiment, ce qui s'y passe.
// Clic sur un savant : sa fiche ; sur un autre bâtiment de recherche : on y vole ; ailleurs : la vue se referme et le clic fait ce qu'il fait d'habitude.
import {BUILDINGS} from './data.js';
import {LAB_KIND,MEETINGS,MEET_PHASES,SAYS} from './researchdata.js';
import {ROLES,GOALS} from './techaxes.js';

const TW=64,TH=32,ELEV_LAB=.66;   // l'élévation de la vue recherche (38°) : on voit mieux par-dessus les murs du fond
const ICON={etude:'📖',cours:'🎓',reunion:'💬',orateur:'🗣',travail:'✎',reflexion:'💭',dort:'💤',attente:'⏳',oisif:'…',ouvrier:'⚒',pause:'☕'};
const WORK_ICON={bureau:'✎',maitre:'✎',table:'✎',paillasse:'⚗',hotte:'⚗',balance:'⚖',planche:'📐',maquette:'🔧',cuve:'🔥',plans:'📐'};
const EV={eureka:['Eurêka !','#ffd36a','#3a2a00'],accident:['Ça a sauté !','#e0705f','#fff8e6'],fini:['Ça y est !','#9fe0a0','#12341a'],bloque:['…ça bloque.','#c8c8c8','#2a2a2a']};
const KCOL={prop:'#fff2c8',objection:'#ffd8d0',soutien:'#d8f2dc',compromis:'#ffe6c8',decision:'#cfeeee',calcul:'#f4f6ff',parole:'#fffdf4'};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const hash=n=>{n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return n>>>0;};
// couper une réplique en lignes (au plus 3)
function wrapText(ctx,txt,maxW){const words=String(txt).split(' '),L=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){L.push(cur);cur=w;if(L.length===3)break;}else cur=t;}
  if(L.length<3&&cur)L.push(cur);else if(cur&&L.length===3)L[2]=L[2].replace(/.{0,2}$/,'…');return L;}

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
  labClick(sx,sy,w){const f=this.labFigAt(sx,sy);if(f?.u.k==='roi')return true;if(f){this.labSel=f.u.id;this.ui.labPick?.(f.u.id);this.ui.changed();return true;}
    const t=this.world.targetAt(w.x,w.y),b=t?.type==='building'?this.world.building(t.id):null;if(this.isLab(b)){if(b.id!==this.lab.b){this.enterLab(b);this.ui.changed();}return true;}
    this.exitLab();return false;},
  labOnEvent(e){const W=this.world,b=e.b!=null?W.building(e.b):null;if(!b)return;const [w,h]=W.sizeOf(b),x=b.i+w/2,y=b.j+h/2;
    if(e.type==='labboom'){this.flash(x,y,3,.5,'255,170,90');this.puff(x,y,{n:16,color:e.chem?'#c8d8a8':'#b8b0a0',size:9,spread:.6,up:1.2,life:2.6});this.puff(x,y,{n:8,color:'#ffb060',size:5,spread:.3,up:.8,life:.5,glow:true});this.shake=Math.max(this.shake,.25);}
    else if(e.type==='eureka')this.puff(x,y,{n:10,color:'#ffe08a',size:3,spread:.5,up:1.4,life:1.2,glow:true});
    else if(e.type==='graduate')this.puff(x,y,{n:14,color:'#f6f0d8',size:3,spread:.7,up:1.6,life:1.6});},
  // une bulle (plusieurs lignes) au-dessus de q ; tone : la couleur de fond, col : la bordure (le métier de celui qui parle)
  labBubble(ctx,q,txt,{bg='#fffdf4',fg='#233c43',col='#233c43',think=false,big=false,maxW=230}={}){const dpr=this.dpr;ctx.save();ctx.font=`${big?800:650} ${(big?12.5:11.5)*dpr}px system-ui,"Segoe UI Emoji",sans-serif`;
    const L=wrapText(ctx,txt,maxW*dpr),lh=(big?15:14)*dpr,tw=Math.max(...L.map(l=>ctx.measureText(l).width)),pad=7*dpr,bw=tw+pad*2,bh=L.length*lh+pad*1.2,bx=q.x-bw/2,by=q.y-bh-14*dpr;
    ctx.fillStyle=bg;ctx.strokeStyle=col;ctx.lineWidth=(think?1.2:1.8)*dpr;if(think)ctx.setLineDash([4*dpr,3*dpr]);ctx.beginPath();ctx.roundRect(bx,by,bw,bh,9*dpr);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    if(think){for(const [dx,dy,r] of [[0,6,3.2],[-4,11,2]]){ctx.beginPath();ctx.arc(q.x+dx*dpr,by+bh+dy*dpr,r*dpr,0,7);ctx.fill();ctx.stroke();}}
    else{ctx.beginPath();ctx.moveTo(q.x-5*dpr,by+bh-1);ctx.lineTo(q.x,by+bh+8*dpr);ctx.lineTo(q.x+5*dpr,by+bh-1);ctx.fill();ctx.beginPath();ctx.moveTo(q.x-5*dpr,by+bh);ctx.lineTo(q.x,by+bh+8*dpr);ctx.lineTo(q.x+5*dpr,by+bh);ctx.stroke();}
    ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='top';L.forEach((l,i)=>ctx.fillText(l,q.x,by+pad*.6+i*lh));ctx.restore();return [bx,by,bw,bh];},
  // le flux d'un programme : ses bâtiments reliés (le bureau d'origine → le laboratoire, le centre), ceux qui marchent de l'un à l'autre
  labFlow(ctx){const W=this.world,dpr=this.dpr,now=performance.now()/1000,z=this.z();const ctr=b=>{const [w,h]=W.sizeOf(b);return this.toScreen(b.i+w/2,b.j+h/2,.3);};
    ctx.save();
    for(const P of W.s.research.programs){if(!['lancement','actif','suivi','pret'].includes(P.st))continue;const b0=W.building(P.b0);if(!b0)continue;
      const at=new Set();for(const id of P.team){const u=W.unit(id);const b=u&&W.where(u);if(b)at.add(b.id);if(u?.task?.kind==='lab')at.add(u.task.b);}if(P.meet)at.add(P.meet.b);at.delete(b0.id);
      const A=ctr(b0);for(const bid of at){const b=W.building(bid);if(!b)continue;const B=ctr(b);const col=b.k==='labo'?ROLES.chimiste.col:b.k==='centre_recherche'?ROLES.physicien.col:ROLES.ingenieur.col;
        ctx.strokeStyle=col;ctx.globalAlpha=.55;ctx.lineWidth=3*dpr;ctx.setLineDash([10*dpr,7*dpr]);ctx.lineDashOffset=-now*22*dpr;ctx.beginPath();ctx.moveTo(A.x,A.y);
        const mx=(A.x+B.x)/2,my=Math.min(A.y,B.y)-Math.hypot(B.x-A.x,B.y-A.y)*.18;ctx.quadraticCurveTo(mx,my,B.x,B.y);ctx.stroke();ctx.setLineDash([]);
        ctx.globalAlpha=.9;ctx.font=`700 ${10.5*dpr}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillStyle='#173d44';const t=P.name.length>22?P.name.slice(0,21)+'…':P.name;const tw=ctx.measureText(t).width;
        ctx.fillStyle='rgba(255,250,240,.85)';ctx.fillRect(mx-tw/2-4*dpr,(A.y+B.y)/2*.5+my*.5-8*dpr,tw+8*dpr,15*dpr);ctx.fillStyle='#173d44';ctx.fillText(t,mx,(A.y+B.y)/2*.5+my*.5+3*dpr);}}
    // les savants en chemin : un point de la couleur de leur métier, un trait vers où ils vont, leur nom
    for(const u of W.s.units){if(u.k!=='savant'||!(u.hp>0)||u.inLab!=null||u.task?.kind!=='lab')continue;const b=W.building(u.task.b);if(!b)continue;const p=this.toScreen(u.x,u.y,.2),B=ctr(b),col=ROLES[u.sci.role]?.col||'#ddd';
      ctx.globalAlpha=.8;ctx.strokeStyle=col;ctx.lineWidth=1.5*dpr;ctx.setLineDash([3*dpr,4*dpr]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(B.x,B.y);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;ctx.fillStyle=col;ctx.strokeStyle='#173d44';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(p.x,p.y,(5+Math.sin(now*5+u.id))*dpr,0,7);ctx.fill();ctx.stroke();
      if(z>.6){ctx.font=`700 ${10*dpr}px system-ui,sans-serif`;ctx.textAlign='center';ctx.lineWidth=3*dpr;ctx.strokeText(u.name,p.x,p.y-9*dpr);ctx.fillStyle='#fffaf0';ctx.fillText(u.name,p.x,p.y-9*dpr);}}
    ctx.restore();},
  // par-dessus la scène : le monde assombri autour, le flux, les noms, les icônes, les bulles, les bandeaux des bâtiments
  labOverlay(){if(!this.lab||!this.g3)return;const ctx=this.ctx,W=this.world,dpr=this.dpr,z=this.z(),now=performance.now()/1000,b0=W.building(this.lab.b);if(!b0)return;
    const cw=this.canvas.width,ch=this.canvas.height,[w0,h0]=W.sizeOf(b0),c0=this.toScreen(b0.i+w0/2,b0.j+h0/2),R=(w0+h0)*TW/2*z*.62;
    ctx.save();const g=ctx.createRadialGradient(c0.x,c0.y,R*.85,c0.x,c0.y,R*2.4);g.addColorStop(0,'rgba(12,16,20,0)');g.addColorStop(1,'rgba(12,16,20,.42)');ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);ctx.restore();
    {const Lt=W.light();if(Lt<.7){ctx.save();ctx.globalCompositeOperation='lighter';for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const [w,h]=W.sizeOf(b),q=this.toScreen(b.i+w/2,b.j+h/2,.2),Rg=(w+h)*TW/2*z*.42;
      const fl=.92+.08*Math.sin(now*3.1+b.id);const gr=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,Rg);gr.addColorStop(0,`rgba(255,196,120,${.2*fl*(1-Lt)})`);gr.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(q.x,q.y,Rg,Rg*.6,0,0,7);ctx.fill();}ctx.restore();}}
    this.labFlow(ctx);
    const figs=this.g3.labDraw||[],small=z<2.2;const font=(px,wgt=700)=>`${wgt} ${px*dpr}px system-ui,"Segoe UI Emoji",sans-serif`;
    // les bulles : en réunion, la réplique en cours (sur celui qui la dit) ; ailleurs, une pensée à la fois par bâtiment, toutes les 3,4 s
    const speak=new Map(),slot=Math.floor(now/3.4);
    for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const L=figs.filter(f=>f.b===b.id&&!f.moving);if(!L.length)continue;const MA=W.meetingAt(b);
      if(MA&&MA.M.phase!=='rassemblement'){const l=MA.line;if(MA.M.phase==='decision'){const f=L.find(x=>x.act==='reunion');if(f)speak.set(f.u.id,{txt:`${MEETINGS[MA.M.type].name} : on attend la décision du commandement (${MA.M.props.length} proposition${MA.M.props.length>1?'s':''})`,k:'decision',big:true});}
        else if(l){const f=L.find(x=>x.u.id===l.by)||L.find(x=>x.act==='reunion'&&x.u.sci?.role===l.role);if(f)speak.set(f.u.id,{txt:l.text,k:l.k,big:true});}}
      // la pensée : le dernier calcul d'un savant qui pense (récent), ou une parole du quotidien
      const thinkers=L.filter(f=>f.u.k==='savant'&&f.act!=='reunion'&&f.act!=='dort'&&f.u.sci?.think&&W.s.t-f.u.sci.think.t<2.5);
      const pool=thinkers.length?thinkers:L.filter(f=>f.act!=='reunion'&&f.act!=='dort'&&f.act!=='oisif');if(!pool.length||now%3.4>2.9)continue;const f=pool[hash(slot*31+b.id)%pool.length];if(speak.has(f.u.id))continue;
      const T=f.u.sci?.think;if(T&&thinkers.includes(f)){const goal=GOALS[T.goal]?.name;speak.set(f.u.id,{txt:`${goal?goal.charAt(0).toUpperCase()+goal.slice(1)+' : ':''}${T.txt}${T.good?' — mieux !':'…'}`,think:true,good:T.good});}
      else{const cat=f.act==='cours'?'ecole':f.act==='attente'?'attente':f.act==='pause'?'cafe':null;const lines=cat&&SAYS[cat];if(lines)speak.set(f.u.id,{txt:lines[hash(slot*7+f.u.id)%lines.length]});}}
    const placed=[];   // (les noms déjà posés : un nom qui en chevauche un autre descend d'une ligne)
    for(const f of figs){const q=this.toScreen(f.x,f.z,f.top/.8165),sel=this.labSel===f.u.id,u=f.u,R0=u.sci?.role?ROLES[u.sci.role]:null;
      if(sel||this.labHover===u.id){const p=this.toScreen(f.x,f.z);ctx.save();ctx.strokeStyle='#ffd36a';ctx.lineWidth=2*dpr;ctx.beginPath();ctx.ellipse(p.x,p.y,.16*TW*z,.16*TH*z,0,0,7);ctx.stroke();ctx.restore();}
      // l'évènement, sinon la bulle, sinon l'icône de ce qu'il fait
      const ev=f.ev&&EV[f.ev],sp=speak.get(u.id);
      if(ev)this.labBubble(ctx,q,ev[0],{bg:ev[1],fg:ev[2],big:true});
      else if(sp)this.labBubble(ctx,q,sp.txt,{bg:sp.think?(sp.good?'#eefbe8':'#f4f6fb'):KCOL[sp.k]||'#fffdf4',col:R0?.col||'#233c43',think:!!sp.think,big:!!sp.big,maxW:sp.big?260:210});
      else if(!small){const ic=f.spk?ICON.orateur:f.act==='travail'?WORK_ICON[f.k]||ICON.travail:ICON[f.act];if(ic){ctx.save();ctx.font=font(13);ctx.textAlign='center';ctx.textBaseline='bottom';ctx.globalAlpha=.92;ctx.fillText(ic,q.x,q.y-4*dpr);ctx.restore();}}
      // le nom, dans la couleur du métier
      if(!small||sel){ctx.save();ctx.font=font(10.5,800);ctx.textAlign='center';ctx.textBaseline='top';const p=this.toScreen(f.x,f.z);const ny=p.y+3*dpr;ctx.lineWidth=3*dpr;ctx.strokeStyle='#173d44';
        const nm=u.name||'?',tw=ctx.measureText(nm).width,lh=12*dpr;let y=ny;for(let k=0;k<3&&placed.some(r=>Math.abs(r[0]-p.x)<(r[2]+tw)/2&&Math.abs(r[1]-y)<lh);k++)y+=lh;placed.push([p.x,y,tw]);
        ctx.strokeText(nm,p.x,y);ctx.fillStyle=u.k==='roi'?'#ffd36a':R0?R0.col:'#e8e4d4';ctx.fillText(nm,p.x,y);ctx.restore();}}
    // le bandeau de chaque bâtiment ouvert : ce qui s'y passe
    for(const b of W.s.buildings){if(!this.labOpen?.has(b.id))continue;const [w,h]=W.sizeOf(b),q=this.toScreen(b.i+w/2,b.j,1.25);if(q.x<-200||q.x>cw+200||q.y<-60||q.y>ch+60)continue;
      const lines=[BUILDINGS[b.k].name];const here=W.s.units.filter(u=>u.inLab===b.id&&u.hp>0);const ids=new Set(here.map(u=>u.id));
      for(const P of W.s.research.programs){if(!['lancement','actif','suivi','pret'].includes(P.st))continue;const T=P.tasks.filter(t=>t.done<t.work&&t.ids.some(id=>ids.has(id)));
        for(const t of T.slice(0,2))lines.push(`${P.name} — ${t.label.length>34?t.label.slice(0,33)+'…':t.label} ${Math.round(t.done/t.work*100)} %${t.block?' · bloqué':''}`);
        const thinking=here.filter(u=>u.k==='savant'&&u.sci.think?.pid===P.id&&W.s.t-u.sci.think.t<3&&!u.sci.task).length;if(thinking&&!T.length)lines.push(`${P.name} — ${thinking} savant${thinking>1?'s':''} y réfléchi${thinking>1?'ssent':'t'}`);}
      const MA=W.meetingAt(b);if(MA){const M=MA.M;lines.push(`💬 ${MEETINGS[M.type].name} — ${MEET_PHASES[M.phase]||M.phase}${M.wave?` (vague ${M.wave+1})`:''}${M.props.length?` · ${M.props.length} proposition${M.props.length>1?'s':''}`:''}`);}
      const st=here.filter(u=>u.k!=='savant');if(st.length)lines.push(`École : ${st.length} élève${st.length>1?'s':''}`);
      if(b.k==='labo'){const n=W.s.units.filter(u=>u.task?.kind==='work'&&u.task.b===b.id&&u.at&&u.hp>0).length;if(n||b.prod)lines.push(`Production : ${n} ouvrier${n>1?'s':''}${b.halt?' (arrêtée)':''}`);}
      ctx.save();ctx.font=font(11.5,700);const tw=Math.max(...lines.map(l=>ctx.measureText(l).width)),lh=16*dpr,bw=tw+16*dpr,bh=lines.length*lh+8*dpr,fix=b===b0,bx=fix?14*dpr:Math.max(4*dpr,Math.min(cw-bw-4*dpr,q.x-bw/2)),by=fix?14*dpr:Math.max(4*dpr,q.y-bh);
      ctx.fillStyle=b===b0?'rgba(23,61,68,.92)':'rgba(23,61,68,.72)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,7*dpr);ctx.fill();ctx.textAlign='left';ctx.textBaseline='top';
      lines.forEach((l,i)=>{ctx.font=font(i?11:12.5,i?600:800);ctx.fillStyle=i?(l.startsWith('💬')?'#ffe6a8':'#d8efe8'):'#ffd36a';ctx.fillText(l,bx+8*dpr,by+4*dpr+i*lh);});ctx.restore();}},
};
