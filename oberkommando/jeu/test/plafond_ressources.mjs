// Le plafond de population bèè et le renouvellement des ressources (V12.5) — node test/plafond_ressources.mjs [sauvegarde]
//  1. au-dessus du plafond, la population bèè ne monte plus en deux jours, et aucune ville n'est fondée ;
//  2. sous le plafond (abaissé pour le test au-dessus de l'effectif), elle peut croître ;
//  3. un filon entamé se regarnit (au rythme voulu : son plein en 60 jours) ; un rocher entamé aussi ; un arbre coupé, non.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {NODES}=await import('../js/data.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const W=new World(1).restore(fs.readFileSync(process.argv[2]||'test/_saves/avant_bataille_305/j40.json','utf8'));const s=W.s;
const pop=()=>s.units.filter(u=>u.f==='beee'&&u.hp>0).length+s.buildings.reduce((n,b)=>n+(b.f==='beee'?(b.inside||[]).length:0),0);
const cities=()=>s.beee.cities.filter(c=>!c.fallen).length;
// des nœuds entamés : un filon, un rocher, un arbre — à moitié
const ore=s.nodes.find(n=>n.type==='ore'&&n.left>100),rock=s.nodes.find(n=>n.type==='rock'&&n.left>10&&W.nodeAt[n.j*W.N+n.i]===n.id),tree=s.nodes.find(n=>n.type==='tree'&&n.left>10&&W.nodeAt[n.j*W.N+n.i]===n.id);
for(const n of [ore,rock,tree])n.left=n.max/2;const o0=ore.left,r0=rock.left,t0=tree.left;
const p0=pop(),c0=cities();for(let k=0;k<48*60;k++)W.update(1/60);const p1=pop(),c1=cities();
check('1. au-dessus du plafond : la population ne monte plus, aucune ville nouvelle',p0>=(W.beeePopCap??2500)&&p1<=p0&&c1<=c0,`${p0} → ${p1} Bèè, ${c0} → ${c1} villes, plafond ${W.beeePopCap??2500}`);
const oreGain=ore.left-o0,want=48*ore.max/NODES.ore.regrow;
check('3. le filon se regarnit (son plein en 60 jours)',Math.abs(oreGain-want)<want*.05||ore.left===ore.max,`+${oreGain.toFixed(1)} en 48 h (attendu +${want.toFixed(1)}, s'il n'est pas exploité)`);
check('3. le rocher se regarnit, l’arbre non',rock.left>r0&&tree.left<=t0,`rocher ${r0.toFixed(1)} → ${rock.left.toFixed(1)} · arbre ${t0.toFixed(1)} → ${tree.left.toFixed(1)}`);
W.beeePopCap=p1+400;const p2=pop();for(let k=0;k<48*60;k++)W.update(1/60);const p3=pop();
check('2. sous le plafond : la croissance reprend',p3>p2,`${p2} → ${p3} Bèè en deux jours (plafond levé à ${W.beeePopCap})`);
console.log(ok?'TOUT PASSE':'ÉCHEC');process.exit(ok?0:1);
