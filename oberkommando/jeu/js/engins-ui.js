// Le bureau des engins (V12.8) : concevoir un véhicule — châssis, caisse et plaques, moteur, réservoir, tourelles et leurs armes, mitrailleuse de caisse,
// râteliers, bancs, soute. La vue 3D (extérieur, coupe, épaisseurs) et la vue de dessus (on y fait glisser tourelles et râteliers) lisent la même
// conception que la balistique et le jeu (engins.js). Les armes des tourelles se retouchent au concepteur d'armes, en mode engin.
import * as THREE from './lib/three.module.js';
import {CHASSIS,MOTEURS,FORMES,VEH_ARMES,EXEMPLES,newVehicle,newTurret,exemple,deriveVeh,armeVeh,polyCenter} from './engins.js';
import {derive} from './ballistics.js';

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fr=(x,d=1)=>(Math.round(x*10**d)/10**d).toString().replace('.',',');
const KCOL={moteur:0x7a7f84,essence:0xd0583a,munitions:0xe8bf3a,equipage:0x4f9fd0,passager:0x5fb36a,soute:0xa07a48};
const KNAME={moteur:'moteur',essence:'essence',munitions:'munitions',equipage:'équipage',passager:'passagers',soute:'soute'};
const PAINT=0x6e7350,PAINT_T=0x787d58,STEELC=0x55595c,TRACK=0x3a3a36,RUBBER=0x262626;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// la couleur d'une épaisseur vue de face (mm de peluche, ligne de visée horizontale) : bleu mince → rouge épais
const thickCol=t=>{const k=clamp(t/20,0,1);const c=new THREE.Color();c.setHSL(.62-.62*k,.75,.45+.1*(1-k));return c;};

