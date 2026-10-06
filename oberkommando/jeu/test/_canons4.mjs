const {KIT_PRESETS}=await import('../js/kitdata.js');const B=await import('../js/ballistics.js');const {crateCost,weaponCost}=await import('../js/designs.js');
const f=KIT_PRESETS.find(p=>p.id==='field').design;
const test=(name,o)=>{const p=B.kitToP({...f,...o,name});const D=B.derive(p);const at=r=>D.at(r);
  console.log(name.padEnd(24),'d',p.d,'v0',Math.round(D.v0),'· pen 50/200/500',[50,200,500].map(r=>D.pen(at(r).v).toFixed(2)).join('/'),'· HE',D.he?`${D.he.g?.toFixed?.(1)} g, souffle ${D.he.blast?.toFixed?.(2)} m, blessure ${D.he.inj?.toFixed?.(2)} m`:'non','· caisse',JSON.stringify(crateCost(p)),'· arme',JSON.stringify(weaponCost(p)),'· masse',D.mass?.toFixed?.(1),'kg');return JSON.stringify({...f,...o,name});};
console.log(test('Canon de char Mle 1',{caliberMm:16,barrelLengthCm:46,filler:.2,ogive:.45,coreDensity:6.4,meplat:.24,massG:60,caseLenCm:8,assignedCrew:2,carriage:'none',role:'En tourelle'}));
console.log(test('Canon d’assaut Mle 1',{caliberMm:28,barrelLengthCm:66,filler:.22,ogive:.42,coreDensity:6.3,meplat:.26,massG:320,caseLenCm:13,assignedCrew:2,carriage:'none',role:'En casemate'}));
