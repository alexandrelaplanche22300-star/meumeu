// Crée une sauvegarde de la carte mer au jour J : node test/_save_mer.mjs <graine> <jour> <fichier>
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const fs=await import('fs');const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const [seed,D,file]=[+(process.argv[2]||301),+(process.argv[3]||20),process.argv[4]];
const W=new World(seed,{map:'mer'});const P=player(W);while(W.s.t<D*24){W.update(1/60);P.tick?.(1/60);}
fs.writeFileSync(file,W.serialize());console.log('sauvé J'+D,W.s.units.length,'unités');
