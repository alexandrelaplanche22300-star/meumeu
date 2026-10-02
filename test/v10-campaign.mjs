import {World} from '../js/world.js';
const days=+(process.argv[2]||40),seeds=(process.argv[3]||'301,302,303').split(',').map(Number);
for(const seed of seeds){const w=new World(seed),start=performance.now();let peakArmy=0,peakPatrol=0,waves=0,confirmed=0,defenses=0;
  while(w.day<days&&!w.s.lost){w.update(.1);w.events=[];const u=w.s.units.filter(u=>u.f==='beee'&&u.hp>0&&u.w);peakArmy=Math.max(peakArmy,u.length);peakPatrol=Math.max(peakPatrol,u.filter(u=>u.task?.kind==='patrol').length);waves=w.s.beee.waves;confirmed=Math.max(confirmed,Object.keys(w.s.beee.known||{}).length);defenses=Math.max(defenses,w.s.beee.bands?.filter(b=>b.kind==='defense').length||0);}
  console.log(JSON.stringify({seed,day:w.day,peakArmy,peakPatrol,waves,confirmed,defenses,cities:w.s.beee.cities.length,trains:w.s.vehicles.filter(v=>v.f==='beee'&&v.k==='train').length,rails:Object.values(w.s.rails).filter(r=>r.f==='beee'&&r.b).length,lost:w.s.lost,capitalHp:w.capital()?.hp,ms:Math.round(performance.now()-start)}));
}
