// Le corps d'un Meumeu (un Bèè est bâti pareil), en mètres. Un Meumeu mesure 30 cm, cornes comprises : une grosse tête
// (13 cm, presque la moitié de lui) faite d'un crâne et d'un large museau, deux petites cornes, deux oreilles rondes,
// pas de cou visible, un ventre en œuf, des bras et des jambes trapus qui finissent en sabots.
// Dedans, une physiologie de ruminant : un petit cerveau haut placé derrière les yeux, des fosses nasales qui remplissent le
// museau, des omoplates mais pas de clavicule, un cœur un peu à gauche, et quatre estomacs — la panse (énorme, à gauche),
// le bonnet, le feuillet, la caillette.
// Origine au sol entre les sabots ; y vers le haut, z vers l'avant (où il regarde), x vers sa droite.
// La même description sert à la simulation (où passe la balle, ce qu'elle traverse, ce qui saigne) et aux radiographies :
// ce que montre la fenêtre est exactement ce qui a été calculé.
//
// Formes : sph {c, r} ; ell {c, r:[rx,ry,rz]} ; cap {a, b, r} (un segment épaissi). `shell` : une coque (le crâne, les côtes).
// Natures : muscle, lung, organ, cns, bone, artery, vein, heart, air (une cavité d'air), airway (la trachée), eye.
// `bleed` : mL/s si le vaisseau est coupé net (à l'échelle humaine, ramené au cœur d'un Meumeu plus bas) ;
// `inelastic` : la cavité temporaire le déchire (foie, rate, rein, cerveau) ; les muscles et les poumons encaissent l'étirement.
export const SCALE=1;              // les formes sont écrites directement à la taille d'un Meumeu
export const BODY_H=.30;
export const BODY_KG=1.5;          // un Meumeu adulte : trapu, dense, 1,5 kg
export const BLOOD=105;            // mL de sang (7 % de la masse) : un petit corps se vide en quelques secondes par une grosse artère
export const RIB=.0062;            // l'écart d'une côte à l'autre (m)

