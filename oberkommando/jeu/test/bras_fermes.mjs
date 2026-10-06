// Les bras détachés des tenues et des Bèè (V12.5) : le corps sans bras et le bras gardent leur surface fermée — arêtes ouvertes avant/après (le modèle d’origine en a déjà quelques-unes pour l’élite)
const fs=await import('fs');const THREE=await import('../js/lib/three.module.js');const {geometryOf}=await import('../js/mesh3d.js');
const src=fs.readFileSync('js/scene3d.js','utf8');const grab=n=>{const i=src.indexOf(n);let d=0,j=src.indexOf('{',i);for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(!d)break;}}return src.slice(i,j+1);};
const code=grab('function capHoles')+'\n'+grab('function skinRig')+'\n'+src.slice(src.indexOf('const SKIN_ARM'),src.indexOf('};',src.indexOf('const SKIN_ARM'))+2)+'\nreturn {skinRig,SKIN_ARM};';
const {skinRig,SKIN_ARM}=new Function('THREE',code)(THREE);
const open=g=>{const P=g.attributes.position,I=g.index.array,k=v=>Math.round(P.getX(v)*2e4)+','+Math.round(P.getY(v)*2e4)+','+Math.round(P.getZ(v)*2e4),c=new Map();for(let t=0;t<I.length;t+=3)for(let q=0;q<3;q++){const a=k(I[t+q]),b=k(I[t+(q+1)%3]),e=a<b?a+'|'+b:b+'|'+a;c.set(e,(c.get(e)||0)+1);}let n=0;for(const v of c.values())if(v===1)n++;return n;};
for(const m of Object.keys(SKIN_ARM)){const J=JSON.parse(fs.readFileSync('assets3d/'+m+'.json','utf8'));const geo=geometryOf(J);geo.computeBoundingBox();const b=geo.boundingBox;const M={geo,ext:[b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z]};
  const R=skinRig(M,SKIN_ARM[m]);console.log(m,'modèle entier : arêtes ouvertes',open(geo),'· corps sans bras',open(R.body),'· bras',open(R.arm.geo));}
