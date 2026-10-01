// Le banc de combat : une escouade meumeu tient un dépôt, un raid bèè vient le prendre. On mesure comment on se bat :
// qui tire en marchant, à quelle distance, combien de coups pour un touché, les pertes, les replis, les blessés relevés.
//   node test/combat.mjs [répétitions] [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const {MAP_N,T,BUILDINGS}=await import('../js/data.js');
const {TILE_M}=await import('../js/ballistics.js');
const say=t=>console.log(t);
const REPS=+(process.argv[2]||3),SEED0=+(process.argv[3]||11);
const field=(W,ci,cj,n,m)=>{for(let r=0;r<60;r++)for(let a=0;a<24;a++){const i=Math.round(ci+Math.cos(a/24*6.283)*r),j=Math.round(cj+Math.sin(a/24*6.283)*r);let ok=true;
  for(let dj=0;dj<m&&ok;dj++)for(let di=0;di<n;di++){const k=(j+dj)*MAP_N+i+di;const t=W.G.terrain[k];if(!(t>=T.sand&&t<=T.scrub)||W.occ[k]>=0||W.wall[k]){ok=false;break;}}if(ok)return [i,j];}return null;};
const P=World.prototype;const res0=P.resolve;let log=null;
P.resolve=function(u,e,Wd,R,...a){const r=res0.call(this,u,e,Wd,R,...a);if(log){const mv=this.s.t-(u.moved||-9)<.03;log.push({f:u.f,R,mv,hit:!!r?.hit&&!r?.struct,stand:u.task?.kind,post:u.post,supp:u.supp||0,cover:!!r?.cover,tpost:e.post});}return r;};
const tot={};const add=(k,v)=>tot[k]=(tot[k]||0)+v;
for(let rep=0;rep<REPS;rep++){const W=new World(SEED0+rep);W.s.beee.warDay=1;W.s.beee.nextWave=1e9;W.s.beee.nextAir=1e9;W.declareWar?.('beee');W.s.fauna=[];
  const cap=W.capital();const at=field(W,cap.i+10,cap.j,90,14);if(!at){say('pas de terrain');continue;}const [i0,j0]=at;
  W.s.units=W.s.units.filter(()=>false);W.uIndex=new Map();
  const camp=W.addBuilding('meumeu','camp',i0+4,j0+6,true);camp.stock={bois:200,vivres:50};
  const us=[];for(let n=0;n<8;n++)us.push(W.addUnit('meumeu','soldat',i0+8,j0+2+n*1.3,{rounds:300}));const med=W.addUnit('meumeu','medecin',i0+5,j0+7);
  const sq=W.formSquad([...us,med].map(u=>u.id));for(const u of us){u.task={kind:'guard',tx:u.x,ty:u.y};W.face(u,1,0);}
  const bs=[];for(let n=0;n<8;n++)bs.push(W.addUnit('beee',n%4===3?'commando':'soldat',i0+50,j0+2+n*1.3,{rounds:300}));
  W.makeBand(bs,camp,{x:i0+60,y:j0+7});
  const P2=Object.getPrototypeOf(W);const bs0=P2.bandSet;const trail=[];P2.bandSet=function(b,st,why=''){if(b.state!==st)trail.push(`${((this.s.t-t0)*4).toFixed(0)}s ${st}${why?' ('+why+')':''} moral ${b.morale.toFixed(2)}`);return bs0.call(this,b,st,why);};
  log=[];const t0=W.s.t;let firstShot=null,ended=null,bRetreat=null,mBroken=null;const H=24;
  for(let t=0;t<H;t+=.02){W.update(.02);for(const e of W.events.splice(0)){if(e.type==='shot'&&firstShot==null)firstShot=W.s.t-t0;}
    const ms=W.squad?.(sq?.id)||W.s.squads[0];if(ms?.broken&&mBroken==null)mBroken=W.s.t-t0;
    if(bRetreat==null&&bs.filter(u=>u.hp>0&&u.h.state!=='hors').some(u=>W.band(u.band)?.state==='repli'))bRetreat=W.s.t-t0;
    const upM=us.filter(u=>u.hp>0&&u.h.state!=='hors').length,upB=bs.filter(u=>u.hp>0&&u.h.state!=='hors').length;if((!upM||!upB)&&ended==null){ended=W.s.t-t0;}}
  const st=L=>({mort:L.filter(u=>u.hp<=0).length,hors:L.filter(u=>u.hp>0&&u.h.state==='hors').length});const a=st(us),b=st(bs);
  const sh=f=>log.filter(x=>x.f===f);const pct=(L,p)=>L.length?Math.round(L.filter(p).length/L.length*100):0;const mean=L=>L.length?L.reduce((s,x)=>s+x.R,0)/L.length:0;
  const M=sh('meumeu'),B=sh('beee');
  say(`essai ${rep+1} (graine ${SEED0+rep}) : premier coup à ${firstShot!=null?(firstShot*4).toFixed(0)+' s':'—'} · fin ${ended!=null?(ended*4).toFixed(0)+' s':'—'}
  Meumeu : ${M.length} coups, ${pct(M,x=>x.hit)} % touchent, ${pct(M,x=>x.mv)} % en marchant, à ${mean(M).toFixed(0)} m · pertes ${a.mort} morts ${a.hors} à terre${mBroken!=null?` · escouade brisée à ${(mBroken*4).toFixed(0)} s`:''}
  Bèè    : ${B.length} coups, ${pct(B,x=>x.hit)} % touchent, ${pct(B,x=>x.mv)} % en marchant, à ${mean(B).toFixed(0)} m · pertes ${b.mort} morts ${b.hors} à terre${bRetreat!=null?` · repli à ${(bRetreat*4).toFixed(0)} s`:' · pas de repli'}
  groupe : ${trail.join(' → ')}
  causes : ${[...us,...bs].filter(u=>u.h.state!=='ok').map(u=>u.f[0]+':'+u.h.state+':'+(u.h.cause||'')).join(' | ')}
  bèè : ${bs.slice(0,3).map(u=>Math.round(u.x-i0)+','+Math.round(u.y-j0)+' '+(u.task?.kind||'-')+' '+(u.why||'')).join(' | ')}
  camp : ${(P2.bandSet=bs0,'')}${camp.ruin?'détruit':Math.round(camp.hp)+'/'+camp.max} · médecin : ${med.hp>0?'vivant':'mort'}, blessés sous la tente ou relevés : ${us.filter(u=>u.task?.kind==='carried'||u.h?.log?.some(l=>/garrot|pansement|plasma/.test(l.what||''))).length}`);
  for(const [n,L] of [['M',M],['B',B]]){const by={};for(const x of L){const k=x.post+'>'+x.tpost;by[k]=(by[k]||0)+1;}say(`  ${n} postures tireur>cible ${JSON.stringify(by)} · feu subi moyen ${(L.reduce((a,x)=>a+x.supp,0)/Math.max(1,L.length)).toFixed(2)} · arrêtées par un couvert ${pct(L,x=>x.cover)} %`);}
  add('mm',a.mort);add('mh',a.hors);add('bm',b.mort);add('bh',b.hors);add('mshots',M.length);add('bshots',B.length);add('bmove',B.filter(x=>x.mv).length);add('mmove',M.filter(x=>x.mv).length);}
say(`\nmoyenne sur ${REPS} : Meumeu ${(tot.mm/REPS).toFixed(1)} morts + ${(tot.mh/REPS).toFixed(1)} à terre · Bèè ${(tot.bm/REPS).toFixed(1)} morts + ${(tot.bh/REPS).toFixed(1)} à terre · tirs en marchant : Meumeu ${Math.round(tot.mmove/Math.max(1,tot.mshots)*100)} %, Bèè ${Math.round(tot.bmove/Math.max(1,tot.bshots)*100)} %`);
