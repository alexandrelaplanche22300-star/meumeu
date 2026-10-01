const {KIT_PRESETS}=await import('../js/kitdata.js');const B=await import('../js/ballistics.js');
const f=KIT_PRESETS.find(p=>p.id==='field').design;console.log(JSON.stringify(f));
const test=(name,o)=>{const p=B.kitToP({...f,...o,name});const D=B.derive(p);const at=r=>D.at(r);
  console.log(name,'d',p.d,'v0',Math.round(D.v0),'masse',D.mass?.toFixed?.(0),'kg · pen 50/200/500 m',[50,200,500].map(r=>D.pen(at(r).v).toFixed(2)).join('/'),'· HE',D.he?JSON.stringify({g:D.he.g?.toFixed?.(3),blast:D.he.blast?.toFixed?.(2),kill:D.he.inj?.toFixed?.(2)}):'non','· coups/caisse',D.perCrate,'· costK',JSON.stringify(D.costK),'· cadence',D.rpm?.toFixed?.(1),'/min · servants',D.crew);};
test('canon de campagne (kit)',{});
test('char 14 mm',{caliberMm:14,barrelLengthCm:42});
test('char 16 mm',{caliberMm:16,barrelLengthCm:46});
test('assaut 24 mm',{caliberMm:24,barrelLengthCm:62});
test('assaut 28 mm',{caliberMm:28,barrelLengthCm:70});
