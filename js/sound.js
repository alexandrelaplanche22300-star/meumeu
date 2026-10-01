// Le son : une ambiance par biome, le jour et la nuit ; des alertes qu'on reconnaît les yeux
// fermés (Kherm : grave ; Bèè : moteur ; vent : sifflement ; rampe prête : cloche) ; pas de
// musique en continu, un motif au lancement, un au premier retour, un à la fin d'acte.
// Tout est synthétisé : pas un fichier, rien à charger.
export class Sound{
  constructor(){this.ctx=null;this.on=localStorage.getItem('aller-sound')!=='off';this.amb=null;this.ambKind=null;this.gain=null;}
  init(){if(this.ctx)return;try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.gain.gain.value=this.on?1:0;this.gain.connect(this.ctx.destination);}catch(e){this.ctx=null;}}
  toggle(){this.on=!this.on;localStorage.setItem('aller-sound',this.on?'on':'off');if(this.gain)this.gain.gain.setTargetAtTime(this.on?1:0,this.ctx.currentTime,.05);return this.on;}
  noise(seconds){const n=this.ctx.sampleRate*seconds;const b=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const d=b.getChannelData(0);let last=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.5;}return b;}
  // L'ambiance : un souffle filtré, plus grave la nuit, plus rugueux sur la cendre, avec du ressac près de la mer.
  ambient(kind,night){if(!this.ctx)return;const key=kind+(night?'-n':'-d');if(this.ambKind===key)return;this.ambKind=key;
    if(this.amb){const a=this.amb;a.g.gain.setTargetAtTime(0,this.ctx.currentTime,.8);setTimeout(()=>{try{a.src.stop();}catch(e){}},2500);}
    const src=this.ctx.createBufferSource();src.buffer=this.noise(6);src.loop=true;const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=night?180:(kind==='sea'?420:kind==='ash'?260:340);f.Q.value=kind==='ash'?.4:.8;
    const g=this.ctx.createGain();g.gain.value=0;const lfo=this.ctx.createOscillator();lfo.frequency.value=kind==='sea'?.12:.05;const lg=this.ctx.createGain();lg.gain.value=night?.03:.06;lfo.connect(lg);lg.connect(g.gain);lfo.start();
    src.connect(f);f.connect(g);g.connect(this.gain);src.start();g.gain.setTargetAtTime(night?.07:.12,this.ctx.currentTime,1.2);this.amb={src,g,lfo};}
  tone(freq,dur,type='sine',vol=.2,when=0){const o=this.ctx.createOscillator();o.type=type;o.frequency.value=freq;const g=this.ctx.createGain();const t=this.ctx.currentTime+when;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+dur+.05);return o;}
  play(name){if(!this.ctx||!this.on)return;const c=this.ctx;
    if(name==='kherm'){const o=this.tone(52,2.2,'sawtooth',.25);const l=c.createOscillator();l.frequency.value=7;const lg=c.createGain();lg.gain.value=20;l.connect(lg);lg.connect(o.frequency);l.start();l.stop(c.currentTime+2.3);this.tone(78,1.6,'sawtooth',.12,.4);}
    else if(name==='beee'){for(let i=0;i<8;i++)this.tone(110+(i%2)*4,.5,'square',.08,i*.45);this.tone(55,3.6,'sawtooth',.06);}
    else if(name==='wind'){const src=c.createBufferSource();src.buffer=this.noise(3);const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=6;f.frequency.setValueAtTime(400,c.currentTime);f.frequency.exponentialRampToValueAtTime(1600,c.currentTime+1.4);f.frequency.exponentialRampToValueAtTime(500,c.currentTime+2.8);const g=c.createGain();g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(.25,c.currentTime+.6);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+2.9);src.connect(f);f.connect(g);g.connect(this.gain);src.start();src.stop(c.currentTime+3);}
    else if(name==='bell'){this.tone(880,1.8,'sine',.2);this.tone(1320,1.2,'sine',.08,.02);this.tone(880,1.4,'sine',.15,.9);}
    else if(name==='fire'){const src=c.createBufferSource();src.buffer=this.noise(2.5);const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=900;const g=c.createGain();g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(.2,c.currentTime+.2);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+2.4);src.connect(f);f.connect(g);g.connect(this.gain);src.start();this.tone(60,1.2,'triangle',.2);}
    else if(name==='launch'){[262,330,392,523].forEach((f,i)=>this.tone(f,.5,'triangle',.14,i*.16));const src=c.createBufferSource();src.buffer=this.noise(3);const g=c.createGain();g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(.18,c.currentTime+.8);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+2.8);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=500;src.connect(f);f.connect(g);g.connect(this.gain);src.start();}
    else if(name==='return'){[392,494,587,784,587,784].forEach((f,i)=>this.tone(f,.7,'triangle',.14,i*.22));}
    else if(name==='act'){[262,330,392,523,659,784].forEach((f,i)=>this.tone(f,1.4,'sine',.12,i*.3));[131,165].forEach((f,i)=>this.tone(f,3,'triangle',.1,i*.3));}
    else if(name==='hard'){const src=c.createBufferSource();src.buffer=this.noise(1.2);const g=c.createGain();g.gain.setValueAtTime(.3,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+1.1);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=300;src.connect(f);f.connect(g);g.connect(this.gain);src.start();this.tone(45,1,'sawtooth',.2);}
    else if(name==='tick'){this.tone(1200,.06,'square',.05);}}
}
