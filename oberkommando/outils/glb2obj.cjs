// Utilisation : node outils/glb2obj.cjs <modèle.glb> <dossier-sortie> <nom>   → <nom>.obj, <nom>.mtl et les textures, prêts pour convertir.cjs
// GLB → OBJ + MTL + textures (une pièce « o » par primitive), transformations des nœuds appliquées
const fs=require('fs'),path=require('path');const [src,outDir,name]=process.argv.slice(2);fs.mkdirSync(outDir,{recursive:true});
const f=fs.readFileSync(src);const jl=f.readUInt32LE(12);const J=JSON.parse(f.slice(20,20+jl).toString());let off=20+jl;const bl=f.readUInt32LE(off);const BIN=f.slice(off+8,off+8+bl);
const CN={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const acc=i=>{const A=J.accessors[i],V=J.bufferViews[A.bufferView],T=CN[A.componentType],n=NC[A.type];const start=(V.byteOffset||0)+(A.byteOffset||0);const stride=V.byteStride||n*T.BYTES_PER_ELEMENT;
  const out=new Float64Array(A.count*n);for(let k=0;k<A.count;k++)for(let c=0;c<n;c++){const o=start+k*stride+c*T.BYTES_PER_ELEMENT;out[k*n+c]=T===Float32Array?BIN.readFloatLE(o):T===Uint16Array?BIN.readUInt16LE(o):T===Uint32Array?BIN.readUInt32LE(o):T===Uint8Array?BIN.readUInt8(o):T===Int16Array?BIN.readInt16LE(o):BIN.readInt8(o);}
  if(A.normalized&&T!==Float32Array){const m=T===Uint8Array?255:T===Uint16Array?65535:T===Int16Array?32767:127;for(let i=0;i<out.length;i++)out[i]/=m;}return out;};
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
const trs=n=>{if(n.matrix)return n.matrix;const [tx,ty,tz]=n.translation||[0,0,0],[x,y,z,w]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1];
  return [(1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,(2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,(2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,tx,ty,tz,1];};
// les images
const imgFile=[];(J.images||[]).forEach((im,i)=>{const V=J.bufferViews[im.bufferView];const ext=/png/.test(im.mimeType)?'png':'jpg';const fn=`${name}_tex${i}.${ext}`;fs.writeFileSync(path.join(outDir,fn),BIN.slice(V.byteOffset||0,(V.byteOffset||0)+V.byteLength));imgFile.push(fn);});
let mtl='';(J.materials||[]).forEach((m,i)=>{const pb=m.pbrMetallicRoughness||{};const cf=pb.baseColorFactor||[1,1,1,1];mtl+=`newmtl m${i}\nKd ${cf[0]} ${cf[1]} ${cf[2]}\n`;const t=pb.baseColorTexture;if(t!=null){const src=J.textures[t.index].source;mtl+=`map_Kd ${imgFile[src]}\n`;}mtl+='\n';});
fs.writeFileSync(path.join(outDir,name+'.mtl'),mtl);
const L=[`mtllib ${name}.mtl`];let vbase=1,tbase=1,np=0;
const visit=(ni,M)=>{const n=J.nodes[ni];const W=mul(M,trs(n));if(n.mesh!=null){for(const p of J.meshes[n.mesh].primitives){const P=acc(p.attributes.POSITION),T=p.attributes.TEXCOORD_0!=null?acc(p.attributes.TEXCOORD_0):null;const I=p.indices!=null?acc(p.indices):Float64Array.from({length:P.length/3},(_,k)=>k);
    L.push(`o part_${np++}`);if(p.material!=null)L.push(`usemtl m${p.material}`);
    for(let k=0;k<P.length;k+=3){const x=P[k],y=P[k+1],z=P[k+2];L.push(`v ${W[0]*x+W[4]*y+W[8]*z+W[12]} ${W[1]*x+W[5]*y+W[9]*z+W[13]} ${W[2]*x+W[6]*y+W[10]*z+W[14]}`);}
    if(T)for(let k=0;k<T.length;k+=2)L.push(`vt ${T[k]} ${1-T[k+1]}`);   // glTF : v vers le bas ; OBJ : v vers le haut
    for(let k=0;k<I.length;k+=3){const a=I[k]+vbase,b=I[k+1]+vbase,c=I[k+2]+vbase;if(T){const ta=I[k]+tbase,tb=I[k+1]+tbase,tc=I[k+2]+tbase;L.push(`f ${a}/${ta} ${b}/${tb} ${c}/${tc}`);}else L.push(`f ${a} ${b} ${c}`);}
    vbase+=P.length/3;if(T)tbase+=T.length/2;}}for(const c of n.children||[])visit(c,W);};
const I4=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];for(const r of J.scenes[J.scene||0].nodes)visit(r,I4);
fs.writeFileSync(path.join(outDir,name+'.obj'),L.join('\n'));console.log(name,'pièces',np,'sommets',vbase-1,'images',imgFile.length);
