# Les impacts de balle, synthétisés : la chair, la terre, le ricochet, la balle qui passe. Courts, secs, variés (3 variantes).
import numpy as np,scipy.io.wavfile as wf,scipy.signal as sg
SR=44100;rng=np.random.default_rng(11)
def filt(x,k,f,o=2):b,a=sg.butter(o,np.array(f)/(SR/2),k);return sg.lfilter(b,a,x)
def env(n,a,d):t=np.arange(n)/SR;return np.minimum(1,t/max(1e-4,a))*np.exp(-t/d)
def N(d):return rng.standard_normal(int(d*SR))
def sweep(d,f0,f1,dec,k=.25):n=int(d*SR);t=np.arange(n)/SR;f=f1+(f0-f1)*np.exp(-t/(d*k));return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.0005,dec)
def pad(a,n):return np.concatenate([a,np.zeros(max(0,n-len(a)))])[:n]
def save(y,name,fade=.05):
    y=filt(y,'highpass',40);f=int(fade*SR);y[-f:]*=np.linspace(1,0,f)**2;y=np.tanh(y*1.4);y=y/np.abs(y).max()*10**(-1/20);wf.write(name+'.wav',SR,(y*32767).astype(np.int16))
for v in range(3):
    s='' if v==0 else f'_{v+1}';r=1+(rng.random()-.5)*.2
    # dans le corps : un choc mat et mouillé
    n=int(.28*SR);y=pad(sweep(.2,160*r,60,.04),n)*.9+pad(filt(N(.2),'lowpass',900)*env(int(.2*SR),.0005,.025),n)*.8+pad(filt(N(.06),'bandpass',[1800,4500])*env(int(.06*SR),.0003,.008),n)*.35
    y+=pad(np.zeros(int(.03*SR)),0) if False else 0;save(y,'impact'+s)
    # dans la terre : un « tchak » sec et une pluie de mottes
    n=int(.45*SR);y=pad(filt(N(.08),'bandpass',[300,2500])*env(int(.08*SR),.0003,.012),n)*1.0+pad(sweep(.1,120*r,50,.025),n)*.5
    for _ in range(12):
        o=int((.03+rng.random()*.3)*SR);g=filt(N(.01),'bandpass',[1200,5000])*env(int(.01*SR),.0003,.003);y[o:o+len(g)]+=g*(.1+rng.random()*.25)*np.exp(-o/SR/.15)
    save(y,'impact_terre'+s)
    # le ricochet : le coup sur la pierre puis le sifflement qui descend, avec un peu de vibrato
    n=int(.75*SR);t=np.arange(n)/SR;f0=(2600+rng.random()*1600);f=f0*(.42+.58*np.exp(-t/.25))*(1+.02*np.sin(2*np.pi*(30+rng.random()*20)*t))
    wh=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.02,.22)*.45+filt(N(.75),'bandpass',[2000,6000])*env(n,.01,.15)*.12
    y=pad(filt(N(.02),'highpass',1500)*env(int(.02*SR),.0002,.004),n)*1.0+pad(sweep(.05,900,400,.01),n)*.3+wh;save(y,'ricochet'+s,.1)
    # la balle qui passe : le claquement supersonique, puis le froissement qui s'éloigne (Doppler)
    n=int(.35*SR);t=np.arange(n)/SR;crack=filt(N(.004),'highpass',3500)*env(int(.004*SR),.0001,.0012)
    sw=filt(N(.35),'bandpass',[2500,7000])*env(n,.005,.05)*.25+np.sin(2*np.pi*np.cumsum(4800*r*(1-.45*np.minimum(1,t/.12)))/SR)*env(n,.003,.04)*.18
    y=pad(crack,n)*1.2+sw;save(y,'sifflement'+s,.08)
print('ok')