const L=-1,R=1;
const SIDES=[R,L];
const dn=s=>s>0?'droit':'gauche',df=s=>s>0?'droite':'gauche';
const P=(id,name,kind,shape,o={})=>({id,name,kind,shape,...o});
const volOf=s=>s.t==='sph'?4/3*Math.PI*s.r**3:s.t==='ell'?4/3*Math.PI*s.r[0]*s.r[1]*s.r[2]:Math.PI*s.r*s.r*Math.hypot(s.a[0]-s.b[0],s.a[1]-s.b[1],s.a[2]-s.b[2])+4/3*Math.PI*s.r**3;
// Deux espèces, un même plan : le Meumeu (un bovin de peluche : grosse tête ronde, large museau, petites cornes en croissant,
// oreilles rondes) et le Bèè (une chèvre de peluche : tête plus étroite, museau allongé vers l'avant, cornes rabattues vers
// l'arrière, oreilles tombantes, une barbiche). Le squelette suit la radiographie : clavicules, radius et cubitus, tibia et
// péroné, trois doigts à chaque main, trois orteils à chaque pied, un bassin à larges ailes.
function build(sp){const bee=sp==='beee';
  const HEAD=bee?{t:'ell',c:[0,.243,-.006],r:[.033,.04,.031]}:{t:'ell',c:[0,.248,-.004],r:[.037,.044,.034]};
  const SNOUT=bee?{t:'ell',c:[0,.2,.022],r:[.03,.028,.035]}:{t:'ell',c:[0,.19,.012],r:[.039,.034,.037]};
  const horn=s=>bee?{t:'cap',a:[.018*s,.276,-.01],b:[.029*s,.293,-.036],r:.0065}:{t:'cap',a:[.021*s,.279,-.006],b:[.03*s,.301,.004],r:.0065};
  const ear=s=>bee?{t:'ell',c:[.05*s,.236,-.004],r:[.023,.01,.006]}:{t:'ell',c:[.053*s,.258,-.006],r:[.02,.017,.006]};
  const REGIONS=[
    {id:'tete',name:'tête',shape:HEAD},
    {id:'museau',name:'museau',shape:SNOUT},
    {id:'cou',name:'cou',shape:{t:'cap',a:[0,.158,-.004],b:[0,.19,-.006],r:.03}},
    {id:'thorax',name:'poitrail',shape:{t:'ell',c:[0,.148,0],r:[.054,.042,.044]}},
    {id:'abdomen',name:'ventre',shape:{t:'ell',c:[0,.105,.004],r:[.061,.047,.049]}},
    {id:'bassin',name:'bassin',shape:{t:'ell',c:[0,.075,-.002],r:[.052,.024,.042]}},
    ...SIDES.flatMap(s=>[
      {id:'corne'+s,name:'corne '+df(s),horn:1,side:s,shape:horn(s)},
      {id:'oreille'+s,name:'oreille '+df(s),side:s,shape:ear(s)},
      {id:'bras'+s,name:'bras '+dn(s),limb:'arm',side:s,shape:{t:'cap',a:[.05*s,.172,0],b:[.066*s,.132,.003],r:.019}},
      {id:'avbras'+s,name:'avant-bras '+dn(s),limb:'arm',side:s,shape:{t:'cap',a:[.066*s,.132,.003],b:[.078*s,.098,.006],r:.018}},
      {id:'main'+s,name:'main '+df(s),limb:'arm',hoof:1,side:s,shape:{t:'ell',c:[.081*s,.088,.007],r:[.019,.016,.019]}},
      {id:'cuisse'+s,name:'cuisse '+df(s),limb:'leg',side:s,shape:{t:'cap',a:[.032*s,.078,0],b:[.033*s,.044,.002],r:.024}},
      {id:'jambe'+s,name:'jambe '+df(s),limb:'leg',side:s,shape:{t:'cap',a:[.033*s,.044,.002],b:[.033*s,.022,.002],r:.023}},
      {id:'pied'+s,name:'pied '+dn(s),limb:'leg',hoof:1,side:s,shape:{t:'ell',c:[.033*s,.013,.003],r:[.024,.013,.024]}}]),
    ...(bee?[{id:'barbe',name:'barbiche',hair:1,shape:{t:'cap',a:[0,.172,.036],b:[0,.158,.04],r:.006}}]:[])];
  const eyeY=bee?.238:.242,eyeZ=bee?.024:.029,brainC=bee?[0,.252,-.012]:[0,.258,-.01],skull=bee?{t:'ell',c:[0,.245,-.008],r:[.031,.033,.028]}:{t:'ell',c:[0,.25,-.006],r:[.034,.036,.03]};
  const jaw=bee?{t:'ell',c:[0,.198,.022],r:[.027,.025,.031]}:{t:'ell',c:[0,.188,.012],r:[.034,.029,.032]};const nasal=bee?{t:'ell',c:[0,.2,.03],r:[.016,.015,.022]}:{t:'ell',c:[0,.19,.022],r:[.022,.018,.022]};
  const hornCore=s=>{const h=horn(s);return {...h,r:.0052};};
  const PARTS=[
    // le système nerveux : un petit cerveau haut placé, la moelle le long du dos
    P('cerveau','cerveau','cns',{t:'ell',c:brainC,r:bee?[.02,.018,.02]:[.022,.019,.021]},{inelastic:1,prio:9}),
    P('tronc','tronc cérébral','cns',{t:'cap',a:[0,.236,-.022],b:[0,.248,-.018],r:.0045},{prio:10}),
    P('moelle','moelle épinière','cns',{t:'cap',a:[0,.236,-.024],b:[0,.07,-.036],r:.0022},{prio:10}),
    ...SIDES.map(s=>P('oeil'+s,'œil '+dn(s),'eye',{t:'sph',c:[.02*s,eyeY,eyeZ],r:.0062},{prio:7,side:s})),
    // les os
    P('crane','crâne','bone',skull,{shell:.0028,prio:5}),
    P('machoire','os du museau et mâchoire','bone',jaw,{shell:.0025,holes:.45,prio:5}),
    P('rachis','colonne vertébrale','bone',{t:'cap',a:[0,.236,-.026],b:[0,.07,-.036],r:.0055},{prio:5}),
    P('cotes','côtes','bone',{t:'ell',c:[0,.148,.001],r:[.05,.039,.041]},{shell:.003,ribs:1,prio:5}),
    P('sternum','sternum','bone',{t:'cap',a:[0,.128,.04],b:[0,.172,.036],r:.0035},{prio:5}),
    P('bassinos','os du bassin','bone',{t:'ell',c:[0,.075,-.004],r:[.049,.021,.037]},{shell:.0035,holes:.3,prio:5}),
    ...SIDES.flatMap(s=>[
      P('corneos'+s,'corne '+df(s),'bone',hornCore(s),{prio:5,horn:1,side:s}),
      P('clav'+s,'clavicule '+df(s),'bone',{t:'cap',a:[.008*s,.176,.03],b:[.046*s,.178,.012],r:.0024},{prio:5,limb:'arm',side:s}),
      P('omo'+s,'omoplate '+df(s),'bone',{t:'ell',c:[.036*s,.165,-.03],r:[.017,.022,.004]},{prio:5,limb:'arm',side:s}),
      P('humerus'+s,'humérus '+dn(s),'bone',{t:'cap',a:[.052*s,.17,0],b:[.066*s,.133,.003],r:.0045},{prio:5,limb:'arm',side:s}),
      P('radius'+s,'radius '+dn(s),'bone',{t:'cap',a:[.067*s,.13,.006],b:[.077*s,.1,.009],r:.0033},{prio:5,limb:'arm',side:s}),
      P('cubitus'+s,'cubitus '+dn(s),'bone',{t:'cap',a:[.064*s,.13,-.002],b:[.074*s,.1,.001],r:.003},{prio:5,limb:'arm',side:s}),
      P('sabotav'+s,'os de la main '+df(s),'bone',{t:'ell',c:[.08*s,.092,.006],r:[.009,.006,.009]},{prio:5,limb:'arm',side:s}),
      ...[-1,0,1].map(k=>P('doigt'+s+'_'+k,'doigts de la main '+df(s),'bone',{t:'cap',a:[(.08+k*.007)*s,.086,.01],b:[(.081+k*.008)*s,.075,.016],r:.0017},{prio:5,limb:'arm',side:s})),
      P('femur'+s,'fémur '+dn(s),'bone',{t:'cap',a:[.032*s,.078,0],b:[.033*s,.045,.002],r:.0055},{prio:5,limb:'leg',side:s,walk:1}),
      P('tibia'+s,'tibia '+dn(s),'bone',{t:'cap',a:[.031*s,.043,.004],b:[.031*s,.02,.004],r:.0045},{prio:5,limb:'leg',side:s,walk:1}),
      P('perone'+s,'péroné '+dn(s),'bone',{t:'cap',a:[.038*s,.042,-.003],b:[.038*s,.021,-.003],r:.0025},{prio:5,limb:'leg',side:s}),
      P('sabotar'+s,'os du pied '+dn(s),'bone',{t:'ell',c:[.033*s,.012,.002],r:[.011,.006,.011]},{prio:5,limb:'leg',side:s,walk:1}),
      ...[-1,0,1].map(k=>P('orteil'+s+'_'+k,'orteils du pied '+dn(s),'bone',{t:'cap',a:[(.033+k*.008)*s,.008,.01],b:[(.034+k*.009)*s,.006,.02],r:.0017},{prio:5,limb:'leg',side:s}))]),
    // le museau : de l'air, la trachée qui descend
    P('nasales','fosses nasales','air',nasal,{prio:4,bleed:2}),
    P('trachee','trachée','airway',{t:'cap',a:[0,bee?.19:.2,.01],b:[0,.165,.002],r:.0035},{prio:6,bleed:1}),
    // le cœur, les poumons
    P('coeur','cœur','heart',{t:'ell',c:[-.008,.153,.012],r:[.015,.017,.014]},{prio:8,bleed:110}),
    P('poumonG','poumon gauche','lung',{t:'ell',c:[-.026,.157,-.004],r:[.02,.029,.028]},{prio:6,bleed:4,lung:L}),
    P('poumonD','poumon droit','lung',{t:'ell',c:[.025,.157,-.004],r:[.022,.029,.028]},{prio:6,bleed:4,lung:R}),
    // le ventre : le foie à droite, la rate à gauche, les quatre estomacs, les reins, les intestins
    P('foie','foie','organ',{t:'ell',c:[.024,.128,.006],r:[.022,.014,.024]},{prio:6,bleed:12,inelastic:1}),
    P('rate','rate','organ',{t:'ell',c:[-.043,.128,-.012],r:[.006,.016,.012]},{prio:6,bleed:9,inelastic:1}),
    P('panse','panse','organ',{t:'ell',c:[-.02,.103,-.002],r:[.035,.036,.036]},{prio:6,bleed:3,gut:1}),
    P('bonnet','bonnet','organ',{t:'ell',c:[-.006,.127,.022],r:[.012,.011,.011]},{prio:6,bleed:2,gut:1}),
    P('feuillet','feuillet','organ',{t:'ell',c:[.026,.108,.02],r:[.013,.012,.012]},{prio:6,bleed:2,gut:1}),
    P('caillette','caillette','organ',{t:'ell',c:[.02,.09,.028],r:[.016,.01,.014]},{prio:6,bleed:2,gut:1}),
    P('reinD','rein droit','organ',{t:'ell',c:[.02,.108,-.032],r:[.007,.011,.006]},{prio:6,bleed:6,inelastic:1}),
    P('reinG','rein gauche','organ',{t:'ell',c:[-.02,.113,-.032],r:[.007,.011,.006]},{prio:6,bleed:6,inelastic:1}),
    P('intestins','intestins','organ',{t:'ell',c:[.018,.08,.01],r:[.028,.018,.028]},{prio:6,bleed:3,gut:1}),
    P('vessie','vessie','organ',{t:'sph',c:[0,.066,.022],r:.009},{prio:6,bleed:1}),
    // les gros vaisseaux
    P('aorte','aorte','artery',{t:'cap',a:[-.004,.162,-.02],b:[-.004,.074,-.029],r:.0033},{prio:7,bleed:150}),
    P('crosse','crosse de l’aorte','artery',{t:'cap',a:[-.004,.162,-.02],b:[-.008,.166,.008],r:.0033},{prio:7,bleed:150}),
    P('cave','veine cave','vein',{t:'cap',a:[.006,.162,-.018],b:[.006,.074,-.027],r:.0036},{prio:7,bleed:60}),
    ...SIDES.flatMap(s=>[
      P('carotide'+s,'carotide '+df(s),'artery',{t:'cap',a:[.008*s,.166,.004],b:[.012*s,.222,0],r:.0014},{prio:7,bleed:40}),
      P('jugulaire'+s,'jugulaire '+df(s),'vein',{t:'cap',a:[.015*s,.164,.002],b:[.019*s,.222,-.004],r:.0017},{prio:7,bleed:14}),
      P('sousclav'+s,'artère sous-clavière '+df(s),'artery',{t:'cap',a:[.006*s,.166,-.002],b:[.048*s,.172,.002],r:.0014},{prio:7,bleed:30}),
      P('humerale'+s,'artère humérale '+df(s),'artery',{t:'cap',a:[.05*s,.17,.006],b:[.074*s,.102,.009],r:.0012},{prio:7,bleed:10,limb:'arm',side:s}),
      P('iliaque'+s,'artère iliaque '+df(s),'artery',{t:'cap',a:[-.002,.076,-.028],b:[.028*s,.07,.006],r:.0019},{prio:7,bleed:35}),
      P('femorale'+s,'artère fémorale '+df(s),'artery',{t:'cap',a:[.029*s,.072,.01],b:[.032*s,.028,.01],r:.0014},{prio:7,bleed:30,limb:'leg',side:s})])];
  // les volumes ; les saignements ramenés au cœur d'un Meumeu (le débit suit la masse à la puissance 0,75)
  const flow=Math.pow(BODY_KG/70,.75);for(const p of PARTS){if(p.bleed)p.bleed*=flow;const s=p.shape;p.vol=volOf(s);
    p.size=2*(s.t==='ell'?Math.max(...s.r):s.t==='cap'?Math.max(s.r,Math.hypot(s.a[0]-s.b[0],s.a[1]-s.b[1],s.a[2]-s.b[2])/2):s.r);}
  for(const r of REGIONS)r.vol=volOf(r.shape);
  return {sp,REGIONS,PARTS,PART:Object.fromEntries(PARTS.map(p=>[p.id,p])),REGION:Object.fromEntries(REGIONS.map(r=>[r.id,r])),
    INELASTIC:PARTS.filter(p=>p.inelastic||p.kind==='heart'),VESSELS:PARTS.filter(p=>p.kind==='artery'||p.kind==='vein')};}
