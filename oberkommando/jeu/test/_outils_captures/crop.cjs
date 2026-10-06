const {app,nativeImage}=require('electron');const fs=require('fs');
app.whenReady().then(()=>{const [src,x,y,w,h,k,out]=process.argv.slice(2);const img=nativeImage.createFromPath(src).crop({x:+x,y:+y,width:+w,height:+h});fs.writeFileSync(out,img.resize({width:Math.round(w*k),quality:'best'}).toPNG());console.log('ok',out);app.quit();});
