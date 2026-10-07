// Banc de captures « carte mer » : charge chaque sauvegarde (SAVES=f1,f2… dans jeu/test/_saves), relève l'état de la partie, repère les lieux
// intéressants (capitales, villes alliées et bèè, plages fortifiées, flottes, débarquements, combats, trains) et les photographie en 3D.
// Sortie : OUT/<sauvegarde>_<n>_<lieu>.jpg et OUT/manifeste.json (légendes + chiffres). Lancer SANS ELECTRON_RUN_AS_NODE.
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');
const SAVES=(process.env.SAVES||'').split(',').filter(Boolean);const OUT=process.env.OUT||path.join(__dirname,'mer');fs.mkdirSync(OUT,{recursive:true});
const man=fs.existsSync(path.join(OUT,'manifeste.json'))?JSON.parse(fs.readFileSync(path.join(OUT,'manifeste.json'),'utf8')):[];
main(async({win,run,wait,logs})=>{
  const jpg=async(name,caption,meta)=>{await wait(250);const img=await win.webContents.capturePage();fs.writeFileSync(path.join(OUT,name),img.toJPEG(84));man.push({file:name,caption,...meta});console.log('  capture',name,'·',caption);};
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));window.confirm=()=>true;0;`);await wait(1500);
  for(const file of SAVES){const tag=file.replace(/\.json$/,'').replace(/[\/\\]/g,'_');
    const day=await run(`(async()=>{const d=await (await fetch('test/_saves/${file}')).text();return window.__load(d);})()`);
    console.log('  sauvegarde automatique :',await run(`(async()=>{const d=await (await fetch('test/_saves/${file}')).text();try{localStorage.setItem('okm-quota',d);localStorage.removeItem('okm-quota');return 'tient ('+(d.length/1e6).toFixed(1)+' M caractères)';}catch(e){return 'REFUSÉE : '+e.name+' ('+(d.length/1e6).toFixed(1)+' M caractères)';}})()`));
    await run(`document.querySelector('.speeds [data-speed="1"]')?.click();(async()=>{if(!view.o3)await view.set3d(true);})();0;`);await wait(7000);
    await run(`document.querySelector('.speeds [data-speed="0"]')?.click();0;`);
    const info=JSON.parse(await run(`(async()=>{const D=await import('./js/data.js');const w=world(),s=w.s,N=w.N,BD=D.BUILDINGS;const alive=u=>u.hp>0&&u.h?.state!=='mort';
      const dense=(L,R)=>{let best=null,bn=0;const S=L.length>1500?L.filter((_,i)=>i%Math.ceil(L.length/1500)===0):L;for(const a of S){let c=0;for(const b of L)if(Math.abs(a.x-b.x)<R&&Math.abs(a.y-b.y)<R)c++;if(c>bn){bn=c;best=a;}}return best?{x:best.x,y:best.y,n:bn}:null;};
      const spots=[];const add=(k,x,y,z,o={})=>spots.push({k,x,y,z,...o});
      const cap=w.capital();if(cap)add('capitale meumeu (joueur)',cap.i+2,cap.j+2,1.0,{fog:true});
      const ac=s.buildings.filter(b=>b.ally&&b.k==='centre'&&!b.ruin&&b.done);if(ac[0])add('ville principale de l’allié (IA meumeu)',ac[0].i+2,ac[0].j+2,1.0,{fog:true});if(ac[1])add('autre ville de l’allié',ac[1].i+2,ac[1].j+2,1.1,{fog:true});
      if(cap)add('l’île meumeu de haut',cap.i+2,cap.j+2,.4,{fog:true,elev:.75});
      const sold=s.units.filter(u=>u.f==='meumeu'&&alive(u)&&u.k!=='villageois'&&!u.inBarracks);const sd=dense(sold,8);if(sd&&sd.n>=4)add('gros plan : soldats meumeu ('+sd.n+' groupés)',sd.x,sd.y,2.4,{fog:true,yaw:-.25,elev:.38});
      const bc=s.beee.cities.filter(c=>!c.fallen);if(bc[0])add('capitale bèè '+bc[0].name,bc[0].x,bc[0].y,.9,{yaw:.5,elev:.5});if(bc[1])add('ville bèè '+bc[1].name,bc[1].x,bc[1].y,1.0);
      const bk=s.buildings.filter(b=>b.f==='beee'&&BD[b.k]?.bunker&&!b.ruin).map(b=>({x:b.i+1,y:b.j+1}));const bkd=dense(bk,18);if(bkd)add('côte fortifiée bèè ('+bkd.n+' bunkers à moins de 18 cases)',bkd.x,bkd.y,1.0,{yaw:-.6,elev:.42});
      const boats=s.vehicles.filter(v=>(v.k==='barge'||v.k==='grande_barge'||v.k==='bateau_bee')&&v.hp>0&&!v.dead);const me=boats.filter(v=>v.k!=='bateau_bee'),be=boats.filter(v=>v.k==='bateau_bee');
      const bd=dense(be,25);if(bd)add('flotte bèè ('+bd.n+' bateaux groupés)',bd.x,bd.y,.85,{yaw:.3,elev:.5});const md=dense(me,25);if(md)add('barges meumeu ('+md.n+' groupées)',md.x,md.y,.95,{yaw:-.3,elev:.5});
      for(const op of (s.amphi||[]).slice(0,3)){const b=op.beach;if(b)add('débarquement en cours ('+(op.ally?'allié':op.f==='beee'?'bèè':'joueur')+', '+({load:'embarquement',sail:'traversée',land:'à terre',ferry:'navette'}[op.state]||op.state)+', vague '+op.wave+', '+op.landed+' débarqués)',b.x,b.y,.85,{yaw:.4,elev:.45});}
      // les têtes de pont bèè (leur ligne, avec l'effectif), la tête de pont alliée, les ripostes bèè
      for(const H of (s.beee.heads||[]).slice(0,2)){const n=w.amphiBeeHeadMen(H).length;add('tête de pont bèè ('+n+' hommes, '+Math.round(Math.hypot(H.x-H.bx,H.y-H.by))+' cases gagnées'+(H.camp&&w.building(H.camp)?', camp':'')+')',H.x,H.y,1.0,{yaw:-.5,elev:.5});}
      const R=s.ally?.raid;if(R?.beach){const n=s.units.filter(u=>u.ally&&u.allyRaid&&alive(u)&&Math.hypot(u.x-R.beach[0],u.y-R.beach[1])<60).length;add('tête de pont alliée ('+(R.phase||'?')+', '+n+' hommes près de la plage)',R.beach[0],R.beach[1],1.0,{yaw:.5,elev:.5});}
      for(const b of (s.beee.bands||[]).filter(b=>b.kind==='riposte').slice(0,1))if(b.pt)add('riposte bèè ('+w.bandMembers(b).filter(alive).length+' hommes)',b.pt[0],b.pt[1],.9,{yaw:.3,elev:.5});
      const St=s.beee.stage;if(St){const n=s.units.filter(u=>u.stage&&u.hp>0&&Math.hypot(u.x-St.x,u.y-St.y)<40).length;if(n>=5)add('rassemblement bèè au port ('+n+' soldats attendent les bateaux)',St.x,St.y,1.0,{yaw:.5,elev:.5});}
      {const L=s.units.filter(u=>u.ally&&alive(u)&&u.task?.allyLine);if(L.length>=4){const x=L.reduce((n,u)=>n+u.x,0)/L.length,y=L.reduce((n,u)=>n+u.y,0)/L.length;add('ligne de défense alliée ('+L.length+' soldats)',x,y,1.1,{yaw:-.4,elev:.45});}}
      const fir=s.units.filter(u=>alive(u)&&u.firedAt>s.t-.25);const fd=dense(fir,15);if(fd&&fd.n>=3)add('combat en cours ('+fd.n+' tireurs)',fd.x,fd.y,1.15,{yaw:-.4,elev:.5});
      const down=s.units.filter(u=>u.hp>0&&u.h?.state==='hors');const dd=dense(down,12);if(dd&&dd.n>=3&&(!fd||Math.hypot(dd.x-fd.x,dd.y-fd.y)>25))add('blessés au sol ('+dd.n+' hors de combat)',dd.x,dd.y,1.2);
      const loco=s.vehicles.find(v=>v.k==='loco'&&!v.ally&&v.hp>0)||s.vehicles.find(v=>v.k==='loco'&&v.hp>0);if(loco)add('train ('+(loco.ally?'allié':loco.f)+')',loco.x,loco.y,1.2,{yaw:.6,elev:.45});
      const n=f=>s.units.filter(u=>u.f===f&&alive(u)).length;const bnd=w.bounds||[0,0,N,N];
      return JSON.stringify({day:w.day,hour:Math.floor(w.hour()),night:w.isNight(),N,center:[(bnd[0]+bnd[2])/2,(bnd[1]+bnd[3])/2],meumeu:n('meumeu'),ally:s.units.filter(u=>u.ally&&alive(u)).length,beee:n('beee'),
        beeeCities:bc.length,beeeFallen:s.beee.cities.length-bc.length,allyCities:ac.length,barges:me.length,bateauxBee:be.length,ops:(s.amphi||[]).length,bunkersBee:bk.length,buildings:s.buildings.length,spots});})()`));
    console.log(`== ${file} : J${info.day} ${info.hour} h${info.night?' (nuit)':''} · meumeu ${info.meumeu} dont allié ${info.ally} · bèè ${info.beee} · villes bèè ${info.beeeCities} (${info.beeeFallen} tombées) · villes alliées ${info.allyCities} · barges ${info.barges} · bateaux bèè ${info.bateauxBee} · débarquements ${info.ops} · bunkers bèè ${info.bunkersBee}`);
    const meta={save:tag,day:info.day,hour:info.hour};
    // 1. la carte entière, sans brouillard, en 2D (le panneau donne l'état de la partie)
    await run(`(()=>{const w=world();w.s.fog=false;document.body.classList.remove('nopanel');dispatchEvent(new Event('resize'));view.set3d(false);view.lookAt(${info.center[0]},${info.center[1]});const b=w.bounds||[0,0,w.N,w.N],span=(b[2]-b[0])+(b[3]-b[1]);view.zoom=Math.min(view.canvas.width/(span*32*view.dpr),view.canvas.height/(span*16*view.dpr))*.98;document.querySelector('#buildbar').style.visibility='';view.draw(.01);})();0;`);await wait(2500);
    await jpg(`${tag}_00_carte.jpg`,`J${info.day} ${info.hour} h — la carte entière sans brouillard : meumeu ${info.meumeu} (dont allié ${info.ally}), bèè ${info.beee}, ${info.beeeCities} villes bèè debout, ${info.barges} barges, ${info.bateauxBee} bateaux bèè, ${info.ops} débarquement(s) en cours`,meta);
    await run(`(async()=>{document.querySelector('#buildbar').style.visibility='hidden';document.body.classList.add('nopanel');dispatchEvent(new Event('resize'));await view.set3d(true);})();0;`);await wait(4000);
    let k=1;for(const sp of info.spots){
      await run(`(()=>{const w=world();w.s.fog=${sp.fog?'true':'false'};view.fogT=0;view.yaw=${sp.yaw||0};view.elev=${sp.elev??'Math.asin(.5)'};view.lookAt(${sp.x},${sp.y});view.zoom=${sp.z};view.draw(.01);})();0;`);await wait(1800);
      await jpg(`${tag}_${String(k).padStart(2,'0')}_${sp.k.split(' ')[0].normalize('NFD').replace(/[^a-z]/gi,'').slice(0,12)}.jpg`,`J${info.day} ${info.hour} h — ${sp.k}${sp.fog?' (brouillard comme en jeu)':' (sans brouillard)'}`,meta);k++;}
    await run(`view.resetCam();0;`);
    const err=await run(`JSON.stringify(window.__e.splice(0))`);if(err!=='[]')console.log('  ERREURS PAGE',err.slice(0,800));}
  fs.writeFileSync(path.join(OUT,'manifeste.json'),JSON.stringify(man,null,1));
},{w:1600,h:900,out:OUT});