// Une anatomie quadrupède pour la faune : les organes et vaisseaux suivent les volumes physiques,
// les membres avant et arrière se séparent le long du corps. La même géométrie sert au tir et à la vue 3D.
function quadruped(base){const point=([x,y,z])=>[x,.08+(y-.12)*.5+z*.14,(y-.12)*.95+z*.4];
  const shape=s=>s.t==='cap'?{...s,a:point(s.a),b:point(s.b)}:s.t==='sph'?{...s,c:point(s.c)}:{...s,c:point(s.c),r:[s.r[0],s.r[1]*.5+s.r[2]*.14,s.r[1]*.95+s.r[2]*.4]};
  const REGIONS=base.REGIONS.map(r=>({...r,shape:shape(r.shape)}));const PARTS=base.PARTS.map(p=>({...p,shape:shape(p.shape)}));
  return {sp:'wild',REGIONS,PARTS,PART:Object.fromEntries(PARTS.map(p=>[p.id,p])),REGION:Object.fromEntries(REGIONS.map(r=>[r.id,r])),INELASTIC:PARTS.filter(p=>p.inelastic||p.kind==='heart'),VESSELS:PARTS.filter(p=>p.kind==='artery'||p.kind==='vein')};}
export const BODIES={meumeu:build('meumeu'),beee:build('beee')};BODIES.wild=quadruped(BODIES.beee);
// le corps en cours : la balistique, la santé et les rendus travaillent sur celui-ci ; on change d'espèce avant chaque tir
export let SPECIES='meumeu',REGIONS=BODIES.meumeu.REGIONS,PARTS=BODIES.meumeu.PARTS,PART=BODIES.meumeu.PART,REGION=BODIES.meumeu.REGION,INELASTIC=BODIES.meumeu.INELASTIC,VESSELS=BODIES.meumeu.VESSELS;
export function setSpecies(f){const B=BODIES[f==='wild'?'wild':f==='beee'?'beee':'meumeu'];if(B.sp===SPECIES)return;SPECIES=B.sp;REGIONS=B.REGIONS;PARTS=B.PARTS;PART=B.PART;REGION=B.REGION;INELASTIC=B.INELASTIC;VESSELS=B.VESSELS;}
export const MUSCLE_BLEED=.06;    // mL/s par cm³ de muscle broyé, à l'échelle d'un Meumeu
// la densité (g/cm³) et la résistance de chaque nature, pour la balle qui la traverse
export const TISSUE={muscle:{rho:1.04,k:1},lung:{rho:.45,k:.6},organ:{rho:1.05,k:1},cns:{rho:1.04,k:1},bone:{rho:1.9,k:2.6},artery:{rho:1.05,k:1},vein:{rho:1.05,k:1},heart:{rho:1.05,k:1.05},
  air:{rho:.05,k:.1},airway:{rho:.6,k:.7},eye:{rho:1.01,k:.9}};

