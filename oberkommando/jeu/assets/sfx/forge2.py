# La forge à sons, deuxième version : les départs de coups, refaits de zéro en couches physiques, sans dépendre d'aucun fichier généré.
#  · le claquement : l'onde de souffle, une impulsion très brève (quelques ms), large bande, plus grave et plus longue pour un gros calibre ;
#  · le corps : une sinusoïde qui descend (la masse d'air qui part), sa durée suit la charge ;
#  · la flamme : un bruit qui s'assombrit vite (les gaz qui se détendent) ;
#  · l'espace : des échos de lisière (quelques rebonds filtrés) et une traîne diffuse qui s'éteint sans souffle continu.
# Sortie : 44,1 kHz, 16 bits, mono, crête à -1 dBFS, départ et fin sans clic. Lancer : python forge2.py  (numpy et scipy)
import numpy as np,scipy.io.wavfile as wf,scipy.signal as sg,os
SR=44100;OUT=os.path.dirname(os.path.abspath(__file__))+'/'
def sos(kind,f,order=2):return sg.butter(order,np.array(f)/(SR/2),kind,output='sos')
def filt(x,kind,f,order=2):return sg.sosfilt(sos(kind,f,order),x)
def T(n):return np.arange(n)/SR
def env(n,att,dec):t=T(n);return np.minimum(1,t/max(1e-4,att))*np.exp(-t/dec)
def sweep(dur,f0,f1,tau,sr=SR):
    n=int(dur*SR);t=T(n);f=f1+(f0-f1)*np.exp(-t/(dur*.22));ph=2*np.pi*np.cumsum(f)/SR;return np.sin(ph)*env(n,.0008,tau)
def pad(a,n):return np.concatenate([a,np.zeros(max(0,n-len(a)))])[:n]
def place(y,off,sig,g):
    o=int(off*SR);n=min(len(sig),len(y)-o)
    if n>0:y[o:o+n]+=sig[:n]*g
def darkening_noise(rng,dur,f0,f1,tau,att=.001):
    """un bruit qui s'assombrit : le même bruit filtré à plusieurs coupures, fondu de l'une à l'autre (pas de filtre qui change en route : pas de clic)"""
    n=int(dur*SR);w=rng.standard_normal(n);K=7;fcs=[min(SR*.45,max(60,f1+(f0-f1)*(1-k/(K-1))**2)) for k in range(K)]   # de f0 (k=0) à f1 (k=K-1)
    F=[filt(w,'lowpass',fc,2) for fc in fcs];t=T(n);fc_t=f1+(f0-f1)*np.exp(-t/(dur*.3));pos=np.clip((1-np.sqrt(np.clip((fc_t-f1)/max(1,f0-f1),0,1)))*(K-1),0,K-1-1e-6)
    i=pos.astype(int);fr=pos-i;out=np.zeros(n)
    for k in range(K-1):
        m=(i==k);out[m]=F[k][m]*(1-fr[m])+F[k+1][m]*fr[m]
    return out*env(n,att,tau)
def space(y,rng,early,tail_dur,tail_g,tail_lp=1400):
    """échos de lisière puis traîne diffuse (bruit qui s'éteint), filtrés : pas de souffle continu"""
    w=filt(y,'lowpass',1600);z=y.copy()
    for d,g in early:place(z,d+rng.uniform(-.004,.004),w,g)
    n=int(tail_dur*SR);tail=filt(rng.standard_normal(n),'lowpass',tail_lp)*env(n,.03,tail_dur*.28)
    # la traîne suit l'énergie du coup : enveloppe d'amplitude du signal lissée
    e=np.abs(sg.hilbert(y[:int(.25*SR)]));e=filt(e,'lowpass',30);g=np.max(e)*tail_g
    place(z,.05,tail,g)
    return z
def finish(y,name,fade=.12):
    y=y.copy();y=filt(y,'highpass',30,2);y=np.tanh(y*1.15)/np.tanh(1.15)
    f=int(fade*SR);y[-f:]*=np.linspace(1,0,f)**2;y[:24]*=np.linspace(0,1,24)
    y=y/np.abs(y).max()*10**(-1/20);wf.write(OUT+name+'.wav',SR,(y*32767).astype(np.int16));return y
