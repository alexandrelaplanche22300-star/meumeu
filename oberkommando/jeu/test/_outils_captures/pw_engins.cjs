// Captures V12.8 (sans Electron) : le bureau des engins, une réunion de recherche, un engin conçu sur la carte.
const {main}=require('./pw_harness.cjs');const OUT=process.env.OUT||'/home/user/v128/shots';
main(async({run,wait,shot})=>{
  const live=async n=>{for(let i=0;i<n;i++){await run(`window.__step(3,1/30);0;`);await wait(30);}};
  // 1. le bureau des engins
  await run(`window.engins.show();0;`);await wait(2500);await shot('01_bureau_char_moyen_coupe.png');
  const ex=async(id,name)=>{await run(`(()=>{const s=document.querySelector('#vz-ex');s.value='${id}';s.dispatchEvent(new Event('change',{bubbles:true}));s.dispatchEvent(new Event('input',{bubbles:true}));})();0;`);await wait(2000);};
  const view=async m=>{await run(`document.querySelector('[data-vz="view:${m}"]')?.click();0;`);await wait(1200);};
  await view('ext');await shot('02_bureau_char_moyen_exterieur.png');await view('blind');await shot('03_bureau_char_moyen_epaisseurs.png');
  await view('coupe');await ex('geant');await shot('04_bureau_char_geant_coupe.png');await view('ext');await shot('05_bureau_char_geant_exterieur.png');
  await view('coupe');await ex('losange');await shot('06_bureau_losange_coupe.png');
  await ex('chenT');await shot('07_bureau_chenillette_transport.png');
  await ex('automoteur');await shot('08_bureau_automoteur_casemate.png');
  await run(`window.engins.close();0;`);
  // 2. une réunion de recherche (la sauvegarde de test : la réunion de lancement de l'obusier attend)
  console.log('chargé',await run(`(async()=>{try{const d=await (await fetch('test/_saves/recherche.json')).text();window.__load(d);return 'ok';}catch(e){return 'ERREUR '+e.message;}})()`));
  await run(`(async()=>{await view.set3d?.(true);})();0;`);await wait(3000);
  console.log(await run(`(()=>{const P=world().s.research.programs.find(x=>x.meet);if(!P)return 'pas de réunion';P.meet.shown=Math.max(0,(P.meet.script||[]).length-14);openModal('reunion',P.id);return 'réunion '+P.name;})()`));
  await live(8);await shot('09_reunion.png');await live(80);await shot('10_reunion_suite.png');
  await run(`document.querySelector('[data-r="mini:1"]')?.click();0;`);await live(150);await shot('11_reunion_table_3d.png');
  await run(`document.querySelector('[data-r="mini:0"]')?.click();document.querySelector('[data-act="modal-off"]')?.click();0;`);
  // 3. un engin conçu sur la carte : inscrit, sorti, son équipage à bord, sélectionné (son panneau : essence, places, soute)
  console.log(await run(`(async()=>{const w=world();const E=await import('./js/engins.js');w.s.vdesigns??={};const v=E.exemple('chenM');v.passagers=2;v.soute=6;
    w.s.vdesigns.ecap={id:'ecap',f:'meumeu',name:'Char Meumeu 1',status:'prototype',v,t:w.s.t};w.enginsSync();const c=w.capital();
    let at=null;for(let r=6;r<40&&!at;r++)for(let a=0;a<32&&!at;a++){const x=Math.floor(c.i+2+Math.cos(a/32*6.283)*r)+.5,y=Math.floor(c.j+2+Math.sin(a/32*6.283)*r)+.5;if(w.vehFits(w.vehDef({k:'ecap'}),x,y,0))at=[x,y];}
    const t=w.addCombatVehicle('meumeu','ecap',at[0],at[1],.6);const us=w.s.units.filter(u=>u.f==='meumeu'&&u.hp>0&&!u.inVeh&&!u.sci).slice(0,5);for(const u of us){u.x=t.x;u.y=t.y;w.vehBoard(t,u);}t.fuel=14;
    view.sel.clear();view.selV=t.id;view.lookAt(t.x,t.y);window.renderPanel(true);return 'engin '+t.name+' à '+at.map(Math.round);})()`));
  await run(`(()=>{view.zoom=Math.max(view.zoom||1,2.6);})();0;`);await live(20);await shot('12_engin_concu_carte.png');
},{w:1600,h:900,out:OUT});
