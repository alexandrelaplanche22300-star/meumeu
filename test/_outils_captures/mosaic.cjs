// une mosaïque 2 × 2 de recadrages : node mosaic.cjs out.png w h img1 x y w h ... (4 fois)
const {app,nativeImage}=require('electron');const fs=require('fs');
app.whenReady().then(()=>{const a=process.argv.slice(2);const out=a[0],W=+a[1],H=+a[2];const ims=[];for(let k=3;k+4<a.length;k+=5)ims.push(nativeImage.createFromPath(a[k]).crop({x:+a[k+1],y:+a[k+2],width:+a[k+3],height:+a[k+4]}).resize({width:W,height:H,quality:'best'}));
  const buf=Buffer.alloc(W*2*H*2*4);ims.forEach((im,i)=>{const b=im.toBitmap(),ox=(i%2)*W,oy=Math.floor(i/2)*H;for(let y=0;y<H;y++)b.copy(buf,((oy+y)*W*2+ox)*4,y*W*4,(y+1)*W*4);});
  fs.writeFileSync(out,nativeImage.createFromBitmap(buf,{width:W*2,height:H*2}).toPNG());console.log('ok');app.quit();});
