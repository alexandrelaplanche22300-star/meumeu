// L'éclairage des modèles : sur la même image, la luminance rendue des pixels des modèles comparée à leur albedo (même scène, rendue avec une
// lumière blanche uniforme d'intensité π, qui montre exactement la couleur des sommets). Écrit aussi la géométrie caméra / soleil.
const {main}=require('./harness.cjs');
const TAG=process.env.TAG||'avant';
main(async({run,shot,wait})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);for(let k=0;k<60;k++){await wait(250);if(await run('document.body.innerText.includes("Partie de test prête")'))break;}await wait(800);
  await run(`document.querySelector('.speeds [data-speed="0"]')?.click();`);
  const r=await run(`(async()=>{const w=world();w.s.fog=false;w.s.solar=13;const cap=w.capital();view.zoom=1.1;view.lookAt(cap.i+3,cap.j+3);
    for(let i=0;i<3;i++)view.draw(.016);const S=view.scene3d;
    const stat=()=>{view.draw(.016);const cv=S.cv,c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const x=c.getContext('2d');x.drawImage(cv,0,0);return x.getImageData(0,0,c.width,c.height).data;};
    const L=(r,g,b)=>.2126*r+.7152*g+.0722*b;
    const A=stat();
    // l'albedo : lumière blanche uniforme d'intensité π, pas de soleil
    const h0={i:S.hemi.intensity,c:S.hemi.color.getHex(),g:S.hemi.groundColor.getHex()},s0=S.sun.intensity;
    S.hemi.intensity=Math.PI;S.hemi.color.setHex(0xffffff);S.hemi.groundColor.setHex(0xffffff);S.sun.intensity=0;const B=stat();
    S.hemi.intensity=h0.i;S.hemi.color.setHex(h0.c);S.hemi.groundColor.setHex(h0.g);S.sun.intensity=s0;view.draw(.016);
    let n=0,la=0,lb=0,ra=0,rb=0,sh=0;for(let i=0;i<A.length;i+=4){if(A[i+3]>40&&A[i+3]<170&&B[i+3]<170)sh++;if(A[i+3]<250||B[i+3]<250)continue;n++;la+=L(A[i],A[i+1],A[i+2]);lb+=L(B[i],B[i+1],B[i+2]);
      const sa=A[i]+A[i+1]+A[i+2]+1,sb=B[i]+B[i+1]+B[i+2]+1;ra+=(A[i]-A[i+2])/sa;rb+=(B[i]-B[i+2])/sb;}
    const cam=S.cam,dir=cam.getWorldDirection(new cam.position.constructor());const sd=S.sun.position.clone().sub(S.sun.target.position).normalize();
    const faces={'+X':[1,0,0],'+Z':[0,0,1],'-X':[-1,0,0],'-Z':[0,0,-1],'haut':[0,1,0]};const seen={},lit={};
    for(const [k,n2] of Object.entries(faces)){seen[k]=+(-(dir.x*n2[0]+dir.y*n2[1]+dir.z*n2[2])).toFixed(2);lit[k]=+(sd.x*n2[0]+sd.y*n2[1]+sd.z*n2[2]).toFixed(2);}
    return JSON.stringify({pixels:n,luminance_rendu:+(la/n).toFixed(1),luminance_albedo:+(lb/n).toFixed(1),rapport:+(la/lb).toFixed(3),orange_rendu:+(ra/n).toFixed(3),orange_albedo:+(rb/n).toFixed(3),
      part_ombre:+(sh/(A.length/4)).toFixed(4),face_vue_par_camera:seen,face_eclairee_par_soleil:lit,errs:__errs});})()`);
  console.log(r);await wait(3500);await shot('lumiere_'+TAG+'.png');
},{w:1400,h:860,out:__dirname});