// ---------- la géométrie ----------
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function segDist(p,a,b){const ab=sub(b,a),ap=sub(p,a);const t=Math.max(0,Math.min(1,dot(ap,ab)/dot(ab,ab)));const q=[a[0]+ab[0]*t-p[0],a[1]+ab[1]*t-p[1],a[2]+ab[2]*t-p[2]];return Math.hypot(q[0],q[1],q[2]);}
// « à quelle profondeur » un point est dans une forme : > 0 dedans (en mètres, approché), < 0 dehors
export function depth(s,p){
  if(s.t==='sph'){const d=Math.hypot(p[0]-s.c[0],p[1]-s.c[1],p[2]-s.c[2]);return s.r-d;}
  if(s.t==='cap')return s.r-segDist(p,s.a,s.b);
  const q=[(p[0]-s.c[0])/s.r[0],(p[1]-s.c[1])/s.r[1],(p[2]-s.c[2])/s.r[2]];const n=Math.hypot(q[0],q[1],q[2]);return (1-n)*Math.min(s.r[0],s.r[1],s.r[2]);}
// La boîte englobante d'une forme (calculée une fois) : un point hors de la boîte n'est pas dans la forme — on évite le calcul exact (mesuré : un quart
// du temps d'un combat passait dans depth(), chaque pas de chaque balle testant toutes les parties du corps). shapeNear(s,p,t) : le point PEUT être
// à moins de t de la forme (pour l'ellipsoïde, la « profondeur » approchée vaut (n−1)·r_min : la marge par axe est t·r_axe/r_min, prudente).
const BBOX=new WeakMap();
function bboxOf(s){let b=BBOX.get(s);if(b)return b;
  if(s.t==='sph')b=[s.c[0]-s.r,s.c[1]-s.r,s.c[2]-s.r,s.c[0]+s.r,s.c[1]+s.r,s.c[2]+s.r,1,1,1];
  else if(s.t==='cap')b=[Math.min(s.a[0],s.b[0])-s.r,Math.min(s.a[1],s.b[1])-s.r,Math.min(s.a[2],s.b[2])-s.r,Math.max(s.a[0],s.b[0])+s.r,Math.max(s.a[1],s.b[1])+s.r,Math.max(s.a[2],s.b[2])+s.r,1,1,1];
  else{const m=Math.min(s.r[0],s.r[1],s.r[2]);b=[s.c[0]-s.r[0],s.c[1]-s.r[1],s.c[2]-s.r[2],s.c[0]+s.r[0],s.c[1]+s.r[1],s.c[2]+s.r[2],s.r[0]/m,s.r[1]/m,s.r[2]/m];}
  BBOX.set(s,b);return b;}