// ---------- la vue 3D ----------
class VehView{
  constructor(cv){this.cv=cv;this.r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});this.r.setClearColor(0x000000,0);
    this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xfff2dc,0x40463a,1.15));const sun=new THREE.DirectionalLight(0xffe8c4,2.1);sun.position.set(-160,280,210);this.scene.add(sun);
    const back=new THREE.DirectionalLight(0xc8d8ff,.6);back.position.set(200,120,-220);this.scene.add(back);
    this.grid=new THREE.GridHelper(1200,60,0x7a8a90,0x4a585e);this.grid.material.transparent=true;this.grid.material.opacity=.3;this.scene.add(this.grid);
    this.cam=new THREE.PerspectiveCamera(30,1,1,8000);this.g=new THREE.Group();this.scene.add(this.g);this.az=-.85;this.el=.38;this.zoom=1;this.R=80;this.cy=20;
    let drag=null;cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};cv.setPointerCapture?.(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;this.az-=(e.clientX-drag.x)*.008;this.el=clamp(this.el+(e.clientY-drag.y)*.006,-.1,1.45);drag={x:e.clientX,y:e.clientY};this.render();});
    const up=()=>{drag=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*(e.deltaY>0?1.1:.9),.3,4);this.render();},{passive:false});
    cv.addEventListener('dblclick',()=>{this.az=-.85;this.el=.38;this.zoom=1;this.render();});}
  dispose(){this.clear();this.r.dispose();}
  clear(){this.g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});this.g.clear();}
  // un polygone plan (convexe) : des triangles en éventail
  polyGeo(faces){const pos=[],col=[];for(const f of faces){const P=f.poly,c=f.col;for(let i=1;i<P.length-1;i++)for(const q of [P[0],P[i],P[i+1]]){pos.push(q[0],q[1],q[2]);col.push(c.r,c.g,c.b);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;}
  set(D,mode){this.clear();const v=D.v,C=D.C,G=D.G,see=mode==='coupe';
    const shell=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,shininess:25,transparent:see,opacity:see?.16:1,depthWrite:!see});
    const paint=(f,base)=>{const c=mode==='blind'?thickCol(f.t/Math.max(.2,Math.cos(Math.min(85,f.a||0)*Math.PI/180))):new THREE.Color(base);return {poly:f.poly,col:c};};
    this.g.add(new THREE.Mesh(this.polyGeo(G.faces.map(f=>paint(f,PAINT))),shell));
    const metal=new THREE.MeshPhongMaterial({color:STEELC,flatShading:true,shininess:40});
    for(const t of D.tur){this.g.add(new THREE.Mesh(this.polyGeo(t.geo.faces.map(f=>paint(f,PAINT_T))),shell));
      // l'arme : le masque et le tube, vers l'avant de la tourelle (une casemate en flanc tire de côté)
      const p=t.A?.D?.p;if(p){const T=t.T,y=t.base+T.h*.5,len=Math.max(4,(p.L||200)/10),rad=Math.max(.35,p.d/10*.75);let ox=T.x,oz=T.z,dx=0,dz=1;
        if(t.F.flanc){dx=Math.sign(T.x)||1;dz=0;ox=T.x+dx*T.D*.45;}else oz=T.z+(T.forme==='boite'||T.forme==='hexagone'||T.forme==='casemate'?T.D*(T.long||1)/2:T.D/2)*.92;
        const m=new THREE.Mesh(new THREE.BoxGeometry(rad*5,rad*5,rad*3),metal);m.position.set(ox,y,oz);this.g.add(m);
        const b=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*1.1,len,12),metal);b.rotation.set(dz?Math.PI/2:0,0,dx?-Math.PI/2*dx:0);b.position.set(ox+dx*len/2,y,oz+dz*len/2);this.g.add(b);
        if(t.Ac){const c=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,len*.35,8),metal);c.rotation.x=Math.PI/2;c.position.set(ox+rad*3,y,oz+len*.17);this.g.add(c);}}}
    if(v.mgCaisse){const c=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,16,8),metal);c.rotation.x=Math.PI/2;c.position.set(v.W*.22,G.y0+v.H*.6,G.zN-v.H*.3+8);this.g.add(c);}
    // le train : roues, chenilles (le semi : des roues devant, des chenilles derrière ; le losange : la chenille fait le tour de la caisse)
    const rub=new THREE.MeshPhongMaterial({color:RUBBER,flatShading:true}),trk=new THREE.MeshPhongMaterial({color:TRACK,flatShading:true});const xs=v.W/2+2.6;
    const wheel=(z,r,w=5)=>{for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,16),rub);m.rotation.z=Math.PI/2;m.position.set(s*xs,r,z);this.g.add(m);}};
    const track=(z0,z1,h)=>{for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(5,h,z1-z0),trk);m.position.set(s*xs,h/2,(z0+z1)/2);this.g.add(m);}};
    if(C.train==='roues'){const n=Math.max(2,C.roues/2|0),r=Math.max(3,C.garde+v.H*.22);for(let k=0;k<n;k++)wheel(-v.L*.36+k*(v.L*.72)/Math.max(1,n-1),r);}
    else if(C.train==='semi'){wheel(v.L*.34,Math.max(3,C.garde+v.H*.2));track(-v.L*.48,v.L*.08,C.garde+v.H*.42);}
    else if(C.train==='losange'){const P=[[G.zF0,G.y0],[G.zN,G.yN+v.H*.25],[G.zF2,G.y1+2],[G.zR1,G.y1+2],[G.zR0,G.y0+v.H*.3]];for(const s of [-1,1])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const m=new THREE.Mesh(new THREE.BoxGeometry(7,4,L+3),trk);m.position.set(s*(v.W/2+3.5),(a[1]+b[1])/2,(a[0]+b[0])/2);m.rotation.x=-Math.atan2(b[1]-a[1],b[0]-a[0]);this.g.add(m);}}
    else track(-v.L*.47,v.L*.47,C.garde+v.H*.45);
    // l'habitacle (en coupe) : les boîtes, et des Meumeu à leurs postes
    if(see){for(const m of D.mods){const bx=m.blocks||[m.box];for(const b of bx){const g=new THREE.BoxGeometry(Math.max(.5,b.x1-b.x0),Math.max(.5,b.y1-b.y0),Math.max(.5,b.z1-b.z0));
        const isPerson=m.kind==='equipage'||m.kind==='passager';const mat=new THREE.MeshPhongMaterial({color:KCOL[m.kind]||0x999999,transparent:true,opacity:isPerson?.22:.85,flatShading:true});
        const mesh=new THREE.Mesh(g,mat);mesh.position.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);this.g.add(mesh);
        if(isPerson){const h=Math.min(28,(b.y1-b.y0)*.95),w=Math.min(b.x1-b.x0,b.z1-b.z0)*.42;const body=new THREE.Mesh(new THREE.CylinderGeometry(w*.55,w*.7,h*.62,10),new THREE.MeshPhongMaterial({color:0xf3eadc}));
          body.position.set((b.x0+b.x1)/2,b.y0+h*.31,(b.z0+b.z1)/2);this.g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(w*.62,12,10),new THREE.MeshPhongMaterial({color:0xf6efe2}));head.position.set(body.position.x,b.y0+h*.78,body.position.z);this.g.add(head);
          const ear=new THREE.Mesh(new THREE.SphereGeometry(w*.22,8,6),new THREE.MeshPhongMaterial({color:0x3a2c22}));ear.position.set(head.position.x,head.position.y+w*.18,head.position.z+w*.45);this.g.add(ear);}}}}
    this.R=Math.max(v.L,v.W*1.4)*.62+10;this.cy=(G.y1+(D.tur.length?Math.max(...D.tur.map(t=>t.T.h)):0))*.45;this.grid.position.y=0;this.render();}
  render(){const cv=this.cv,w=cv.clientWidth||600,h=cv.clientHeight||360;if(cv.width!==Math.round(w*devicePixelRatio)||cv.height!==Math.round(h*devicePixelRatio)){this.r.setPixelRatio(devicePixelRatio||1);this.r.setSize(w,h,false);}
    this.cam.aspect=w/Math.max(1,h);this.cam.updateProjectionMatrix();const d=this.R*2.6/this.zoom;
    this.cam.position.set(Math.sin(this.az)*Math.cos(this.el)*d,this.cy+Math.sin(this.el)*d,Math.cos(this.az)*Math.cos(this.el)*d);this.cam.lookAt(0,this.cy,0);this.r.render(this.scene,this.cam);}
}

