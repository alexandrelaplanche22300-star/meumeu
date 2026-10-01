# La forge à sons : de chaque fichier généré on ne garde que le claquement (les premières dizaines de ms), réparé ;
# le corps grave, la traîne et l'écho de lisière sont refaits proprement. Sortie : 44,1 kHz, 16 bits, crête à -1 dBFS.
import numpy as np,scipy.io.wavfile as wf,scipy.signal as sg,os
from scipy.interpolate import CubicSpline
SR=44100;DL='C:/Users/alexa/Downloads/';OUT='C:/Users/alexa/Downloads/oberkommando der meumeu OKM/oberkommando/jeu/assets/sfx/'
rng=np.random.default_rng(7)
def load(f):
    sr,x=wf.read(DL+f);x=x.astype(np.float64);x=x.mean(1) if x.ndim>1 else x;x/=32768
    if sr!=SR:x=sg.resample_poly(x,SR,sr)
    return x
def declip(x,th=.97):
    y=x.copy();bad=np.abs(x)>th;i=0;n=len(x)
    while i<n:
        if bad[i]:
            j=i
            while j<n and bad[j]:j+=1
            a=max(0,i-6);b=min(n,j+6);idx=[k for k in range(a,b) if not bad[k]]
            if len(idx)>=4:
                cs=CubicSpline(idx,x[idx]);y[i:j]=cs(np.arange(i,j))
            i=j
        else:i+=1
    return y/max(1e-9,np.abs(y).max())
def onset(x,th=.25):
    h=int(SR*.002);e=np.array([np.abs(x[k:k+h]).max() for k in range(0,len(x)-h,h)]);k=int(np.argmax(e>th*e.max()));return max(0,k*h-int(SR*.002))
def filt(x,kind,f,order=2):
    b,a=sg.butter(order,np.array(f)/(SR/2),kind);return sg.lfilter(b,a,x)
def env(n,att,dec):
    t=np.arange(n)/SR;return np.minimum(1,t/max(1e-4,att))*np.exp(-t/dec)
def sweep(dur,f0,f1,dec):
    n=int(dur*SR);t=np.arange(n)/SR;f=f1+(f0-f1)*np.exp(-t/(dur*.25));ph=2*np.pi*np.cumsum(f)/SR;return np.sin(ph)*env(n,.001,dec)
def brown(dur):
    w=rng.standard_normal(int(dur*SR));b=np.cumsum(w);b=filt(b,'highpass',25);return b/np.abs(b).max()
def add(a,b):
    n=max(len(a),len(b));return pad(a,n)+pad(b,n)
def pad(a,n):return np.concatenate([a,np.zeros(max(0,n-len(a)))])[:n]
def mix(parts,dur):
    n=int(dur*SR);y=np.zeros(n)
    for off,sig,g in parts:
        o=int(off*SR);s=sig[:max(0,n-o)];y[o:o+len(s)]+=s*g
    return y
def slap(y,delays=((.085,.22),(.21,.12),(.46,.06)),lp=1800):
    z=y.copy();w=filt(y,'lowpass',lp)
    for d,g in delays:
        o=int(d*SR);z[o:]+=w[:len(z)-o]*g
    return z
def finish(y,name,fade=.15,drive=1.3):
    y=np.tanh(y*drive)/np.tanh(drive);y=filt(y,'highpass',28)
    n=len(y);f=int(fade*SR);y[-f:]*=np.linspace(1,0,f)**2;y[:32]*=np.linspace(0,1,32)
    y=y/np.abs(y).max()*10**(-1/20);wf.write(OUT+name+'.wav',SR,(y*32767).astype(np.int16));return y
def resample(x,rate):return sg.resample_poly(x,100,int(round(100*rate)))
def crack(x,ms,hp=250,lp=None):
    c=x[:int(ms/1000*SR)].copy();c=filt(c,'highpass',hp)
    if lp:c=filt(c,'lowpass',lp)
    c*=np.concatenate([np.ones(int(len(c)*.6)),np.linspace(1,0,len(c)-int(len(c)*.6))**1.5]);return c
def tail(x,start_ms,dur,lp,dec):
    t=x[int(start_ms/1000*SR):];t=filt(t,'lowpass',lp);t=pad(t,int(dur*SR))*env(int(dur*SR),.005,dec);return t
made={}
# ---- les coups de fusil légers : trois coups de « tirs_leger », trois variantes
L=declip(load('tirs_leger.wav'))
for k,t0 in enumerate([.40,.73,.99]):
    seg=L[int(t0*SR):int((t0+.25)*SR)];seg=seg[onset(seg):]
    y=mix([(0,crack(seg,55,hp=300),1),(0,sweep(.12,230,80,.035),.55),(0,brown(.12)*env(int(.12*SR),.001,.03),.25),(.03,tail(seg,55,.5,3200,.09),.35)],.7)
    made['tir_leger'+('' if k==0 else f'_{k+1}')]=finish(slap(y,((.07,.18),(.17,.09),(.4,.04))),'tir_leger'+('' if k==0 else f'_{k+1}'),fade=.2)
