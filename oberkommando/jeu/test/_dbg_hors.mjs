const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');
const W=new World(1).restore(fs.readFileSync(process.argv[2],'utf8'));const [x0,y0,x1,y1]=W.bounds;
console.log('bornes',W.bounds);
for(const b of W.s.buildings)if(b.i<x0||b.j<y0||b.i>x1||b.j>y1||(b.f==='beee'&&b.i<W.N/2))console.log('bâtiment',b.f,b.k,b.i,b.j,b.done,b.id);
for(const u of W.s.units){const t=u.task;if(t&&t.tx!=null&&(t.tx<x0||t.ty<y0||t.tx>x1||t.ty>y1))console.log('unité',u.f,u.k,t.kind,Math.round(t.tx),Math.round(t.ty),JSON.stringify(t).slice(0,160));
  if(t?.kind==='build'){const b=W.building(t.b);if(b&&(b.i<x0||b.j<y0))console.log('build vers',b.k,b.i,b.j);}}
for(const c of W.s.beee.cities)if(c.x<x0||c.y<y0||c.x>x1||c.y>y1)console.log('ville hors',c.name,c.x,c.y);
