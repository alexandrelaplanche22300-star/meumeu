// (V12.9) La guerre chimique — la santé : la dose par organe, les stades, l'infection, l'incurable, la parade. Agents FICTIFS, nombres de jeu.
// CRITÈRES (fixés avant de lancer) :
//   S1 sans masque, la dose des poumons monte dans le foin et les stades se suivent (toux → crache du sang) ; masqué, moins d'un dixième
//   S2 au-delà du seuil 4 des poumons : l'incurable — triage noir, l'hôpital n'y fait rien, il meurt en 6 à 40 h
//   S3 le miel : rien sur la peau tout de suite (latence), puis les cloques ; elles s'infectent, moins vite pansées ; la combinaison l'arrête
//   S4 X-G : au-delà du seuil 4 des nerfs, mort en quelques secondes sans antidote ; piqué à temps, il survit
//   S5 X-V : la pellicule continue de passer la peau hors du nuage ; lavée (décontamination), elle s'arrête
//   S6 la simulation : un soldat dans un nuage de foin (W.update) prend sa dose par gasExpose, le masque pris au dépôt le protège
//   node test/gaz.mjs
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {newHealth,tickHealth,heal,triage,malus}=await import('../js/health.js');
const S=await import('../js/gaz-sante.js');const {World}=await import('../js/world.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const R=(seed=1)=>{let x=seed;return ()=>((x=(x*16807)%2147483647)/2147483647);};
const NOP={inh:0,oeil:0,cut:0},MASK={inh:.92,oeil:.5,cut:0},FULL={inh:.92,oeil:.9,cut:.85};
const live=(h,secs,rnd=R(),C=null,prot=NOP,step=.25)=>{for(let t=0;t<secs;t+=step){if(C)S.exposeDose(h,C,prot,step);tickHealth(h,step);if(h.cx&&!h.cx.st)break;if(h.state==='mort')return t;}return null;};
// S1
{const h=newHealth(),m=newHealth();live(h,4,R(),{foin:5});live(m,4,R(),{foin:5},MASK);
  P(h.cx.st.poumons>=2&&h.log.some(l=>/crache du sang/.test(l.what))&&m.cx.d.poumons<h.cx.d.poumons*.1&&malus(h).aim>1.2,'S1. le foin : toux, puis il crache du sang ; le masque l\'arrête',`poumons ${h.cx.d.poumons.toFixed(1)} (stade ${h.cx.st.poumons}) · masqué ${m.cx.d.poumons.toFixed(2)} · visée ×${malus(h).aim.toFixed(2)}`);}
// S2
{const h=newHealth();live(h,12,R(2),{foin:5});const doom=!!h.cx.doom;const tri=triage(h).k;heal(h,24);const still=!!h.cx.doom&&h.state!=='ok';const st2=h.state;const left=h.cx.doom?.left/4;
  const t=live(h,60*4,R(2));
  P(doom&&tri==='noir'&&still&&t!=null&&left>=6-1e-9&&left<=40,'S2. l\'incurable : noir au triage, l\'hôpital n\'y peut rien, il meurt lentement',`poumons ${h.cx.d.poumons.toFixed(0)} · triage ${tri} · après 24 h d'hôpital : ${still?'toujours condamné':'guéri ? ('+st2+')'} · mort en ${left?.toFixed(1)} h (${h.cause}) · ${h.log.filter(l=>/crache|étouffe|écume|noyer/.test(l.what)).length} lignes d'agonie`);}
// S3
{const h=newHealth();S.exposeDose(h,{miel:10},NOP,3);const p0=h.cx.d.peau;live(h,4*4,R(3));const p1=h.cx.d.peau;const blis=h.cx.st.peau>=2;
  const a=newHealth(),b=newHealth();for(const x of [a,b])S.exposeDose(x,{miel:10},NOP,3);live(a,8*4,R(4));live(b,8*4,R(4));S.dressBlisters(b);live(a,10*4,R(4));live(b,10*4,R(4));
  const suit=newHealth();S.exposeDose(suit,{miel:10},FULL,3);live(suit,8*4,R(5));
  P(p0===0&&p1>20&&blis&&a.cx.inf>b.cx.inf*1.5&&suit.cx.d.peau<p1*.3,'S3. le miel : latence, cloques, infection ; pansées, plus lentement ; la combinaison l\'arrête',`peau tout de suite ${p0} · après 4 h ${p1.toFixed(1)} · infection ${a.cx.inf.toFixed(2)} contre ${b.cx.inf.toFixed(2)} pansées · en combinaison ${suit.cx.d.peau.toFixed(1)}`);}
// S4
{const h=newHealth(),g=newHealth();S.exposeDose(h,{xg:4},NOP,8);S.exposeDose(g,{xg:4},NOP,8);S.giveAntidote(g);const t=live(h,20,R(6));const tg=live(g,20,R(6));
  P(t!=null&&t<6&&tg==null&&g.state!=='mort','S4. X-G : mort en quelques secondes sans antidote ; piqué, il survit',`nerfs ${h.cx.d.nerfs.toFixed(0)} · mort après ${t?.toFixed(1)} s (${h.cause}) · avec antidote : ${g.state}, nerfs ${g.cx.d.nerfs.toFixed(1)}`);}
// S5
{const h=newHealth(),w=newHealth();for(const x of [h,w])S.exposeDose(x,{xv:1},NOP,1);const n0=h.cx.d.nerfs;S.decontaminate(w);live(h,8,R(7));live(w,8,R(7));
  P(h.cx.d.nerfs>n0*1.15&&w.cx.d.nerfs<=n0+1e-6,'S5. la pellicule de X-V continue de passer la peau ; lavée, elle s\'arrête',`nerfs à la sortie ${n0.toFixed(2)} · 8 s plus tard ${h.cx.d.nerfs.toFixed(2)} · lavé ${w.cx.d.nerfs.toFixed(2)}`);}
// S6
{const W=new World(3,{assisted:true});const g=W.gasState();g.wind={a:0,v:0,base:0};g.meteo='sec';g.meteoT=1e9;W.gasWeather=()=>{};
  const us=W.s.units.filter(u=>u.f==='meumeu'&&u.h).slice(0,2);const cap=W.capital();W.s.innov.done.push('phosphore','toxiques','masques');cap.stock.masque_gaz=4;
  for(const u of us){u.x=cap.i+1.5;u.y=cap.j+5.5;u.task={kind:'guard',tx:u.x,ty:u.y};u.path=null;if(!u.w)u.w=Object.keys(W.s.designs)[0];}const r=W.equip(us[1],'masque_gaz',true);
  W.gasRelease(us[0].x,us[0].y,'foin',300,{r:1.5});W.update(1);const a=us[0].h.cx?.d.poumons||0,b=us[1].h.cx?.d.poumons||0;
  P(r.ok&&a>1&&b<a*.5,'S6. dans la partie : le nuage dose par gasExpose, le masque protège',`sans masque ${a.toFixed(1)} · masqué ${b.toFixed(1)} (le temps de l\'enfiler compris)`);}
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');if(fail&&typeof process!=='undefined')process.exitCode=1;