// ---------- le bureau ----------
export class EnginsBureau{
  constructor(host,{world,editWeapon,save}){this.host=host;this.world=world;this.editWeapon=editWeapon;this.saveFn=save;this.mode='coupe';this.drag=null;this.selT=null;
    host.addEventListener('click',e=>this.click(e));host.addEventListener('input',e=>this.input(e));host.addEventListener('change',e=>this.change(e));
    addEventListener('resize',()=>{if(this.open)this.redraw();});}
  get open(){return !this.host.hidden;}
  show(v=null,name=null){this.host.hidden=false;this.v=v?JSON.parse(JSON.stringify(v)):exemple('chenM');this.name=name||'Char Meumeu 1';this.build();}
  close(){this.host.hidden=true;this.view?.dispose();this.view=null;}
  say(t,tone=''){const el=this.host.querySelector('.vz-say');if(el){el.textContent=t;el.className='vz-say '+tone;}}
  // ---------- la page ----------
  build(){const v=this.v,C=CHASSIS[v.chassis],M=MOTEURS[v.moteur.type];const D=deriveVeh(v);this.D=D;
    const R=(k,label,min,max,step,val,hint='',unit='')=>`<label class="dz-r"><span>${label}<em data-show="${k}">${fr(+val,step<1?1:0)}${unit}</em></span><div class="dz-range"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"><input type="number" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}"></div>${hint?`<small>${hint}</small>`:''}</label>`;
    const seg=(k,opts,cur)=>`<div class="seg sm">${opts.map(([val,name,title])=>`<button data-vz="${k}:${val}" class="${String(cur)===String(val)?'on':''}" title="${esc(title||'')}">${esc(name)}</button>`).join('')}</div>`;
    const plate=(k,label,ang=true)=>{const t=Array.isArray(v.pl[k])?v.pl[k]:[v.pl[k],90];return `<div class="vz-plate"><b>${label}</b>${R(`pl.${k}${ang?'.0':''}`,'Épaisseur',0,k==='toit'||k==='sol'?30:80,.1,t[0],'',' mm')}${ang?R(`pl.${k}.1`,'Angle (depuis la verticale)',0,75,1,t[1],'',' °'):''}</div>`;};
    const wopts=Object.entries(VEH_ARMES).map(([k,o])=>[k,o.name]);
    const turrets=v.tourelles.map((T,i)=>{const t=D.tur[i],A=t?.A;return `<details class="vz-item" ${this.selT===i?'open':''} data-t="${i}"><summary>Tourelle ${i+1} — ${esc(FORMES[T.forme]?.name||T.forme)} · ${esc(A?.name||'sans arme')} <button class="small ghost" data-vz="delT:${i}" title="Retirer">✕</button></summary>
        ${seg('forme:'+i,Object.entries(FORMES).map(([k,o])=>[k,o.name,o.desc]),T.forme)}
        <div class="row small">Arme : <select data-sel="arme:${i}"><option value="">— garder —</option>${wopts.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select> <button class="small" data-vz="editW:${i}">Concevoir l’arme…</button></div>
        <p class="quiet small">${A?`${esc(A.name)} · ${fr(A.kg,2)} kg · ${A.crew>1?'1 tireur + 1 chargeur':'1 tireur'} · couronne mini ${fr(A.Dmin,0)} cm`:''}${t?` · ${fr(t.mass,1)} kg · ${t.F.fixe?'fixe, débattement '+t.arc+'°':'rotation '+fr(t.trav,0)+' °/s'}`:''}</p>
        ${R(`t.${i}.D`,'Couronne (0 : la plus petite pour l’arme)',0,160,1,T.D,'',' cm')}${R(`t.${i}.h`,'Hauteur',0,80,1,T.h,'',' cm')}${T.forme==='boite'||T.forme==='hexagone'||T.forme==='casemate'||T.forme==='sponson'?R(`t.${i}.long`,'Longueur (× couronne)',.6,2.5,.05,T.long||1):''}
        ${R(`t.${i}.x`,'Place latérale',-v.W/2,v.W/2,1,T.x,'',' cm')}${R(`t.${i}.z`,'Place (avant +)',-v.L/2,v.L/2,1,T.z,'',' cm')}
        ${['av','fl','ar'].map(k=>`${R(`t.${i}.pl.${k}.0`,{av:'Avant',fl:'Flancs',ar:'Arrière'}[k]+' — épaisseur',0,80,.1,T.pl[k][0],'',' mm')}${R(`t.${i}.pl.${k}.1`,{av:'Avant',fl:'Flancs',ar:'Arrière'}[k]+' — angle',0,70,1,T.pl[k][1],'',' °')}`).join('')}
        ${FORMES[T.forme]?.ouverte?'':R(`t.${i}.pl.toit`,'Toit',0,30,.1,T.pl.toit,'',' mm')}
        <label class="row small"><input type="checkbox" data-chk="coax:${i}" ${T.coax?'checked':''}> Mitrailleuse coaxiale</label> <label class="row small"><input type="checkbox" data-chk="elec:${i}" ${T.elec?'checked':''}> Rotation électrique (cuivre)</label></details>`;}).join('');
    const rackW=v=>[...v.tourelles.map((T,i)=>[String(i),`Tourelle ${i+1} — ${armeVeh(T.arme)?.name||'?'}`]),...v.tourelles.map((T,i)=>T.coax?[`x${i}`,`Coaxiale de la tourelle ${i+1}`]:null).filter(Boolean),...(v.mgCaisse?[['c','Mitrailleuse de caisse']]:[])];
    const racks=(v.racks||[]).map((r,i)=>{const m=D.mods.find(x=>x.id==='r'+i);return `<div class="vz-item"><div class="row small"><b>Râtelier ${i+1}</b> <select data-sel="rti:${i}">${rackW(v).map(([k,n])=>`<option value="${k}" ${String(r.ti)===k?'selected':''}>${esc(n)}</option>`).join('')}</select> <button class="small ghost" data-vz="delR:${i}">✕</button></div>
        ${R(`r.${i}.n`,'Coups',1,String(r.ti)[0]==='x'||r.ti==='c'||armeVeh(r.ti==='c'?v.mgCaisse:v.tourelles[+r.ti]?.arme)?.D?.p?.mag>20?6000:240,1,r.n)}
        <p class="quiet small">${r.z==null?'Rangé par le bureau':'Placé à la main'}${m?` · ${fr((m.box.x1-m.box.x0)*(m.box.y1-m.box.y0)*(m.box.z1-m.box.z0)/1000,1)} L`:''} — faites-le glisser sur la vue de dessus${r.z!=null?' · <button class="small ghost" data-vz="autoR:'+i+'">rangement auto</button>':''}</p></div>`;}).join('');
    const exs=Object.entries(EXEMPLES).map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('');
    this.host.innerHTML=`<div class="dz vz" id="vz-root" role="dialog" aria-label="Bureau des engins">
      <header class="dz-head"><div><b>Bureau des engins</b><small>Châssis, caisse et plaques, moteur, essence, tourelles et leurs armes, râteliers, bancs, soute — tout tient dedans, ou le bureau le dit</small></div>
        <label class="dz-name">Nom <input id="vz-name" value="${esc(this.name)}" maxlength="34"></label>
        <label class="dz-name">Partir de <select id="vz-ex"><option value="">— un exemple —</option>${exs}</select></label>
        <button class="ghost" data-vz="close">Fermer</button></header>
      <div class="vz-body">
        <div class="vz-ctl">
          <details open><summary>Châssis</summary><div class="vz-cards">${Object.entries(CHASSIS).map(([k,o])=>`<button class="vz-card ${v.chassis===k?'on':''}" data-vz="chassis:${k}" title="${esc(o.desc)}"><b>${esc(o.name)}</b><small>${esc(o.ere)} · ${o.train}</small></button>`).join('')}</div>
            <p class="quiet small">${esc(C.desc)}</p></details>
          <details open><summary>Caisse</summary>${R('L','Longueur',C.L[0],C.L[2],1,v.L,'',' cm')}${R('W','Largeur',C.W[0],C.W[2],1,v.W,'',' cm')}${R('H','Hauteur',C.H[0],C.H[2],1,v.H,'',' cm')}
            ${R('sb','Flancs : part verticale (le reste s’incline)',0,1,.05,v.sb??C.sb??.45)}
            <label class="row small"><input type="checkbox" data-chk="ouvert" ${v.ouvert?'checked':''}> Caisse découverte (pas de toit : les bustes dépassent)</label></details>
          <details><summary>Blindage de la caisse</summary>${plate('av','Glacis (avant haut)')}${plate('avb','Avant bas')}${plate('fl','Flancs')}${plate('ar','Arrière')}${v.ouvert?'':plate('toit','Toit',false)}${plate('sol','Plancher',false)}</details>
          <details open><summary>Moteur et essence</summary>${seg('moteur',Object.entries(MOTEURS).map(([k,o])=>[k,o.name,o.desc]),v.moteur.type)}<p class="quiet small">${esc(M.desc)}</p>
            ${R('moteur.P','Puissance d’un moteur',M.P[0],M.P[2],5,v.moteur.P,'',' W')}${R('moteur.n','Moteurs couplés',1,8,1,v.moteur.n||1)}
            <div class="row small">Place : ${seg('pos',[['avant','avant'],['centre','centre'],['arriere','arrière']],v.moteur.pos)}</div>
            ${R('bidons',M.carbu==='charbon'?'Soute à charbon (caisses)':'Réservoir (bidons de 0,1 L)',0,400,1,v.bidons)}</details>
          <details open><summary>Tourelles (${v.tourelles.length})</summary>${turrets}<div class="row">${['cylindre','boite','cone','hexagone','dome','casemate','sponson','affut','ouverte'].map(f=>`<button class="small" data-vz="addT:${f}">+ ${esc(FORMES[f].name)}</button>`).join('')}</div></details>
          <details><summary>Mitrailleuse de caisse</summary><label class="row small"><input type="checkbox" data-chk="mgc" ${v.mgCaisse?'checked':''}> Une mitrailleuse dans la caisse (un mitrailleur à côté du conducteur)</label></details>
          <details open><summary>Râteliers (${(v.racks||[]).length})</summary>${racks}<button class="small" data-vz="addR">+ un râtelier</button></details>
          <details open><summary>Passagers et soute</summary>${R('passagers','Passagers (des bancs)',0,60,1,v.passagers||0)}${R('soute','Soute (caisses de ressources)',0,200,1,v.soute||0)}</details>
        </div>
        <div class="vz-mid"><div class="vz-3d"><canvas id="vz-c3d"></canvas><div class="vz-tools">${seg('view',[['ext','Extérieur'],['coupe','En coupe'],['blind','Épaisseurs']],this.mode)}<small class="quiet">glisser : tourner · molette : zoom · double-clic : recentrer</small></div></div>
          <div class="vz-top"><canvas id="vz-ctop"></canvas><small class="quiet">Vue de dessus (l’avant en haut) — faites glisser les tourelles et les râteliers</small></div></div>
        <div class="vz-side" id="vz-stats"></div>
      </div></div>`;
    this.view?.dispose();this.view=new VehView(this.host.querySelector('#vz-c3d'));this.bindTop();this.redraw();}
  // ---------- ce qui change sans refaire la page ----------
  redraw(){const D=deriveVeh(this.v);this.D=D;this.view?.set(D,this.mode);this.drawTop();this.stats();}
  stats(){const D=this.D,v=this.v,el=this.host.querySelector('#vz-stats');if(!el)return;const m=D.masses,tot=D.mass;
    const bar=Object.entries(m).filter(([,x])=>x>.01).map(([k,x])=>`<span style="flex:${x};background:${{blindage:'#8a8f6a',chassis:'#6a6f74',moteur:'#9aa0a6',armes:'#5c6266',munitions:'#e8bf3a',carburant:'#d0583a',equipage:'#4f9fd0',passagers:'#5fb36a',soute:'#a07a48'}[k]||'#888'}" title="${k} ${fr(x,1)} kg"></span>`).join('');
    const los=(k)=>{const f=D.G.faces.find(x=>x.id===k);return f?f.t/Math.max(.2,Math.cos(Math.min(85,f.a||0)*Math.PI/180)):0;};const fr0=los('av'),side=Math.max(los('flg'),0),rear=los('ar');
    // ce qui le perce à 30 m (nos armes de départ, et celles des Bèè)
    const W=this.world?.();const guns=W?Object.values(W.s.designs).filter(d=>d.status==='adopte'&&(d.f==='beee'||d.f==='meumeu')):[];const pen=d=>{try{const X=derive(d.p);return X.he?0:X.pen(X.at(30).v);}catch(e){return 0;}};
    const pierce=k=>guns.filter(d=>pen(d)>k).map(d=>d.name);
    const crew=D.crew.map(c=>({conducteur:'conducteur',tireur:'tireur',chargeur:'chargeur',mitrailleur:'mitrailleur'})[c.role]||c.role);
    const cnt=crew.reduce((a,r)=>(a[r]=(a[r]||0)+1,a),{});const res=Object.entries({...D.cout,...D.plein}).map(([k,x])=>`${fr(x,x<10?1:0)} ${k}`).join(' · ');
    el.innerHTML=`<h3>${esc(this.name)}</h3><p class="quiet small">${esc(D.C.name)} · ${fr(D.long,1)} × ${fr(D.large,1)} cases au sol</p>
      <div class="vz-kv"><span>Masse</span><b>${fr(tot,1)} kg</b></div><div class="vz-bar">${bar}</div>
      <div class="vz-kv"><span>Puissance</span><b>${fr(D.Pw,0)} W · ${fr(D.chT,1)} ch/t</b></div>
      <div class="vz-kv"><span>Vitesse tout-terrain</span><b>${fr(D.vmax,1)} cases/h <small>(≈ ${fr(D.vPhys*3.6,0)} km/h)</small></b></div>
      <div class="vz-kv"><span>Autonomie</span><b>${fr(D.range,0)} cases <small>(${fr(D.perCase*100,1)} ${D.carbu==='charbon'?'caisses de charbon':'bidons'} / 100 cases)</small></b></div>
      <div class="vz-kv"><span>Braquage</span><b>${D.pivot?`pivote à ${fr(D.pivot,0)} °/s`:`rayon ${fr(D.rmin,1)} cases`}</b></div>
      <div class="vz-kv"><span>Blindage (épaisseur vue)</span><b>avant ${fr(fr0,1)} · flanc ${fr(side,1)} · arrière ${fr(rear,1)} mm</b></div>
      <p class="small">${pierce(fr0).length?`<span class="warn">De face, percé à 30 m par : ${pierce(fr0).map(esc).join(', ')}.</span>`:'<span class="good">De face, aucune arme connue ne le perce à 30 m.</span>'}${pierce(side).length?` <span class="quiet">De flanc : ${pierce(side).map(esc).join(', ')}.</span>`:''}</p>
      <div class="vz-kv"><span>Équipage</span><b>${Object.entries(cnt).map(([r,n])=>`${n} ${r}${n>1?'s':''}`).join(', ')}</b></div>
      <div class="vz-kv"><span>Passagers · soute</span><b>${v.passagers||0} · ${v.soute||0} caisses</b></div>
      <div class="vz-kv"><span>Volume</span><b>${fr(D.lay.used/1000,1)} L occupés, ${fr(D.lay.libre/1000,1)} L libres</b></div>
      <div class="vz-kv"><span>Au garage</span><b>${D.heures} h</b></div><p class="small">${esc(res)}</p>
      ${D.errs.map(e=>`<p class="bad small">✗ ${esc(e)}</p>`).join('')}${D.warns.map(e=>`<p class="warn small">! ${esc(e)}</p>`).join('')}
      <div class="dz-go"><button data-vz="save" ${D.ok?'':'disabled'}>Enregistrer la conception</button><p class="vz-say quiet small"></p></div>
      <p class="quiet small vz-legend">${Object.entries(KNAME).map(([k,n])=>`<i style="background:#${KCOL[k].toString(16).padStart(6,'0')}"></i>${n}`).join(' ')}</p>`;}
  // ---------- la vue de dessus ----------
  topFrame(){const cv=this.host.querySelector('#vz-ctop');if(!cv)return null;const w=cv.clientWidth||300,h=cv.clientHeight||300,dpr=devicePixelRatio||1;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
    const v=this.v,s=Math.min((w-20)/(v.W+30),(h-20)/(v.L+16));return {cv,w,h,dpr,s,X:x=>w/2+x*s,Y:z=>h/2-z*s,ix:px=>(px-w/2)/s,iz:py=>(h/2-py)/s};}
  drawTop(){const F=this.topFrame();if(!F)return;const {cv,w,h,dpr,s,X,Y}=F,x=cv.getContext('2d'),D=this.D,v=this.v,G=D.G;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
    const css=k=>getComputedStyle(this.host).getPropertyValue(k).trim()||'#888';
    // la caisse (au sol), le toit
    x.fillStyle='#6e735033';x.strokeStyle='#6e7350';x.lineWidth=1.5;x.beginPath();x.rect(X(-v.W/2),Y(v.L/2),v.W*s,v.L*s);x.fill();x.stroke();
    x.setLineDash([4,3]);x.strokeStyle=css('--muted');x.strokeRect(X(-G.roof.hw),Y(G.roof.z1),2*G.roof.hw*s,(G.roof.z1-G.roof.z0)*s);x.setLineDash([]);
    x.fillStyle=css('--muted');x.font='11px system-ui';x.textAlign='center';x.fillText('avant',w/2,Y(v.L/2)-4);
    for(const m of D.mods){const bx=m.blocks||[m.box];for(const b of bx){x.fillStyle='#'+(KCOL[m.kind]||0x999999).toString(16).padStart(6,'0')+(m.kind==='equipage'||m.kind==='passager'?'88':'aa');x.fillRect(X(b.x0),Y(b.z1),(b.x1-b.x0)*s,(b.z1-b.z0)*s);}
      if(m.kind==='munitions'){x.fillStyle=css('--ink');x.font='bold 10px system-ui';x.fillText('R'+(+m.id.slice(1)+1),X((m.box.x0+m.box.x1)/2),Y((m.box.z0+m.box.z1)/2)+3);}}
    D.tur.forEach((t,i)=>{const T=t.T;x.strokeStyle=this.selT===i?css('--orange'):css('--teal');x.lineWidth=this.selT===i?3:2;x.beginPath();
      if(T.forme==='boite'||T.forme==='hexagone'||T.forme==='casemate'||T.forme==='sponson')x.rect(X(T.x-T.D/2),Y(T.z+T.D*(T.long||1)/2),T.D*s,T.D*(T.long||1)*s);else x.arc(X(T.x),Y(T.z),T.D/2*s,0,Math.PI*2);x.stroke();
      x.fillStyle=css('--ink');x.font='bold 12px system-ui';x.fillText(String(i+1),X(T.x),Y(T.z)+4);});}
  bindTop(){const cv=this.host.querySelector('#vz-ctop');if(!cv)return;
    cv.addEventListener('pointerdown',e=>{const F=this.topFrame();if(!F)return;const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,cx=F.ix(px),cz=F.iz(py),D=this.D;
      let hit=null;D.tur.forEach((t,i)=>{if(Math.hypot(cx-t.T.x,cz-t.T.z)<=Math.max(4,t.T.D/2))hit={kind:'t',i};});
      if(!hit)D.mods.forEach(m=>{if(m.kind==='munitions'&&cx>=m.box.x0&&cx<=m.box.x1&&cz>=m.box.z0&&cz<=m.box.z1)hit={kind:'r',i:+m.id.slice(1)};});
      if(!hit)return;this.drag=hit;if(hit.kind==='t')this.selT=hit.i;cv.setPointerCapture?.(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!this.drag)return;const F=this.topFrame(),r=cv.getBoundingClientRect(),v=this.v;const cx=clamp(F.ix(e.clientX-r.left),-v.W/2,v.W/2),cz=clamp(F.iz(e.clientY-r.top),-v.L/2,v.L/2);
      const o=this.drag.kind==='t'?v.tourelles[this.drag.i]:v.racks[this.drag.i];if(!o)return;o.x=Math.round(cx);o.z=Math.round(cz);this.redraw();});
    const up=()=>{if(this.drag){this.drag=null;this.build();}};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);}
  // ---------- les gestes ----------
  setPath(path,val){const v=this.v;const P=path.split('.');if(P[0]==='t'){const T=v.tourelles[+P[1]];if(!T)return;let o=T;for(let i=2;i<P.length-1;i++)o=o[P[i]];o[P.at(-1)]=val;return;}
    if(P[0]==='r'){const r=v.racks[+P[1]];if(r)r[P[2]]=val;return;}let o=v;for(let i=0;i<P.length-1;i++)o=o[P[i]];o[P.at(-1)]=val;}
  input(e){const k=e.target.dataset?.k;if(k==null)return;const val=+e.target.value;if(!isFinite(val))return;this.setPath(k,val);for(const el of this.host.querySelectorAll(`[data-k="${k}"]`))if(el!==e.target)el.value=val;
    const sh=this.host.querySelector(`[data-show="${k}"]`);if(sh)sh.textContent=fr(val,+e.target.step<1?1:0)+(sh.textContent.match(/[^\d,.-]+$/)?.[0]||'');if(k==='moteur.P'&&!this.v.moteur.P)return;this.redraw();}
  change(e){const t=e.target;if(t.id==='vz-name'){this.name=t.value.trim()||this.name;return;}
    if(t.id==='vz-ex'&&t.value){this.v=exemple(t.value);this.name=EXEMPLES[t.value];this.selT=null;this.build();return;}
    if(t.dataset.k!=null){this.build();return;}
    const sel=t.dataset.sel;if(sel){const [k,i]=sel.split(':');if(k==='arme'&&t.value){this.v.tourelles[+i].arme=VEH_ARMES[t.value].p();this.v.tourelles[+i].D=0;}if(k==='rti'){this.v.racks[+i].ti=/^\d+$/.test(t.value)?+t.value:t.value;}this.build();return;}
    const chk=t.dataset.chk;if(chk){const [k,i]=chk.split(':');const v=this.v;
      if(k==='ouvert')v.ouvert=t.checked;if(k==='mgc')v.mgCaisse=t.checked?VEH_ARMES.mitrailleuse.p():null;if(k==='coax')v.tourelles[+i].coax=t.checked?VEH_ARMES.mitrailleuse.p():null;if(k==='elec')v.tourelles[+i].elec=t.checked;
      if(!v.mgCaisse)v.racks=v.racks.filter(r=>r.ti!=='c');v.racks=v.racks.filter(r=>typeof r.ti!=='string'||r.ti[0]!=='x'||v.tourelles[+r.ti.slice(1)]?.coax);this.build();}}
  click(e){const b=e.target.closest('[data-vz]');if(!b)return;e.preventDefault();const [k,a,c]=b.dataset.vz.split(':');const v=this.v;
    if(k==='close'){this.close();return;}
    if(k==='view'){this.mode=a;for(const x of this.host.querySelectorAll('[data-vz^="view:"]'))x.classList.toggle('on',x.dataset.vz==='view:'+a);this.view?.set(this.D,this.mode);return;}
    if(k==='chassis'){const n=newVehicle(a);n.tourelles=v.tourelles;n.mgCaisse=v.mgCaisse;n.racks=v.racks;n.passagers=v.passagers;n.soute=v.soute;this.v=n;}
    else if(k==='moteur'){const M=MOTEURS[a];v.moteur.type=a;v.moteur.P=clamp(v.moteur.P,M.P[0],M.P[2]);}
    else if(k==='pos')v.moteur.pos=a;
    else if(k==='addT'){const T=newTurret(a,a==='affut'||a==='ouverte'?'mitrailleuse':'canon_court');T.z=Math.round(v.L*.05);if(a==='sponson')T.x=v.tourelles.some(o=>o.forme==='sponson'&&o.x<0)?Math.round(v.W/2):-Math.round(v.W/2);v.tourelles.push(T);this.selT=v.tourelles.length-1;
      v.racks.push({ti:v.tourelles.length-1,n:a==='affut'||a==='ouverte'?1000:40});}
    else if(k==='delT'){const i=+a;v.tourelles.splice(i,1);v.racks=v.racks.filter(r=>r.ti!==i&&r.ti!=='x'+i).map(r=>({...r,ti:typeof r.ti==='number'&&r.ti>i?r.ti-1:typeof r.ti==='string'&&r.ti[0]==='x'&&+r.ti.slice(1)>i?'x'+(+r.ti.slice(1)-1):r.ti}));this.selT=null;}
    else if(k==='forme'){v.tourelles[+a].forme=c;}
    else if(k==='addR'){const ti=v.tourelles.length?0:v.mgCaisse?'c':null;if(ti==null){this.say('Il faut d’abord une arme (une tourelle ou la mitrailleuse de caisse).','bad');return;}v.racks.push({ti,n:40});}
    else if(k==='delR')v.racks.splice(+a,1);
    else if(k==='autoR'){delete v.racks[+a].z;delete v.racks[+a].x;}
    else if(k==='editW'){const T=v.tourelles[+a];this.editWeapon?.(T.arme,`${armeVeh(T.arme)?.name||'Arme'} (engin)`,p=>{T.arme=p;T.D=0;this.host.hidden=false;this.build();},()=>{this.host.hidden=false;this.build();});this.host.hidden=true;return;}
    else if(k==='save'){const r=this.saveFn?.(JSON.parse(JSON.stringify(v)),this.name);this.say(r?.ok?r.text:(r?.why||['refusé']).join(' · '),r?.ok?'good':'bad');return;}
    this.build();}
}
