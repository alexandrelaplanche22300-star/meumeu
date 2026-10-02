// Oberkommando der Meumeu — les bunkers : des PLANS, pas des cases pleines. Chaque type est une grille de caractères ; on entre par une porte, on se déplace
// à l'intérieur comme sur du terrain, on se poste derrière une embrasure, on se cache dans un abri, on charge à la soute.
//   #  mur de béton (bloque tout, arrête les balles selon son épaisseur)
//   E  embrasure : on ne passe pas, mais on tire à travers (le tireur est derrière, sur une case voisine) ; un peu de protection seulement
//   .  sol couvert        o  sol à ciel ouvert (fosse : le tireur est vu d'en haut, les éclats d'obus y tombent)
//   D  porte (blindée : seules les charges l'ouvrent)        G  emplacement d'une pièce (mitrailleuse, canon)        A  soute à munitions
//   ' '  hors du bâtiment (case libre)
// Le haut de la grille est le « front » (le côté des embrasures) pour la rotation 0 ; rot 1, 2, 3 tournent d'un quart de tour, dans le sens des aiguilles d'une montre.
// Les postes se déduisent du plan : une case de sol voisine d'une embrasure est un poste de tir (il regarde l'embrasure), un G est un poste de pièce, un A une soute
// (poste de chargeur), le reste du sol est de l'abri (se cacher, attendre, se reposer). Le pathfinding du jeu fait le reste : il mène chacun à son poste par la porte.

export const BUNKER_TYPES={
  poste_mg:{name:'Poste à mitrailleuse',blurb:'Deux embrasures, une porte : le petit poste qui tient une plage.',rows:[
    '#E#E#',
    '#...#',
    '#...#',
    '##D##']},
  blockhaus_s:{name:'Petit blockhaus',blurb:'Trois embrasures de front, une porte à l’arrière.',rows:[
    '#E#E#E#',
    '#.....#',
    '#.....#',
    '###D###']},
  blockhaus_m:{name:'Blockhaus moyen',blurb:'Trois embrasures de front, une sur chaque flanc, une soute à chaque coin du fond.',rows:[
    '#E#E#E#',
    '#.....#',
    'E.....E',
    '#A...A#',
    '###D###']},
  blockhaus_l:{name:'Grand blockhaus',blurb:'Deux salles, quatre embrasures de front, deux flancs, deux portes, deux soutes.',rows:[
    '#E#E#E#E#',
    '#.......#',
    'E...#...E',
    '#...#...#',
    '#.......#',
    '#A.....A#',
    '###D#D###']},
  fortin:{name:'Fortin',blurb:'Une grande salle à piliers, quatorze embrasures sur trois côtés, deux portes : une garnison de vingt hommes.',rows:[
    '#E#E#E#E#E#',
    '#.........#',
    'E...#.#...E',
    '#...#.#...#',
    'E.........E',
    '#...#.#...#',
    '#.A.#.#.A.#',
    '#.........#',
    '####D#D####']},
  blockhaus_rond:{name:'Blockhaus rond',blurb:'Tir tout autour : deux embrasures de front et deux sur chaque flanc.',rows:[
    ' #E#E# ',
    '#.....#',
    'E.....E',
    '#.....#',
    'E.....E',
    '#.....#',
    ' ##D## ']},
  blockhaus_l_coin:{name:'Blockhaus d’angle',blurb:'Un bras de front, un couloir de flanc : il bat deux directions à la fois.',rows:[
    '#E#E#E#',
    '#.....#',
    '#.#####',
    'E.#    ',
    '#.#    ',
    'E.#    ',
    '#D#    ']},
  double_mg:{name:'Casemate à deux mitrailleuses',blurb:'Une longue salle, une mitrailleuse à chaque bout de la façade.',rows:[
    '#E#####E#',
    '#.......#',
    '#.......#',
    '####D####']},
  tobrouk:{name:'Tobrouk',blurb:'Une fosse de béton à ciel ouvert, une pièce au centre, deux embrasures basses : le poste de plage par excellence.',rows:[
    ' #E# ',
    '#ooo#',
    'EoGo#',
    '#ooo#',
    ' #D# ']},
  tobrouk_double:{name:'Double Tobrouk',blurb:'Deux fosses à pièce reliées par un passage couvert, une porte.',rows:[
    ' #E# #E# ',
    '#ooo#ooo#',
    '#oGo#oGo#',
    '#ooo.ooo#',
    ' ###D### ']},
  fosse_mortier:{name:'Fosse à mortier',blurb:'Une fosse de béton à ciel ouvert, sans embrasure : le mortier tire en cloche, par-dessus.',rows:[
    '#####',
    '#ooo#',
    '#oGo#',
    '#ooo#',
    '##D##']},
  casemate_canon:{name:'Casemate à canon',blurb:'Une embrasure large, un canon, sa soute et ses servants ; la porte est derrière.',rows:[
    '##EEE##',
    '#.....#',
    '#..G..#',
    '#.....#',
    '#A...A#',
    '###D###']},
  casemate_lourde:{name:'Casemate d’artillerie lourde',blurb:'Deux grosses pièces côte à côte, deux portes, deux soutes.',rows:[
    '##EE#EE##',
    '#.......#',
    '#..G.G..#',
    '#.......#',
    '#.......#',
    '#A..#..A#',
    '#...#...#',
    '###D#D###']},
  batterie:{name:'Batterie casematée',blurb:'Trois pièces sous béton, une galerie de munitions au centre, deux portes.',rows:[
    '##EE#EE#EE#',
    '#.........#',
    '#.G..G..G.#',
    '#.........#',
    '#.........#',
    '#A.......A#',
    '#...#.#...#',
    '#...#A#...#',
    '###D###D###']},
  poste_commandement:{name:'Poste de commandement',blurb:'Deux fentes d’observation, une salle de transmissions, une soute.',rows:[
    '#E###E#',
    '#.....#',
    '#.....#',
    '#..A..#',
    '###D###']},
  observatoire:{name:'Observatoire',blurb:'Une seule fente et un guetteur : il voit loin et ne tire guère.',rows:[
    '#E#',
    '#.#',
    '#D#']},
  abri:{name:'Abri',blurb:'Du béton partout, pas d’embrasure : on s’y cache, on s’y repose, les obus n’y entrent pas.',rows:[
    '#####',
    '#...#',
    '#...#',
    '##D##']},
};
export const BUNKER_IDS=Object.keys(BUNKER_TYPES);
export const bunkerKey=id=>'bk_'+id;
export const bunkerIdOf=k=>typeof k==='string'&&k.startsWith('bk_')?k.slice(3):null;

