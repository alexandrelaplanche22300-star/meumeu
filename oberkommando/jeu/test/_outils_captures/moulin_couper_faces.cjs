// retire de la pièce « tour » du moulin des triangles par leur numéro (le faceIndex d'un lancer de rayon, rayon2.cjs) — node moulin_couper_faces.cjs <json> 790,791
const fs=require('fs');const F=process.argv[2],kill=new Set(process.argv[3].split(',').map(Number));const J=JSON.parse(fs.readFileSync(F,'utf8'));const B=s=>Buffer.from(s,'base64');const part=J.parts.find(p=>p.n==='tour');
const ib=B(part.i),idx=new Uint16Array(ib.buffer.slice(ib.byteOffset,ib.byteOffset+ib.length));const keep=[];let cut=0;
for(let t=0;t<idx.length/3;t++){if(kill.has(t)){cut++;continue;}keep.push(idx[3*t],idx[3*t+1],idx[3*t+2]);}
part.i=Buffer.from(new Uint16Array(keep).buffer).toString('base64');J.tris-=cut;part.tris-=cut;fs.writeFileSync(F,JSON.stringify(J));console.log('triangles retirés',cut,'· tour',part.tris);
