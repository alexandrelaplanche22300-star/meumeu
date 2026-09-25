// Le son. Tout est synthétisé (pas un fichier), et placé : un tir loin à gauche s'entend loin et à gauche.
// Chaque son a ses couches : l'attaque (un claquement), le corps (une masse grave qui descend), la queue (la réverbération d'un
// espace ouvert, calculée une fois). Les sons fréquents sont limités, pour que cent fusils ne fassent pas cent fois plus de bruit.
// Deux nappes continues suivent la situation : le vent et la nature, et le grondement de la bataille quand elle est à l'écran.
export class Audio{
  constructor(){this.on=localStorage.getItem('aller3-sound')!=='off';this.ctx=null;this.last={};this.count={};this.bed={};}
  init(){if(this.ctx)return;try{const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=c.createGain();this.master.gain.value=this.on?.8:0;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=5;this.master.connect(comp);comp.connect(c.destination);
      // la réverbération : un bruit qui décroît, filtré — un grand espace dehors
      this.verb=c.createConvolver();const len=c.sampleRate*2.6,ir=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*(i<200?i/200:1);}
      this.verb.buffer=ir;this.wet=c.createGain();this.wet.gain.value=.35;this.verb.connect(this.wet);this.wet.connect(this.master);
      this.noiseBuf=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const nd=this.noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
      this.beds();}catch(e){this.ctx=null;}}
  toggle(){this.on=!this.on;localStorage.setItem('aller3-sound',this.on?'on':'off');if(this.master)this.master.gain.setTargetAtTime(this.on?.8:0,this.ctx.currentTime,.05);return this.on;}
  // une sortie placée : volume selon la distance, gauche-droite selon l'écran
  out(pos){const c=this.ctx;const g=c.createGain();const p=c.createStereoPanner?c.createStereoPanner():null;const vol=pos?pos.vol:1;g.gain.value=vol;
    if(p){p.pan.value=pos?Math.max(-1,Math.min(1,pos.pan)):0;g.connect(p);p.connect(this.master);const send=c.createGain();send.gain.value=pos?.far?.9:.4;p.connect(send);send.connect(this.verb);}else g.connect(this.master);return g;}
  noise(dur,dst,{type='lowpass',f0=1200,f1=null,q=.7,gain=.5,attack=.002,decay=null,at=0}={}){const c=this.ctx,t=c.currentTime+at;const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;
    const f=c.createBiquadFilter();f.type=type;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);f.Q.value=q;const g=c.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+(decay||dur));s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random()*2);s.stop(t+dur+.05);}
  tone(dst,{f0=440,f1=null,dur=.3,type='sine',gain=.3,attack=.005,at=0}={}){const c=this.ctx,t=c.currentTime+at;const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(10,f1),t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(dst);o.start(t);o.stop(t+dur+.05);}
  // limiter les sons en rafale : au plus `n` par `win` secondes pour ce nom
  budget(name,n,win){const now=performance.now()/1000;const L=(this.last[name]||[]).filter(x=>now-x<win);if(L.length>=n){this.last[name]=L;return false;}L.push(now);this.last[name]=L;return true;}
  play(name,pos=null,opt={}){if(!this.ctx||!this.on)return;if(pos&&pos.vol<.02)return;const O=()=>this.out(pos);
    switch(name){
      // le coup de feu dépend de l'arme : la détonation (plus grave et plus forte si la charge est grosse), le claquement sec
      // d'une balle supersonique qui fend l'air, le calibre qui donne la hauteur
      case 'shot':{if(!this.budget(name,14,.5))return;const o=O();const E=opt.E||36,cal=opt.cal||1.8;const loud=Math.min(1.1,.3+Math.log10(1+E)/3);const low=Math.max(.5,Math.min(2,Math.sqrt(1.8/cal)));
        this.noise(.14,o,{type:'lowpass',f0:520*low,gain:.4*loud,decay:.16});this.tone(o,{f0:170*low,f1:55,dur:.09,gain:.25*loud});this.noise(.09,o,{type:'bandpass',f0:1400*low,q:.8,gain:.35*loud,decay:.07});
        if(opt.sup)this.noise(.03,o,{type:'highpass',f0:3500,gain:.45*loud,decay:.025});break;}
      case 'hit':{if(!this.budget(name,6,.4))return;const o=O();this.noise(.07,o,{type:'lowpass',f0:420,gain:.55,decay:.06});this.tone(o,{f0:110,f1:60,dur:.06,gain:.25});break;}
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
      case 'death':{if(!this.budget(name,3,.8))return;const o=O();this.tone(o,{f0:300,f1:120,dur:.35,type:'triangle',gain:.1});break;}
      case 'rail':{const o=O();for(let k=0;k<4;k++)this.noise(.08,o,{type:'bandpass',f0:2500,q:6,gain:.25,at:k*.07});this.tone(o,{f0:1200,f1:700,dur:.4,type:'triangle',gain:.08});break;}
      case 'click':this.tone(this.master,{f0:1400,dur:.04,type:'square',gain:.04});break;
      case 'order':this.tone(this.master,{f0:520,dur:.07,type:'triangle',gain:.08});this.tone(this.master,{f0:780,dur:.08,type:'triangle',gain:.06,at:.05});break;
      case 'bad':this.tone(this.master,{f0:220,dur:.18,type:'square',gain:.05});break;
      case 'won':[262,330,392,523,659,784].forEach((f,k)=>this.tone(this.master,{f0:f,dur:1.4,gain:.12,at:k*.25}));break;}}
  // Les nappes : la nature (vent, oiseaux le jour), et la bataille (grondement lointain, crépitement) selon ce qu'il y a à l'écran.
  beds(){const c=this.ctx;const mk=(type,f,q)=>{const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=c.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(this.master);s.start();return {g,fl};};
    this.bed.wind=mk('bandpass',500,.6);this.bed.rumble=mk('lowpass',140,.8);this.bed.crackle=mk('highpass',3500,.5);}
  ambience({battle=0,fire=0,night=false,wind=.5}){if(!this.ctx)return;const t=this.ctx.currentTime;const B=this.bed;
    B.wind.g.gain.setTargetAtTime(.05*wind*(night?1.3:1),t,1.5);B.wind.fl.frequency.setTargetAtTime(380+220*Math.sin(t*.2),t,2);
    B.rumble.g.gain.setTargetAtTime(Math.min(.5,battle*.08),t,.8);B.crackle.g.gain.setTargetAtTime(Math.min(.12,fire*.02+battle*.01),t,.8);
    if(!night&&Math.random()<.004&&battle<1)this.bird();}
  bird(){const o=this.out({vol:.25,pan:Math.random()*2-1});const f=2200+Math.random()*1500;for(let k=0;k<3;k++)this.tone(o,{f0:f,f1:f*1.3,dur:.09,gain:.05,at:k*.13});}
}