# ---- le fusil lourd (moyen calibre)
M=declip(load('tir_moyen.wav'));M=M[onset(M):]
y=mix([(0,crack(M,70,hp=220),1),(0,sweep(.18,170,55,.06),.8),(0,brown(.2)*env(int(.2*SR),.001,.05),.35),(.04,tail(M,70,.9,2600,.16),.45)],1.1)
made['tir_moyen']=finish(slap(y),'tir_moyen',fade=.3,drive=1.5)
# ---- le gros calibre
Hh=declip(load('tir_lourd.wav'));Hh=Hh[onset(Hh):]
y=mix([(0,crack(Hh,85,hp=180),1),(0,sweep(.3,130,42,.1),1.1),(0,brown(.3)*env(int(.3*SR),.002,.08),.5),(.05,tail(Hh,85,1.2,2000,.25),.5)],1.5)
made['tir_lourd']=finish(slap(y,((.09,.26),(.23,.15),(.52,.08)),lp=1400),'tir_lourd',fade=.4,drive=1.7)
# ---- le mortier : un « ploc » creux, le claquement du fichier en plus doux
Mo=declip(load('mortier.wav'));Mo=Mo[onset(Mo):]
tube=sweep(.35,120,78,.12)+.35*sweep(.35,245,160,.06)
y=mix([(0,tube,1.1),(0,crack(Mo,45,hp=400,lp=5000),.55),(0,filt(brown(.4),'bandpass',[250,700])*env(int(.4*SR),.003,.07),.5),(.03,tail(Mo,45,1.2,1500,.3),.35)],1.4)
made['mortier']=finish(slap(y,((.11,.2),(.26,.1)),lp=1000),'mortier',fade=.4)
# ---- l'obusier : le gros calibre ralenti, un souffle énorme, une longue traîne qui roule
Ob=resample(Hh,.55)
y=mix([(0,crack(Ob,120,hp=120),1),(0,sweep(.7,85,30,.22),1.4),(0,brown(1.5)*env(int(1.5*SR),.004,.35),.8),(.08,tail(Ob,120,2.4,900,.6),.6)],2.8)
made['obusier']=finish(slap(y,((.14,.3),(.35,.2),(.8,.12),(1.3,.06)),lp=900),'obusier',fade=.8,drive=1.8)
# ---- les explosions : le fichier [0] (souffle large bande), de plus en plus grave et long
E0=declip(load('untitled_Export_2026-09-26_13-48-35.wav'));E0=E0[onset(E0):]
E2=declip(load('untitled_Export_2026-09-26_13-46-34.wav'));E2=E2[onset(E2):]
def debris(dur,n,start=.15):
    z=np.zeros(int(dur*SR))
    for _ in range(n):
        o=int((start+rng.random()*(dur-start-.1))*SR);g=filt(rng.standard_normal(int(.012*SR)),'bandpass',[1500,6000])*env(int(.012*SR),.0005,.004)
        z[o:o+len(g)]+=g*(.2+rng.random()*.5)*np.exp(-(o/SR-start)/(dur*.4))
    return z
y=mix([(0,crack(E0,90,hp=150),1),(0,sweep(.45,110,35,.14),1.2),(0,brown(.9)*env(int(.9*SR),.002,.2),.7),(.05,tail(E0,90,1.6,2400,.35),.6),(0,debris(1.6,40),.5)],1.8)
made['explosion_grenade']=finish(slap(y,((.1,.25),(.28,.14),(.6,.07))),'explosion_grenade',fade=.5,drive=1.8)
Eo=resample(E0,.72)
y=mix([(0,crack(Eo,120,hp=100),1),(0,sweep(.8,80,26,.25),1.5),(0,brown(2)*env(int(2*SR),.003,.45),.9),(.07,tail(Eo,120,2.6,1500,.6),.7),(0,debris(2.6,70,.2),.55)],2.9)
made['explosion_obus']=finish(slap(y,((.13,.3),(.34,.18),(.75,.1),(1.2,.05)),lp=1100),'explosion_obus',fade=.8,drive=2)
Ed=resample(E0,.58);E2s=resample(E2,.7)
y=mix([(0,crack(Ed,150,hp=80),1),(0,sweep(1.2,65,22,.4),1.7),(0,brown(4)*env(int(4*SR),.01,1.1),1.0),(.08,tail(Ed,150,3.5,1000,.9),.7),
       (.55,add(crack(E2s,110,hp=150),sweep(.4,90,30,.12)*.8),.75),(1.25,add(crack(E2s,110,hp=200)*.8,sweep(.3,120,40,.09)*.6),.55),(1.9,crack(E0,70,hp=300)*.6,.45),(2.6,sweep(.25,150,50,.07),.4),(0,debris(4.5,160,.2),.6)],5.0)
made['explosion_depot']=finish(slap(y,((.15,.3),(.4,.2),(.9,.12),(1.5,.07)),lp=900),'explosion_depot',fade=1.2,drive=2.2)
# la planche d'écoute : chaque son, une seconde de silence entre deux
order=['tir_leger','tir_leger_2','tir_leger_3','tir_moyen','tir_lourd','mortier','obusier','explosion_grenade','explosion_obus','explosion_depot']
pl=np.concatenate([np.concatenate([made[k],np.zeros(int(.8*SR))]) for k in order])
wf.write('C:/Users/alexa/Downloads/planche-bruitages-okm.wav',SR,(pl/np.abs(pl).max()*.89*32767).astype(np.int16))
for k in order:y=made[k];print(f"{k:18s} {len(y)/SR:.2f}s rms300ms {20*np.log10(np.sqrt(np.mean(y[:int(.3*SR)]**2))):.1f} dB")
