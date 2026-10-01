// Plus d'animaux : ni faune sur la carte, ni chasse, ni enclos. Les vivres viennent des moulins (et des baies).
// Ces méthodes restent posées sur World pour que le reste du code (et les vieilles sauvegardes) ne casse pas.
export const WILDLIFE={
  spawnFauna(){this.s.fauna=[];},
  // une vieille sauvegarde : ses bêtes s'effacent
  faunaTick(){if(this.s.fauna?.length)this.s.fauna=[];},
  killFauna(){},
  penTick(b){b.why='l’élevage a disparu : déblayez cet enclos';b.working=false;},
  wildlifeOrder(u){u.task=null;u.path=null;},
  landHuntRound(){},
};