# ---- les coups
KINDS={  # claquement (ms, passe-haut, gain), corps (f0,f1,tau,gain), flamme (coupure début/fin, tau, gain), traîne (s, gain)
 'leger':dict(ck=(3.2,2000,.8),body=(300,110,.03,.4),fl=(4500,700,.035,.5),tail=(1.3,.16)),
 'moyen':dict(ck=(5,1000,.35),body=(230,80,.055,.65),fl=(2800,400,.06,.6),tail=(1.7,.2)),
 'lourd':dict(ck=(7,500,.18),body=(170,55,.11,.9),fl=(1800,250,.11,.7),tail=(2.3,.26)),
 'obusier':dict(ck=(10,300,.08),body=(95,32,.30,1.0),fl=(1000,150,.25,.75),tail=(3.6,.34)),
}
def gun(kind,seed,jit=.06):
    rng=np.random.default_rng(seed);P=KINDS[kind];J=lambda v:v*(1+rng.uniform(-jit,jit))
    dur=P['tail'][0]+.4;n=int(dur*SR);y=np.zeros(n)
    ck_ms,ck_hp,ck_g=P['ck'];c=rng.standard_normal(int(.06*SR));c=filt(c,'highpass',J(ck_hp),2)*env(len(c),.0002,J(ck_ms)/1000*.55);place(y,0,c,1.0*ck_g)
    f0,f1,tau,g=P['body'];place(y,.0015,sweep(tau*5+.05,J(f0),J(f1),J(tau)),g)
    a,b,tau2,g2=P['fl'];place(y,.0008,darkening_noise(rng,tau2*6+.05,J(a),J(b),J(tau2)),g2)
    # un claquement de culasse, discret, pour le calibre léger
    if kind=='leger':
        k=filt(rng.standard_normal(int(.012*SR)),'bandpass',[2200,3600],2)*env(int(.012*SR),.0005,.004);place(y,.16+rng.uniform(0,.03),k,.10)
    early=[(.055,.30),(.11,.22),(.19,.16),(.31,.11),(.47,.07)]
    return space(y,rng,early,P['tail'][0],P['tail'][1])
def mortar(seed):
    rng=np.random.default_rng(seed);n=int(2.4*SR);y=np.zeros(n)
    # le « ploc » creux : la charge qui part au fond du tube, puis la résonance du tube
    place(y,0,sweep(.35,260,90,.07),.9)
    r=filt(rng.standard_normal(int(.25*SR)),'bandpass',[380,520],3)*env(int(.25*SR),.001,.05);place(y,.002,r,1.1)
    place(y,0,darkening_noise(rng,.25,2400,500,.045),.5)
    place(y,.0,filt(rng.standard_normal(int(.02*SR)),'highpass',900)*env(int(.02*SR),.0003,.004),.22)
    return space(y,rng,[(.09,.3),(.2,.2),(.38,.12)],1.8,.22)
def rocket(seed):
    rng=np.random.default_rng(seed);dur=2.6;n=int(dur*SR);y=np.zeros(n)
    # l'allumage (claquement sec), puis le chuintement du moteur qui monte et s'éloigne
    place(y,0,filt(rng.standard_normal(int(.03*SR)),'bandpass',[600,2600],2)*env(int(.03*SR),.0003,.008),.3)
    w=rng.standard_normal(n);t=T(n);fc=1100+1800*(1-np.exp(-t/.5));w=filt(w,'bandpass',[500,2200],2)*env(n,.06,1.0)
    rumble=filt(rng.standard_normal(n),'lowpass',160)*env(n,.05,.7)
    place(y,.01,w,.3);place(y,.01,rumble,.8);place(y,0,sweep(.5,190,70,.1),.5)
    return space(y,rng,[(.12,.22),(.3,.12)],1.6,.12)
if __name__=='__main__':
    for k,name in (('leger','tir_leger'),('moyen','tir_moyen'),('lourd','tir_lourd')):
        for i,suf in enumerate(['','_2','_3']):
            y=finish(gun(k,101+17*i+len(k)),name+suf) if (k=='leger' or i==0) else None
    for i,suf in enumerate(['','_2']):finish(gun('obusier',301+i),'obusier' if i==0 else 'obusier_2')
    finish(mortar(11),'mortier');finish(rocket(21),'fusee')
    print('ok')