export function shapeNear(s,p,t=0){const b=bboxOf(s);return p[0]>=b[0]-t*b[6]&&p[0]<=b[3]+t*b[6]&&p[1]>=b[1]-t*b[7]&&p[1]<=b[4]+t*b[7]&&p[2]>=b[2]-t*b[8]&&p[2]<=b[5]+t*b[8];}
export function inShape(part,p){if(!shapeNear(part.shape,p))return false;const d=depth(part.shape,p);if(d<0)return false;if(part.shell&&d>part.shell)return false;
  if(part.ribs&&((p[1]/RIB%1)+1)%1>.52)return false;                           // entre deux côtes, rien
  if(part.holes&&((p[0]*103+p[2]*138)%1+1)%1<part.holes)return false;          // le bassin, le museau ont des trous
  return true;}
// la région de l'enveloppe qui contient le point (la plus profonde), ou null
export function regionAt(p){let best=null,bd=0;for(const r of REGIONS){if(!shapeNear(r.shape,p))continue;const d=depth(r.shape,p);if(d>=0&&(best===null||d>bd)){best=r;bd=d;}}return best;}
// la structure interne la plus importante au point (un vaisseau passe avant un organe, un organe avant l'os, etc.)
export function partAt(p){let best=null;for(const s of PARTS){if(best&&s.prio<best.prio)continue;if(inShape(s,p)&&(!best||s.prio>best.prio))best=s;}return best;}
// la distance d'un point à la surface d'une structure (pour la cavité temporaire)
export function distTo(s,p){return Math.max(0,-depth(s.shape,p));}

// Les cibles de visée : là où un tireur vise selon la posture (le centre de ce qu'il voit : entre le ventre et la tête)
export const AIM={debout:.15,accroupi:.11,couche:.04};
// ce qu'on voit de lui (largeur, hauteur, en m) — pour les éclats
export const SILH={debout:[.17,.3],accroupi:[.17,.22],couche:[.17,.09]};
