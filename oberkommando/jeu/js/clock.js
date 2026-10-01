// Le calendrier solaire ne pilote ni les usines, ni les cadences, ni l'âge d'une alerte.
export const SOLAR_DEFAULT = Object.freeze({nightSeconds:360,daySeconds:240});
export function advanceSolar(hour,seconds,settings=SOLAR_DEFAULT){
  let h=((hour%24)+24)%24,left=Math.max(0,seconds);
  const night=Math.max(60,Number(settings.nightSeconds)||360)/15;
  const day=Math.max(60,Number(settings.daySeconds)||240)/9;
  while(left>1e-8){
    const dark=h>=17||h<8,end=h<8?8:h<17?17:24,rate=dark?night:day;
    const span=(end-h)*rate;
    if(left<span-1e-8){h+=left/rate;left=0;}else{left-=span;h=end===24?0:end;}
  }
  return h;
}
export function solarRemaining(hour,settings=SOLAR_DEFAULT){
  const dark=hour>=17||hour<8;
  return {night:dark,seconds:dark?((hour>=17?24-hour+8:8-hour)*settings.nightSeconds/15):(17-hour)*settings.daySeconds/9};
}
// Dette conservée : aucune seconde perdue en dessous de 10 FPS. Les grandes interruptions
// sont traitées explicitement par l'interface, pas par un rattrapage de plusieurs minutes.
export class FixedClock{
  constructor(step=.05){this.step=step;this.debt=0;this.elapsed=0;}
  reset(){this.debt=0;}
  advance(realSeconds,speed,run,maxSteps=40){
    if(!Number.isFinite(realSeconds)||realSeconds<0||!Number.isFinite(speed)||speed<0)throw new Error('Horloge invalide');
    if(speed===0)return {steps:0,debt:this.debt};
    this.debt+=realSeconds*speed;let steps=0;
    while(this.debt+1e-9>=this.step&&steps<maxSteps){run(this.step);this.debt=Math.max(0,this.debt-this.step);this.elapsed+=this.step;steps++;}
    return {steps,debt:this.debt};
  }
}
