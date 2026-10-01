// Utilisation (Linux ou Windows, Node ≥ 20, sans Electron) : npm i jpeg-js pngjs   puis
//   node --max-old-space-size=8000 outils/convertir-sans-electron.cjs outils/convertir.cjs <dossier-modèles> <dossier-sortie> [nom ...]
// Remplace le module « electron » pour lancer outils/convertir.cjs sous Node (Linux, sans Electron) : app minimal et nativeImage
// qui décode JPG/PNG en JS pur. toBitmap rend du BGRA, comme Skia sous Windows (convertir.cjs lit d[o+2] comme le rouge).
const Module=require('module'),fs=require('fs'),path=require('path');const jpeg=require(require.resolve('jpeg-js',{paths:[process.cwd(),__dirname]})),{PNG}=require(require.resolve('pngjs',{paths:[process.cwd(),__dirname]}));
function img(w,h,rgba){return {isEmpty:()=>!rgba,getSize:()=>({width:w,height:h}),
  resize:({width:W,height:H})=>{const o=Buffer.alloc(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      // moyenne de la boîte source (pas un simple échantillon : la couleur d'un coin doit être la couleur moyenne de la zone)
      const x0=Math.floor(x*w/W),x1=Math.max(x0+1,Math.floor((x+1)*w/W)),y0=Math.floor(y*h/H),y1=Math.max(y0+1,Math.floor((y+1)*h/H));let r=0,g=0,b=0,a=0,n=0;
      for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*w+xx)*4;r+=rgba[i];g+=rgba[i+1];b+=rgba[i+2];a+=rgba[i+3];n++;}
      const j=(y*W+x)*4;o[j]=r/n;o[j+1]=g/n;o[j+2]=b/n;o[j+3]=a/n;}return img(W,H,o);},
  toBitmap:()=>{const o=Buffer.alloc(w*h*4);for(let i=0;i<w*h*4;i+=4){o[i]=rgba[i+2];o[i+1]=rgba[i+1];o[i+2]=rgba[i];o[i+3]=rgba[i+3];}return o;}};}
const nativeImage={createFromPath(f){try{const d=fs.readFileSync(f);if(/\.png$/i.test(f)){const p=PNG.sync.read(d);return img(p.width,p.height,p.data);}
    const j=jpeg.decode(d,{useTArray:true,maxMemoryUsageInMB:2048,formatAsRGBA:true});return img(j.width,j.height,Buffer.from(j.data));}catch(e){console.log('image illisible',f,e.message);return img(0,0,null);}}};
const app={disableHardwareAcceleration(){},whenReady:()=>Promise.resolve(),quit(){}};
const orig=Module._load;Module._load=function(req,...a){if(req==='electron')return {app,nativeImage};return orig.call(this,req,...a);};
process.argv.splice(1,1);require(path.resolve(process.argv[1]));