const pad=rows=>{const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>r.padEnd(w,' '));};
// un quart de tour dans le sens des aiguilles d'une montre : la case (a, c) d'une grille w × h devient (h-1-c, a) dans la grille h × w
const rotate=rows=>{const h=rows.length,w=rows[0].length;const out=Array.from({length:w},()=>Array(h).fill(' '));for(let c=0;c<h;c++)for(let a=0;a<w;a++)out[a][h-1-c]=rows[c][a];return out.map(r=>r.join(''));};
const CARD=[[0,-1],[1,0],[0,1],[-1,0]];

const cache=new Map();
// le plan d'un type, tourné de rot quarts de tour : {id,rot,w,h,rows,cells,posts,doors,walls,embr,floors,guns,stores,front}
//  cells[c][a] : le caractère ; posts : [{a,c,kind:'tir'|'gun'|'soute'|'abri',fx,fy}] (fx, fy : le sens du tir, vecteur cardinal) ; doors : [[a,c]] ; front : le sens des embrasures
export function bunkerPlan(id,rot=0){rot=((rot%4)+4)%4;const key=id+'|'+rot;let P=cache.get(key);if(P)return P;
  const T=BUNKER_TYPES[id];if(!T)return null;let rows=pad(T.rows);for(let r=0;r<rot;r++)rows=rotate(rows);
  const h=rows.length,w=rows[0].length;const at=(a,c)=>a<0||c<0||a>=w||c>=h?' ':rows[c][a];
  const posts=[],doors=[],embr=[];let walls=0,floors=0,guns=0,stores=0;
  for(let c=0;c<h;c++)for(let a=0;a<w;a++){const ch=at(a,c);if(ch==='#'||ch==='E'||ch==='D')walls++;if(ch==='D')doors.push([a,c]);if(ch==='E')embr.push([a,c]);if('.oGA'.includes(ch))floors++;if(ch==='G')guns++;if(ch==='A')stores++;}
  const nearestE=(a,c)=>{let best=null,bd=1e9;for(const [ea,ec] of embr){const d=Math.hypot(ea-a,ec-c);if(d<bd){bd=d;best=[ea,ec];}}return best;};
  const dirTo=(a,c,t)=>{const dx=t[0]-a,dy=t[1]-c;return Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];};
  for(let c=0;c<h;c++)for(let a=0;a<w;a++){const ch=at(a,c);if(!'.oGA'.includes(ch))continue;
    // une case voisine (en croix) d'une embrasure : poste de tir, tourné vers elle
    let facing=null;for(const [dx,dy] of CARD)if(at(a+dx,c+dy)==='E'){facing=[dx,dy];break;}
    if(ch==='G'){const t=nearestE(a,c);posts.push({a,c,kind:'gun',fx:t?dirTo(a,c,t)[0]:0,fy:t?dirTo(a,c,t)[1]:-1});}
    else if(ch==='A')posts.push({a,c,kind:'soute',fx:0,fy:0});
    else if(facing)posts.push({a,c,kind:'tir',fx:facing[0],fy:facing[1]});
    else posts.push({a,c,kind:'abri',fx:0,fy:0});}
  // le sens du front : par convention le HAUT du plan (rot 0), tourné comme le plan (un quart de tour par rotation, dans le sens des aiguilles d'une montre)
  const front=[[0,-1],[1,0],[0,1],[-1,0]][rot];
  P={id,rot,w,h,rows,posts,doors,walls,embr,floors,guns,stores,front,at};cache.set(key,P);return P;}

// le coût, les heures et la solidité se déduisent du plan : tant de béton (pierre), du fer pour les embrasures et les portes, un peu de bois (coffrages)
export function bunkerDefs(){const out={};for(const id of BUNKER_IDS){const T=BUNKER_TYPES[id],P=bunkerPlan(id,0);const wallOnly=P.walls-P.embr.length-P.doors.length;
    const abri=id==='abri',lourd=/casemate_lourde|batterie|casemate_canon/.test(id);
    out[bunkerKey(id)]={name:T.name,sprite:'turret',size:[P.w,P.h],bunker:id,why:T.blurb+` (${P.posts.filter(p=>p.kind!=='abri'&&p.kind!=='soute').length} postes, ${P.posts.length} places)`,
      cost:{pierre:Math.round(5*wallOnly+4*P.embr.length+8*P.doors.length+(lourd?30:0)),fer:Math.round(1+.5*wallOnly+1.5*P.embr.length+3*P.doors.length+(lourd?25:0)),bois:2+Math.ceil(P.floors/6)},
      hours:Math.round((4+.8*P.walls+(lourd?10:0))*10)/10,hp:Math.round((700+300*P.walls)*(abri?1.5:1)*(lourd?1.4:1)),store:60+P.stores*70+P.guns*40,eq:abri||lourd?60:40,
      stock0:{}};}
  return out;}
