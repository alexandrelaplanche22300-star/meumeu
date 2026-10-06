// (V12.8) Les anciens engins (modèles fournis, fiches écrites à la main) sont retirés : les tests de véhicules roulent avec des engins CONÇUS au
// bureau des engins, inscrits sous les anciens identifiants pour garder les tests lisibles.
//   jeep → Jeep de liaison · jeep_mg → Jeep à mitrailleuse · automitrailleuse → Automitrailleuse de reconnaissance (4×4)
//   char → Automitrailleuse lourde 8×8 (l'ancien « char » était une automitrailleuse à canon) · automoteur → Automoteur à casemate (chenillé, canon 28 mm)
//   char_lourd → Char lourd (2,4 × 1,4 cases : l'emprise de l'ancien « char », pour les barges)
import {exemple,EXEMPLES} from '../js/engins.js';
// la carte des tests : la carte V2 (celle du joueur) ; OKM_CARTE=classique pour l'ancienne
export const CARTE=process.env.OKM_CARTE==='classique'?{}:{map:'v2'};
export const TYPES={jeep:'jeep',jeep_mg:'jeep_mg',automitrailleuse:'auto4',char:'auto8',automoteur:'automoteur',char_lourd:'tigre'};
export function enginsDeTest(W){for(const id of ['garage_engins','chenilles','tourelles','gros_moteurs'])if(!W.s.innov.done.includes(id))W.s.innov.done.push(id);W.s.vdesigns??={};for(const [id,ex] of Object.entries(TYPES))W.s.vdesigns[id]={id,f:'meumeu',name:EXEMPLES[ex],status:'prototype',v:exemple(ex),t:0};W.enginsSync();return W;}
