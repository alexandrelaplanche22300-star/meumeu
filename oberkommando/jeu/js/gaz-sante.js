// (V12.9) LA GUERRE CHIMIQUE — la santé : la dose par organe (concentration × temps), les symptômes, l'infection, l'incurable.
// Mécanique de jeu FICTIVE (unités de jeu). Conception : docs/GUERRE-CHIMIQUE.md §2.
// Interfaces : exposeDose(h, C, prot, dts, ctx) — appelée par World.gasExpose ; chemTick(h, dts, rnd) — appelée par tickHealth (health.js).
import {AGENTS} from './gaz.js';

// h.cx : l'état chimique d'une peluche. d : dose par organe ; lat : la dose de peau en attente (vésicant, latence) ; film : la pellicule
// sur la fourrure {agent: quantité} ; inf : l'infection des cloques (0-1) ; st : le stade atteint par organe ; doom : la mort lente fixée.
export function newChem(){return {d:{poumons:0,yeux:0,peau:0,nerfs:0},lat:0,latK:0,film:null,inf:0,st:{poumons:0,yeux:0,peau:0,nerfs:0},doom:null,anti:0,by:{}};}
export function exposeDose(h,C,prot,dts,ctx={}){if(!h||h.state==='mort')return;}
export function chemTick(h,dts,rnd=Math.random){return null;}
