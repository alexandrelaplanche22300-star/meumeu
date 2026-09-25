// Le pont entre la fenêtre et le jeu : la taille de l'interface (A− / A+). Un vrai zoom de page — le texte reste net,
// les cartes se redessinent à la bonne finesse et les clics tombent juste.
const {contextBridge,webFrame}=require('electron');
contextBridge.exposeInMainWorld('okmApp',{
  zoom:f=>{const z=Math.max(.4,Math.min(2,+f||1));webFrame.setZoomFactor(z);return webFrame.getZoomFactor();},
  getZoom:()=>webFrame.getZoomFactor(),
});
