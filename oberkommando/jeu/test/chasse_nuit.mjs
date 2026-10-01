// La chasse de nuit : un coup de feu, puis une explosion, à 25 cases d'une ville bèè, la nuit. Qui vient, combien, en combien de temps, à quelle distance du bruit.
//   node test/chasse_nuit.mjs <graine> <jour>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,DAY]=[+(process.argv[2]||301),+(process.argv[3]||14)];const W=new World(seed);const P=player(W);const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);
for(let d=0;d<DAY;d++)for(let h=0;h<24;h++){try{P.tick();}catch(e){}const st=d<3?1/240:1/60;for(let k=0;k<1/st;k++)W.update(st);W.events.length=0;}
while(W.light()>.3)W.update(1/60);
const cap=W.capital();const c=W.s.beee.cities.filter(c=>!c.fallen).sort((a,z)=>d2(a.x,a.y,cap.i,cap.j)-d2(z.x,z.y,cap.i,cap.j))[0];
const an=Math.atan2(cap.j-c.y,cap.i-c.x);const [x,y]=W.freeSpot(c.x+Math.cos(an)*25,c.y+Math.sin(an)*25,4);
function watch(label,H){const t0=W.s.t;let first=null,max=0,closest=99;for(let k=0;k<H*60;k++){W.update(1/60);W.events.length=0;
    const S=W.s.units.filter(u=>u.f==='beee'&&u.hp>0&&u.task?.kind==='search'&&d2(u.x,u.y,x,y)<60);if(S.length&&first==null)first=W.s.t-t0;max=Math.max(max,S.length);
    for(const u of S)closest=Math.min(closest,d2(u.x,u.y,x,y));}
  console.log(`${label} : premiers chercheurs après ${first!=null?first.toFixed(1)+' h':'—'} · jusqu'à ${max} à la fois · le plus près à ${closest.toFixed(1)} cases du bruit`);}
console.log(`graine ${seed} jour ${W.day} · ville ${c.name} (garde ${W.beeeGuards(c).length}) · bruit à 25 cases, lumière ${W.light().toFixed(2)}`);
const u=W.addUnit('meumeu','soldat',x,y);u.w='mle1';u.mag=5;u.pouch=40;W.shotNoise(u,W.W('mle1'),x+5,y);u.hp=0;u.h&&(u.h.state='mort');
watch('un coup de fusil',4);
W.blast(x,y,'grenade','meumeu',null);watch('une grenade',6);
console.log(W.s.log.slice(0,4).map(l=>l.text).join(' | '));
