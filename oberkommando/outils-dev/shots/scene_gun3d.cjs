const {main}=require('./harness.cjs');const path=require('path');
main(async({run,shot,wait,win})=>{
  await run(`window.confirm=()=>true;window.__errs=[];addEventListener('error',e=>__errs.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));addEventListener('unhandledrejection',e=>__errs.push('rej '+(e.reason&&e.reason.stack||e.reason)));`);
  await run(`document.querySelector('[data-act="new-dev"]').click();`);await wait(2000);
  const info=await run(`(async()=>{
    const THREE=await import('./js/lib/three.module.js');const {gunModel}=await import('./js/gun3d.js');
    const w=world();const ids=Object.keys(w.s.designs||{});
    const res=[];const cv=document.createElement('canvas');cv.id='gtest';cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;background:#2f3326';document.body.appendChild(cv);
    const R=new THREE.WebGLRenderer({canvas:cv,antialias:true});R.setPixelRatio(1);R.setSize(innerWidth,innerHeight,false);R.setScissorTest(true);R.setClearColor(0x2f3326);
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xfff0d6,0x555544,1.4));const dl=new THREE.DirectionalLight(0xffe6bd,2.2);dl.position.set(-200,300,250);sc.add(dl);
    const cols=4,rows=Math.ceil(ids.length/cols);window.__G=[];
    const W=innerWidth,H=innerHeight,cw=W/cols,ch=H/rows;
    R.setViewport(0,0,W,H);R.setScissor(0,0,W,H);R.clear();
    ids.forEach((id,i)=>{let D;try{D=w.W(id);}catch(e){res.push(id+': W '+e.message);return;}
      let m;try{m=gunModel(D);}catch(e){res.push(id+': '+e.stack.split('\\n').slice(0,3).join(' | '));return;}
      const mat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:50,specular:0x444444});const mesh=new THREE.Mesh(m.geo,mat);
      const bb=m.geo.boundingBox;const L=bb.max.x-bb.min.x,Hh=bb.max.y-bb.min.y;const c=bb.getCenter(new THREE.Vector3());mesh.position.sub(c);
      const g=new THREE.Group();g.add(mesh);g.rotation.y=-.5;sc.add(g);
      const cam=new THREE.PerspectiveCamera(28,cw/ch,1,8000);const dist=Math.max(L,Hh*cw/ch*1.0)*1.25/Math.tan(14*Math.PI/180)*0.5+200;cam.position.set(0,Hh*.15,dist);cam.lookAt(0,0,0);
      const x=(i%cols)*cw,y=H-(Math.floor(i/cols)+1)*ch;R.setViewport(x,y,cw,ch);R.setScissor(x,y,cw,ch);R.render(sc,cam);sc.remove(g);res.push(id+' '+D.name+': '+m.geo.attributes.position.count/3+' tris, L='+Math.round(L)+' mm');});
    return JSON.stringify({n:ids.length,res,errs:__errs});})()`);
  console.log(info);await wait(400);await shot('gun_sheet.png');
},{w:1600,h:1000,out:__dirname});
