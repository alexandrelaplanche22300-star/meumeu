// Le son. Tout est synthétisé (pas un fichier), et placé : un tir loin à gauche s'entend loin et à gauche.
// Chaque son a ses couches : l'attaque (un claquement), le corps (une masse grave qui descend), la queue (la réverbération d'un
// espace ouvert, calculée une fois). Les sons fréquents sont limités, pour que cent fusils ne fassent pas cent fois plus de bruit.
// Deux nappes continues suivent la situation : le vent et la nature, et le grondement de la bataille quand elle est à l'écran.
const VOICE_PITCH=1.75,VOICE_FORM=1.3;
// le volume de chaque famille, face aux voix et à l'ambiance synthétisées
const SFX_GAIN={tir_leger:.5,tir_moyen:.6,tir_lourd:.7,mortier:.75,obusier:.9,fusee:.6,explosion_grenade:.8,explosion_obus:.9,explosion_depot:1,impact:.55,impact_terre:.4,ricochet:.45,sifflement:.5};
export const SFX_FILES=['tir_leger','tir_moyen','tir_lourd','mortier','obusier','fusee','explosion_grenade','explosion_obus','explosion_depot','sifflement','ricochet','impact','impact_terre','rechargement','effondrement','incendie','train'];
export class Audio{
  constructor(){this.on=localStorage.getItem('okm-sound')!=='off';this.ctx=null;this.last={};this.count={};this.bed={};}
  init(){if(this.ctx)return;try{const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=c.createGain();this.master.gain.value=this.on?.8:0;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=10;comp.attack.value=.003;comp.release.value=.18;this.master.connect(comp);comp.connect(c.destination);
      // la réverbération : un bruit qui décroît, filtré — un grand espace dehors
      this.verb=c.createConvolver();const len=c.sampleRate*2.6,ir=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*(i<200?i/200:1);}
      this.verb.buffer=ir;this.wet=c.createGain();this.wet.gain.value=.14;this.verb.connect(this.wet);this.wet.connect(this.master);
      this.noiseBuf=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const nd=this.noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
      this.beds();}catch(e){this.ctx=null;}}
  toggle(){this.on=!this.on;localStorage.setItem('okm-sound',this.on?'on':'off');if(this.master)this.master.gain.setTargetAtTime(this.on?.8:0,this.ctx.currentTime,.05);return this.on;}
  // une sortie placée : volume selon la distance, gauche-droite selon l'écran
  out(pos){const c=this.ctx;const g0=c.createGain();const p=c.createStereoPanner?c.createStereoPanner():null;const vol=pos?pos.vol:1;g0.gain.value=vol;
    // le lointain : l'air et le relief mangent les aigus (un coup de feu lointain « tonne » sourdement, un proche claque)
    let g=g0;const disposable=[g0];if(pos?.delay>0){const d=c.createDelay(2);d.delayTime.value=Math.min(1.5,pos.delay);g.connect(d);g=d;disposable.push(d);}if(pos&&vol<.95){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500+15000*Math.pow(Math.max(0,vol),1.7)*(pos.blocked?.4:1);lp.Q.value=.5;g.connect(lp);g=lp;disposable.push(lp);}
    const input=g0;
    if(p){p.pan.value=pos?Math.max(-1,Math.min(1,pos.pan)):0;g.connect(p);p.connect(this.master);const send=c.createGain();send.gain.value=pos?.far?.32:.12;p.connect(send);send.connect(this.verb);disposable.push(p,send);}else g.connect(this.master);setTimeout(()=>disposable.forEach(n=>{try{n.disconnect();}catch{}}),10000);return input;}
  noise(dur,dst,{type='lowpass',f0=1200,f1=null,q=.7,gain=.5,attack=.002,decay=null,at=0}={}){const c=this.ctx,t=c.currentTime+at;const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;
    const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);f.Q.value=q;const g=c.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+(decay||dur));s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random()*2);s.stop(t+dur+.05);}
  tone(dst,{f0=440,f1=null,dur=.3,type='sine',gain=.3,attack=.005,at=0}={}){const c=this.ctx,t=c.currentTime+at;const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(10,f1),t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);}
  // Une voix synthétisée : une source (dent de scie + souffle) passée dans trois formants (la voyelle), une enveloppe de hauteur
  // (f : liste de [temps, fréquence]), un vibrato, un trémolo (le chevrotement d'une chèvre), une râpe (la douleur, l'agonie).
  // des peluches de 30 cm : des voix aiguës (VOICE_PITCH sur la hauteur, VOICE_FORM sur le timbre)
  voice(dst,{f=[[0,200],[.5,160]],dur=.8,form=[[350,6,1],[900,8,.6],[2400,10,.25]],vib=4,vibD=.02,trem=0,tremD=0,rough=0,gain=.3,breath=.15,attack=.04,at=0}={}){const c=this.ctx,t=c.currentTime+at;
    f=f.map(([ft,fv])=>[ft,fv*VOICE_PITCH]);form=form.map(([ff,q,g])=>[ff*VOICE_FORM,q,g]);
    const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f[0][1],t);for(const [ft,fv] of f.slice(1))o.frequency.linearRampToValueAtTime(fv,t+ft);
    const lfo=c.createOscillator();lfo.frequency.value=vib;const lg=c.createGain();lg.gain.value=f[0][1]*vibD;lfo.connect(lg);lg.connect(o.frequency);
    const src=c.createGain();src.gain.value=1;o.connect(src);
    if(rough>0){const r=c.createOscillator();r.type='square';r.frequency.value=f[0][1]*.5;const rg=c.createGain();rg.gain.value=f[0][1]*rough;r.connect(rg);rg.connect(o.frequency);r.start(t);r.stop(t+dur+.1);}
    const env=c.createGain();env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+attack);env.gain.setValueAtTime(gain,t+dur*.7);env.gain.exponentialRampToValueAtTime(.0008,t+dur);
    let tail=env;if(trem>0){const tl=c.createOscillator();tl.frequency.value=trem;const tg=c.createGain();tg.gain.value=tremD*.5;tl.connect(tg);const am=c.createGain();am.gain.value=1-tremD*.5;tg.connect(am.gain);env.connect(am);tail=am;tl.start(t);tl.stop(t+dur+.1);}
    for(const [ff,q,g] of form){const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=ff;bp.Q.value=q;const fg=c.createGain();fg.gain.value=g*3;src.connect(bp);bp.connect(fg);fg.connect(env);}
    tail.connect(dst);if(breath>0)this.noise(dur,env,{type:'bandpass',f0:form[1][0],q:1,gain:breath,attack,decay:dur});
    o.start(t);lfo.start(t);o.stop(t+dur+.1);lfo.stop(t+dur+.1);}
  // les cris : un Meumeu (« meuuuh » grave et nasal), un Bèè (« bèèèè » aigu et chevrotant) ; touché, à terre, à l'agonie, mourant
  // ---------- les voix vivantes ----------
  // Une vraie voix : une source glottique (harmoniques qui décroissent, pas une dent de scie), une hauteur qui vit (un petit
  // tremblement lent, tiré au sort), un souffle, et quatre formants qui glissent d'une voyelle à l'autre — « M » fermé et nasal,
  // « ÈÈÈ » ouvert, « EU », « OU ». Le cri de douleur monte fort, tient, puis se brise en râle (des sous-harmoniques).
  glottal(){if(this._glot)return this._glot;const n=48,re=new Float32Array(n),im=new Float32Array(n);for(let k=1;k<n;k++){im[k]=Math.pow(k,-1.15)*(k%2?1:.8);}return this._glot=this.ctx.createPeriodicWave(re,im);}
  speak(dst,{pitch,vowels,dur,gain=.3,wobble=.012,trem=0,tremD=0,fry=0,breath=.12,burst=null,at=0}){const c=this.ctx,t=c.currentTime+at;
    const o=c.createOscillator();o.setPeriodicWave(this.glottal());o.frequency.setValueAtTime(pitch[0][1],t);for(const [pt,pv] of pitch.slice(1))o.frequency.linearRampToValueAtTime(pv,t+pt);
    // la hauteur qui vit : un bruit très lent sur la fréquence (ce qui manque aux voix de robot)
    const jit=c.createBufferSource();jit.buffer=this.noiseBuf;jit.loop=true;const jl=c.createBiquadFilter();jl.type='lowpass';jl.frequency.value=7;const jg=c.createGain();jg.gain.value=pitch[0][1]*wobble*6;jit.connect(jl);jl.connect(jg);jg.connect(o.frequency);
    // le chevrotement (Bèè) : la hauteur et le volume ondulent ensemble
    let am=null;if(trem>0){const l=c.createOscillator();l.frequency.setValueAtTime(trem,t);l.frequency.linearRampToValueAtTime(trem*.8,t+dur);const lg=c.createGain();lg.gain.value=pitch[0][1]*.05*tremD;l.connect(lg);lg.connect(o.frequency);
      am=c.createGain();am.gain.value=1-tremD*.45;const ag=c.createGain();ag.gain.value=tremD*.45;l.connect(ag);ag.connect(am.gain);l.start(t);l.stop(t+dur+.1);}
    // le râle : une sous-harmonique qui grince, de plus en plus en fin de cri
    const src=c.createGain();o.connect(src);if(fry>0){const f2=c.createOscillator();f2.type='sawtooth';f2.frequency.setValueAtTime(pitch[0][1]*.5,t);for(const [pt,pv] of pitch.slice(1))f2.frequency.linearRampToValueAtTime(pv*.5,t+pt);const fg=c.createGain();fg.gain.setValueAtTime(0,t);fg.gain.linearRampToValueAtTime(fry*.25,t+dur*.5);fg.gain.linearRampToValueAtTime(fry*.6,t+dur);f2.connect(fg);fg.connect(src);f2.start(t);f2.stop(t+dur+.1);}
    // les formants : chaque voyelle, à son heure
    const env=c.createGain();const out=am?(env.connect(am),am):env;out.connect(dst);
    for(let q=0;q<4;q++){const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=[5,8,11,14][q];const g=c.createGain();
      for(const [vt,V] of vowels){const [ff,fa]=V[q];bp.frequency.linearRampToValueAtTime(ff,t+vt);g.gain.linearRampToValueAtTime(fa*[3.2,2.2,1.4,.9][q],t+vt);}
      bp.frequency.setValueAtTime(vowels[0][1][q][0],t);g.gain.setValueAtTime(vowels[0][1][q][1]*[3.2,2.2,1.4,.9][q],t);src.connect(bp);bp.connect(g);g.connect(env);}
    // le souffle, dans les mêmes formants que la voix
    if(breath>0)this.noise(dur,env,{type:'bandpass',f0:vowels[0][1][1][0],f1:vowels[vowels.length-1][1][1][0],q:1.2,gain:breath,attack:.03,decay:dur,at});
    if(burst==='b'){this.noise(.03,dst,{type:'lowpass',f0:900,gain:gain*1.2,at,decay:.03});}
    // l'enveloppe : une attaque vive, un corps qui tient en vacillant un peu, une fin qui s'éteint
    env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+Math.min(.05,dur*.1));env.gain.linearRampToValueAtTime(gain*.85,t+dur*.6);env.gain.exponentialRampToValueAtTime(.0008,t+dur);
    o.start(t);jit.start(t,Math.random()*2);o.stop(t+dur+.1);jit.stop(t+dur+.1);}
  // les voyelles d'une petite bête (formants d'enfant, un peu plus hauts) : [fréquence, force] × 4
  vow(k){return {M:[[300,1],[1250,.2],[2600,.1],[3500,.05]],E:[[700,1],[2100,.8],[3000,.5],[3900,.25]],I:[[450,1],[2500,.7],[3300,.45],[4100,.2]],
    EU:[[520,1],[1500,.75],[2600,.4],[3600,.2]],U:[[400,1],[950,.6],[2500,.25],[3500,.1]],A:[[950,1],[1450,.8],[2800,.4],[3800,.2]]}[k];}
  // les cris : touché (« MEEEUUuuu ! » / « BÈÈÈÈÈ ! »), à l'agonie (des gémissements), mourant (un long cri qui se brise)
  // un seul cri à la fois : tant qu'un cri joue, les gémissements se taisent
  cryFree(){return (this.ctx?.currentTime??0)>=(this.cryUntil||0);}
  cry(o,sp,kind){const bee=sp==='beee';this.cryUntil=Math.max(this.cryUntil||0,this.ctx.currentTime+(kind==='agonie'?1.8:1.3));const r=.94+Math.random()*.14;const V=k=>this.vow(k);const CUTE=1.55;
    if(bee){const P=({touche:[[0,780],[.06,1050],[.35,990],[.9,820],[1.25,640]],agonie:[[0,620],[.2,700],[.9,590],[1.5,470]],mort:[[0,900],[.1,1080],[.8,760],[1.6,420]]})[kind].map(([t,f])=>[t,f*r]);
      const dur=P[P.length-1][0];this.speak(o,{pitch:P,dur,burst:'b',vowels:[[0,V('M')],[.03,V('E')],[dur*.8,V('E')],[dur,V('I')]],gain:kind==='agonie'?.16:.3,trem:kind==='agonie'?5:7.5,tremD:kind==='agonie'?.9:.75,fry:kind==='touche'?.2:.45,breath:.14,wobble:.015});}
    else{const P=({touche:[[0,480],[.07,760],[.3,740],[.75,620],[1.2,430]],agonie:[[0,420],[.3,500],[1.1,390],[1.8,310]],mort:[[0,560],[.12,840],[.9,580],[1.8,310]]})[kind].map(([t,f])=>[t,f*r*CUTE]);
      const dur=P[P.length-1][0];this.speak(o,{pitch:P,dur,vowels:[[0,V('M')],[.07,V('E')],[dur*.38,V('E')],[dur*.6,V('EU')],[dur*.85,V('U')],[dur,V('U')]],gain:kind==='agonie'?.17:.32,trem:kind==='agonie'?4:5.5,tremD:kind==='agonie'?.5:.12,fry:kind==='touche'?.12:.4,breath:.1,wobble:.016});}}
  // la sélection « meu ? » / « bè ? » (la voix monte, curieuse) ; l'ordre « meu ! » / « bè ! » (vif, content, décidé)
  chirp(o,sp,ask,at=0){const bee=sp==='beee';const r=.92+Math.random()*.18;const V=k=>this.vow(k);
    if(bee){const P=ask?[[0,700],[.12,760],[.34,980]]:[[0,980],[.05,1080],[.24,820]];this.speak(o,{pitch:P.map(([t,f])=>[t,f*r]),dur:P[P.length-1][0],burst:'b',vowels:[[0,V('M')],[.03,V('E')],[.3,V('E')]],gain:.24,trem:8,tremD:.5,breath:.1,wobble:.012,at});}
    else{const CU=1.55;const P=ask?[[0,440],[.12,480],[.22,640],[.42,760],[.52,700]]:[[0,700],[.05,840],[.2,760],[.34,560]];this.speak(o,{pitch:P.map(([t,f])=>[t,f*r*CU]),dur:P[P.length-1][0],vowels:ask?[[0,V('M')],[.1,V('EU')],[.3,V('EU')],[.52,V('U')]]:[[0,V('M')],[.05,V('EU')],[.22,V('EU')],[.34,V('U')]],gain:.26,breath:.08,wobble:.016,trem:6,tremD:.1,at});}}
  // limiter les sons en rafale : au plus `n` par `win` secondes pour ce nom
  budget(name,n,win){const now=performance.now()/1000;const L=(this.last[name]||[]).filter(x=>now-x<win);if(L.length>=n){this.last[name]=L;return false;}L.push(now);this.last[name]=L;return true;}
  // Les bruitages enregistrés : des fichiers déposés dans assets/sfx/ (mp3, wav ou ogg) remplacent le son synthétisé correspondant ;
  // absents, le jeu synthétise comme avant. Les voix des peluches restent synthétisées.
  loadBank(){this.bank={};const one=(n,exts)=>{if(!exts.length)return;fetch(new URL(`../assets/sfx/${n}.${exts[0]}`,import.meta.url)).then(r=>r.ok?r.arrayBuffer():null).then(b=>b?this.ctx.decodeAudioData(b):null).then(buf=>{if(buf){const base=n.replace(/_\d$/,'');(this.bank[base]??=[]).push(buf);}else one(n,exts.slice(1));}).catch(()=>one(n,exts.slice(1)));};for(const n of SFX_FILES)for(const v of ['','_2','_3'])one(n+v,['mp3','wav','ogg']);}
  // L'écho du champ de bataille : une réponse d'extérieur — des échos francs sur la lisière et les collines (70 à 900 ms),
  // puis une traîne qui roule et s'assourdit (3,5 s). Plus le tir est loin, plus on entend l'écho et moins le claquement.
  echo(){if(this._echo)return this._echo;const c=this.ctx,sr=c.sampleRate,n=Math.floor(sr*3.6);const ir=c.createBuffer(2,n,sr);
    for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;
      for(const [t,g] of [[.07,.5],[.13,.34],[.21,.42],[.34,.26],[.47,.3],[.62,.18],[.88,.2],[1.25,.1]]){const o=Math.floor((t+(ch?.013:0)+Math.random()*.01)*sr);for(let k=0;k<sr*.03&&o+k<n;k++)d[o+k]+=g*(Math.random()*2-1)*Math.exp(-k/(sr*.006));}
      for(let i=0;i<n;i++){const t=i/sr;const w=(Math.random()*2-1)*.2*Math.exp(-t/.9)*Math.min(1,t/.05);lp+=(w+d[i]-lp)*Math.max(.04,.5*Math.exp(-t/.8));d[i]=lp;}}
    const cv=c.createConvolver();cv.buffer=ir;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;const out=c.createGain();out.gain.value=1.4;cv.connect(hp);hp.connect(out);out.connect(this.master);return this._echo=cv;}
  sample(n,o,{rate=1,gain=1,wet=0,delay=0,lpHz=0}={}){const L=this.bank?.[n];if(!L?.length)return false;const buf=L[Math.floor(Math.random()*L.length)];const c=this.ctx;const s=c.createBufferSource();s.buffer=buf;s.playbackRate.value=rate*(.94+Math.random()*.12);const g=c.createGain();g.gain.value=gain;s.connect(g);g.connect(o);
    if(wet>0){const w=c.createGain();w.gain.value=wet*gain;s.connect(w);let e=w;
      // L'écho SUIT le coup, il ne le précède pas : même retard de distance que le son direct, mêmes aigus mangés par l'éloignement. Avant, il
      // partait tout de suite, plein bande et d'autant plus fort que le tir était loin, alors que le coup n'arrivait qu'après son retard : on
      // entendait un souffle « pschiiit », puis BANG, avant chaque tir lointain (et avant chaque impact).
      if(delay>0){const d=c.createDelay(2);d.delayTime.value=Math.min(1.5,delay);e.connect(d);e=d;}
      if(lpHz>0){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=lpHz;lp.Q.value=.5;e.connect(lp);e=lp;}
      e.connect(this.echo());}
    s.start();return true;}
  // quel fichier pour quel bruit : le calibre choisit la détonation, la charge l'explosion
  sampleFor(name,opt){const cal=opt.cal||1.8;
    if(name==='shot'){if(opt.rk)return ['fusee',opt.barrels>1?.9:1];if(opt.arc)return [cal>=12?'obusier':'mortier',opt.action==='culasse'?.94:1];const base=Math.max(.7,Math.min(1.4,Math.pow(6/Math.max(.5,cal),.28)));const mech=opt.action==='rotatif'?1.14:opt.action==='recul'?.9:opt.action==='bascule'?.96:1;return [cal>=10?'obusier':cal>=6?'tir_lourd':cal>=2.8?'tir_moyen':'tir_leger',base*mech];}
    if(name==='boom')return [opt.kind==='grenade'||opt.kind==='pop'?'explosion_grenade':'explosion_obus',Math.max(.72,Math.min(1.22,Math.pow(.008/Math.max(.0002,opt.chargeKg||.008),.11)))];
    return {bomb:['explosion_depot',1],cannon:['obusier',1],whiz:['sifflement',1],ricochet:Math.random()<.5?['ricochet',1]:null,thud:['impact_terre',1],reload:['rechargement',1],collapse:['effondrement',1],fire:['incendie',1],train:['train',1],hit:['impact',1],rail:['explosion_grenade',.9]}[name]||null;}
  play(name,pos=null,opt={}){if(!this.ctx||!this.on)return;if(pos&&pos.vol<.02)return;const O=()=>this.out(pos);
    if(!this.bank)this.loadBank();{const S=this.sampleFor(name,opt);if(S&&this.bank[S[0]]&&this.budget('smp-'+name,name==='shot'?14:6,.5)){const o=O();const vol=Math.min(1,pos?.vol??1),far=1-vol,signature=name==='shot'?Math.max(.035,Math.min(1.35,Math.pow(10,((opt.dB||150)-150)/35))):name==='boom'||name==='bomb'?Math.max(.6,Math.min(1.4,Math.pow(Math.max(.0002,opt.chargeKg||.008)/.008,.12))):1;this.sample(S[0],o,{rate:S[1],gain:(SFX_GAIN[S[0]]??.7)*signature,wet:(.1+far*.58)*vol,delay:pos?.delay>0?pos.delay:0,lpHz:pos&&vol<.95?500+15000*Math.pow(Math.max(0,vol),1.7)*(pos.blocked?.4:1):0});this.combatLayers(name,o,pos,opt,signature);if(name==='hit'&&opt.vf&&this.budget('cry',3,2))this.cry(o,opt.vf,opt.out?.now==='mort'?'mort':'touche');return;}}
    switch(name){
      // le coup de feu dépend de l'arme : la détonation (plus grave et plus forte si la charge est grosse), le claquement sec
      // d'une balle supersonique qui fend l'air, le calibre qui donne la hauteur
      case 'shot':{if(!this.budget(name,20,.5))return;const o=O();const E=opt.E||36,cal=opt.cal||1.8;const loud=Math.min(1.1,.3+Math.log10(1+E)/3);const low=Math.max(.5,Math.min(2,Math.sqrt(1.8/cal)));
        this.noise(.14,o,{type:'lowpass',f0:520*low,gain:.4*loud,decay:.16});this.tone(o,{f0:170*low,f1:55,dur:.09,gain:.25*loud});this.noise(.09,o,{type:'bandpass',f0:1400*low,q:.8,gain:.35*loud,decay:.07});
        if(opt.sup)this.noise(.03,o,{type:'highpass',f0:3500,gain:.45*loud,decay:.025});
        if((pos?.vol??1)>.55){this.noise(.02,o,{type:'highpass',f0:5000,gain:.5*loud,decay:.018});if(opt.action==='verrou'&&this.budget('bolt',3,.6))this.noise(.03,o,{type:'bandpass',f0:2600,q:5,gain:.18,at:.45});}break;}
      case 'hit':{if(!this.budget(name,6,.4))return;const o=O();this.noise(.07,o,{type:'lowpass',f0:420,gain:.55,decay:.06});this.tone(o,{f0:110,f1:60,dur:.06,gain:.25});
        if(opt.vf&&this.budget('cry',3,2))this.cry(o,opt.vf,opt.out?.now==='mort'?'mort':'touche');break;}
      // la sélection : « meu ? » (une question, la voix monte) ; l'ordre : « meu ! » (bref, décidé, la voix tombe). Plusieurs choisis : un petit chœur
      case 'select':case 'ack':{if(!this.budget('voice',2,.35))return;const o=this.out({vol:.55,pan:0});const k=Math.min(3,opt.n||1);for(let v=0;v<k;v++)this.chirp(o,opt.f,name==='select',v*.07+Math.random()*.03);break;}
      // les voix : ceux qui gisent et saignent gémissent ; ceux qui meurent crient une dernière fois
      // les gémissements : rares et plafonnés (un toutes les 12 s au plus, trois par minute et demie, rien pendant qu'un cri joue) —
      // le cri principal a lieu à la blessure ; ensuite, jamais en boucle
      case 'agonie':{if(!this.cryFree()||!this.budget(name,1,12)||!this.budget('agonie-long',3,90))return;const o=O();this.cry(o,opt.f,'agonie');break;}
      // une balle qui passe près : supersonique, un claquement sec (l'onde de choc) puis un sifflement ; subsonique, un vrombissement
      case 'whiz':{if(!this.budget(name,5,.3))return;const o=O();if(opt.sup){this.noise(.012,o,{type:'highpass',f0:4200,gain:.55,decay:.012});this.noise(.09,o,{type:'bandpass',f0:5200,f1:2600,q:3,gain:.12,at:.01,decay:.09});}
        else{const f=900+Math.random()*500;this.tone(o,{f0:f*1.3,f1:f*.7,dur:.18,type:'sawtooth',gain:.035});this.noise(.18,o,{type:'bandpass',f0:1800,f1:900,q:2,gain:.12});}break;}
      // l'impact d'une balle perdue : la terre qui gicle, le bois qui éclate
      case 'thud':{if(!this.budget(name,6,.3))return;const o=O();if(opt.mat==='arbre'){this.noise(.05,o,{type:'bandpass',f0:1100,q:2,gain:.3});this.tone(o,{f0:420,f1:260,dur:.05,type:'triangle',gain:.08});}
        else{this.noise(.08,o,{type:'lowpass',f0:900,f1:300,gain:.22,decay:.08});}break;}
      case 'down':{if(!this.budget(name,3,1))return;const o=O();const f=260+Math.random()*80;this.tone(o,{f0:f,f1:f*.55,dur:.45,type:'triangle',gain:.09,attack:.03});this.noise(.25,o,{type:'lowpass',f0:300,gain:.3,at:.25});break;}
      case 'throw':{if(!this.budget(name,3,.5))return;const o=O();this.noise(.35,o,{type:'bandpass',f0:600,f1:1800,q:1.2,gain:.18,attack:.08});break;}
      case 'reload':{if(!this.budget(name,4,.5))return;const o=O();this.noise(.03,o,{type:'bandpass',f0:3200,q:6,gain:.3});this.noise(.03,o,{type:'bandpass',f0:2400,q:6,gain:.35,at:.22});this.noise(.04,o,{type:'bandpass',f0:1800,q:5,gain:.3,at:.5});break;}
      case 'pierce':{if(!this.budget(name,4,.4))return;const o=O();this.noise(.12,o,{type:'bandpass',f0:900,q:1.5,gain:.35});break;}
      case 'ricochet':{if(!this.budget(name,2,.6)||Math.random()<.6)return;const o=O();const f=2200+Math.random()*1800;this.tone(o,{f0:f,f1:f*.45,dur:.35,type:'sine',gain:.05});break;}
      case 'plate':{if(!this.budget(name,6,.4))return;const o=O();const f=2600+Math.random()*1400;this.tone(o,{f0:f,f1:f*.8,dur:.25,type:'triangle',gain:.09});this.noise(.05,o,{type:'highpass',f0:3000,gain:.3});break;}
      case 'smoke':{const o=O();this.noise(1.6,o,{type:'bandpass',f0:900,f1:400,q:.8,gain:.22,attack:.1});break;}
      case 'drums':{const o=O();for(let k=0;k<6;k++){this.tone(o,{f0:70,f1:45,dur:.35,gain:.4,at:k*.42});this.noise(.08,o,{f0:300,gain:.2,at:k*.42});}break;}
      case 'cannon':{if(!this.budget(name,6,.5))return;const o=O();this.tone(o,{f0:90,f1:28,dur:.9,type:'sine',gain:.9});this.noise(1.4,o,{f0:900,f1:120,gain:.7,decay:1.3});this.noise(.08,o,{type:'highpass',f0:2500,gain:.4});break;}
      case 'boom':case 'bomb':{if(!this.budget(name,8,.4))return;const o=O();const big=name==='bomb';
        this.tone(o,{f0:big?70:85,f1:22,dur:big?1.6:1,gain:1});this.noise(big?3:2,o,{f0:big?1400:1100,f1:80,gain:big?1:.8,decay:big?2.8:1.8});
        this.noise(.12,o,{type:'highpass',f0:3000,gain:.5});for(let k=0;k<(big?6:3);k++)this.noise(.06,o,{type:'bandpass',f0:1500+Math.random()*2500,q:3,gain:.15,at:.15+Math.random()*.9});break;}
      case 'whistle':{if(!this.budget(name,3,1))return;const o=O();this.tone(o,{f0:1600,f1:500,dur:1.1,type:'sine',gain:.12,attack:.2});break;}
      case 'flak':{if(!this.budget(name,10,.5))return;const o=O();this.noise(.5,o,{f0:2000,f1:300,gain:.55,decay:.45});this.tone(o,{f0:140,f1:50,dur:.3,gain:.35});break;}
      case 'collapse':{const o=O();this.noise(3.5,o,{f0:600,f1:60,gain:.9,attack:.08,decay:3.4});this.tone(o,{f0:55,f1:25,dur:2.5,gain:.7,attack:.1});
        for(let k=0;k<10;k++)this.noise(.09,o,{type:'bandpass',f0:600+Math.random()*1800,q:4,gain:.3,at:Math.random()*1.8});break;}
      case 'fire':{if(!this.budget(name,2,2))return;const o=O();for(let k=0;k<14;k++)this.noise(.04,o,{type:'highpass',f0:2500+Math.random()*3000,gain:.12,at:Math.random()*1.5});this.noise(1.6,o,{f0:400,gain:.2,attack:.3});break;}
      case 'felled':{if(!this.budget(name,3,1))return;const o=O();this.noise(.4,o,{type:'bandpass',f0:900,q:2,gain:.4,decay:.3});this.tone(o,{f0:120,f1:50,dur:.5,gain:.4,at:.35});this.noise(.8,o,{f0:500,gain:.25,at:.35});break;}
      case 'chop':{if(!this.budget(name,4,.6))return;const o=O();this.noise(.07,o,{type:'bandpass',f0:1400+Math.random()*500,q:5,gain:.25});this.tone(o,{f0:420,f1:300,dur:.06,type:'triangle',gain:.08});break;}
      case 'hammer':{if(!this.budget(name,4,.6))return;const o=O();this.tone(o,{f0:1900+Math.random()*300,dur:.12,type:'triangle',gain:.12});this.noise(.05,o,{type:'highpass',f0:3000,gain:.15});break;}
      case 'built':{const o=O();[523,659,784].forEach((f,k)=>this.tone(o,{f0:f,dur:.5,type:'triangle',gain:.12,at:k*.1}));break;}
      case 'trained':{if(!this.budget(name,3,1))return;const o=O();this.tone(o,{f0:660,dur:.18,type:'square',gain:.05});this.tone(o,{f0:880,dur:.25,type:'square',gain:.05,at:.12});break;}
      case 'train':{const o=O();// le sifflet, deux notes, et le souffle
        this.tone(o,{f0:740,dur:.9,type:'sawtooth',gain:.06,attack:.05});this.tone(o,{f0:932,dur:.9,type:'sawtooth',gain:.05,attack:.05});this.noise(1.2,o,{type:'bandpass',f0:1200,q:1.5,gain:.2,attack:.05});break;}
      case 'takeoff':{const o=O();this.tone(o,{f0:70,f1:140,dur:3,type:'sawtooth',gain:.12,attack:.6});this.noise(3,o,{type:'bandpass',f0:400,f1:900,q:1,gain:.25,attack:.8});break;}
      case 'siren':{const o=O();const c=this.ctx,t=c.currentTime;const os=c.createOscillator();os.type='sawtooth';const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.4);g.gain.setValueAtTime(.09,t+3.6);g.gain.linearRampToValueAtTime(0,t+4.4);
        const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1800;for(let k=0;k<3;k++){os.frequency.setValueAtTime(380,t+k*1.4);os.frequency.linearRampToValueAtTime(760,t+k*1.4+.7);os.frequency.linearRampToValueAtTime(380,t+k*1.4+1.4);}
        os.connect(f);f.connect(g);g.connect(o);os.start(t);os.stop(t+4.5);break;}
      case 'horn':{const o=O();[98,147,196].forEach(f=>this.tone(o,{f0:f,dur:2.4,type:'sawtooth',gain:.07,attack:.3}));this.tone(o,{f0:65,dur:2.6,type:'sine',gain:.3,attack:.2});break;}
      case 'death':{if(!this.budget(name,3,.8))return;const o=O();this.tone(o,{f0:300,f1:120,dur:.35,type:'triangle',gain:.1});if(opt.f&&this.budget('cry',3,2))this.cry(o,opt.f,'mort');break;}
      case 'rail':{const o=O();for(let k=0;k<4;k++)this.noise(.08,o,{type:'bandpass',f0:2500,q:6,gain:.25,at:k*.07});this.tone(o,{f0:1200,f1:700,dur:.4,type:'triangle',gain:.08});break;}
      case 'click':this.tone(this.master,{f0:1400,dur:.04,type:'square',gain:.04});break;
      case 'order':this.tone(this.master,{f0:520,dur:.07,type:'triangle',gain:.08});this.tone(this.master,{f0:780,dur:.08,type:'triangle',gain:.06,at:.05});break;
      case 'bad':this.tone(this.master,{f0:220,dur:.18,type:'square',gain:.05});break;
      case 'won':[262,330,392,523,659,784].forEach((f,k)=>this.tone(this.master,{f0:f,dur:1.4,gain:.12,at:k*.25}));break;}}
  combatLayers(name,o,pos,opt,signature=1){const close=(pos?.vol??1)>.45;
    if(name==='shot'){const cal=opt.cal||1.8;if(opt.sup&&close)this.noise(.018,o,{type:'highpass',f0:4200,gain:.15,decay:.018});if(close&&signature>.1){this.tone(o,{f0:Math.max(55,210/Math.sqrt(cal)),f1:Math.max(24,65/Math.sqrt(cal)),dur:.09+.025*Math.sqrt(cal),gain:.11*signature});/* (la bouffée de souffle aigu qui doublait le claquement de l'échantillon est retirée : un « pschit » de plus au départ de chaque tir) */}if(close&&opt.action==='verrou'&&this.budget('bolt',3,.6)){this.noise(.035,o,{type:'bandpass',f0:2200,q:4,gain:.1,at:.35});this.noise(.025,o,{type:'bandpass',f0:1600,q:3,gain:.07,at:.48});}}
    if(name==='boom'||name==='bomb'||name==='cannon'){const big=name==='bomb'||opt.kind==='bomb',power=Math.max(.7,Math.min(1.8,Math.pow(Math.max(.0002,opt.chargeKg||.008)/.008,.17)));this.tone(o,{f0:(big?65:95)/Math.sqrt(power),f1:24,dur:(big?1.2:.65)*power,gain:(big?.24:.15)*power});this.noise((big?1.6:.8)*power,o,{f0:big?700:1000,f1:70,gain:(big?.18:.12)*power});if(close){this.noise(.04,o,{type:'highpass',f0:2800,gain:.2*power,decay:.025});for(let n=0;n<3;n++)this.noise(.045,o,{type:'bandpass',f0:650+n*550,q:2,gain:.05,at:.18+n*.13});}}
  }
  // Les nappes : la nature (vent, oiseaux le jour), et la bataille (grondement lointain, crépitement) selon ce qu'il y a à l'écran.
  beds(){const c=this.ctx;const mk=(type,f,q)=>{const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(this.master);s.start();return {g,fl};};
    // le vent : une bande étroite et basse, par rafales lentes ; le reste ne sonne que quand il se passe quelque chose à l'écran
    this.bed.wind=mk('bandpass',300,.45);this.bed.rumble=mk('lowpass',120,.7);this.bed.crackle=mk('bandpass',1700,.9);this.bed.industry=mk('bandpass',380,.8);}
  ambience({battle=0,fire=0,machines=0,night=false,wind=.5,tension=0}){if(!this.ctx)return;const t=this.ctx.currentTime;const B=this.bed;
    const gust=.6+.4*Math.sin(t*.21)*Math.sin(t*.063+1.3);
    B.wind.g.gain.setTargetAtTime(.02*Math.max(0,Math.min(1,wind))*gust*(night?1.2:1),t,2.6);B.wind.fl.frequency.setTargetAtTime(260+90*Math.sin(t*.11)+60*gust,t,3);
    B.rumble.g.gain.setTargetAtTime(Math.min(.3,battle*.05),t,1);B.crackle.g.gain.setTargetAtTime(Math.min(.05,fire*.01+battle*.004),t,1);
    B.industry.g.gain.setTargetAtTime(Math.min(.035,machines*.005),t,1.4);B.industry.fl.frequency.setTargetAtTime(260+Math.min(380,machines*20)+20*Math.sin(t*1.7),t,1.2);
    // la vie : le jour, des oiseaux ; la nuit, des grillons et, de loin en loin, un hibou — et rien de tout cela quand la bataille fait rage
    if(battle<1.2){if(!night&&Math.random()<.022)this.bird();if(night){if(Math.random()<.3)this.cricket();if(Math.random()<.0025&&tension<.5)this.owl();}}
    if(night&&battle>3&&Math.random()<.002)this.farRumble();}
  // la nuit : tous bas, rares, jamais au premier plan
  farRumble(){const o=this.out({vol:.5,pan:Math.random()*2-1});this.noise(2.8,o,{type:'lowpass',f0:130,f1:42,gain:.08,attack:.6,decay:2.8});}
  owl(){const o=this.out({vol:.2,pan:Math.random()*2-1});const f=360+Math.random()*50;this.tone(o,{f0:f,f1:f*.9,dur:.45,gain:.035,attack:.08});this.tone(o,{f0:f,f1:f*.88,dur:.6,gain:.03,attack:.08,at:.7});}
  // un grillon : trois coups serrés d'une sinusoïde aiguë, à peine audibles, placés au hasard
  cricket(){const o=this.out({vol:.1+Math.random()*.1,pan:Math.random()*2-1});const f=4100+Math.random()*500;for(let k=0;k<3;k++)this.tone(o,{f0:f,dur:.04,gain:.012,attack:.008,at:k*.065});}
  // des oiseaux qui chantent : quatre chants, des sinusoïdes pures qui glissent (aucun souffle)
  bird(){const o=this.out({vol:.2+Math.random()*.15,pan:Math.random()*2-1});const f=2500+Math.random()*1100;const k=Math.floor(Math.random()*4);
    if(k===0){for(let n=0;n<3;n++)this.tone(o,{f0:f*(1.25-n*.1),f1:f*(1.05-n*.1),dur:.16,gain:.04,attack:.02,at:n*.2});}
    else if(k===1){for(let n=0;n<9;n++)this.tone(o,{f0:f*(1.2+(n%2)*.12),f1:f*(1.3+(n%2)*.1),dur:.045,gain:.03,attack:.008,at:n*.06});}
    else if(k===2){this.tone(o,{f0:f*.8,f1:f*1.2,dur:.28,gain:.045,attack:.03});this.tone(o,{f0:f*1.05,f1:f*.75,dur:.35,gain:.04,attack:.03,at:.34});}
    else{for(let n=0;n<4;n++)this.tone(o,{f0:f*1.3,f1:f*1.1,dur:.07,gain:.035,attack:.01,at:n*.11});this.tone(o,{f0:f*1.35,f1:f*.95,dur:.25,gain:.04,attack:.02,at:.5});}}
}
