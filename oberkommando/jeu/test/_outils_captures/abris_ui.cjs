// capture : le panneau d'un centre-ville avec « Aux abris », puis après le clic (« Fin d'alerte »), puis après la fin d'alerte
const {main}=require('./harness.cjs');const fs=require('fs');const path=require('path');const OUT=path.join(__dirname,'abris');fs.mkdirSync(OUT,{recursive:true});
main(async({win,run,wait,shot})=>{
  await run(`window.__e=[];window.addEventListener('error',e=>window.__e.push(String(e.error?.stack||e.message)));0;`);await wait(1500);
  console.log('jour',await run(`(async()=>{const d=await (await fetch('test/_saves/${process.env.SAVE||'mer301_j30.json'}')).text();return window.__load(d);})()`));
  const id=await run(`(()=>{const w=world();const c=w.s.buildings.find(b=>b.k==='centre'&&b.f==='meumeu'&&!b.ally&&b.done&&!b.ruin)||w.s.buildings.find(b=>b.k==='centre'&&b.f==='meumeu'&&b.done);view.sel.clear();view.selB=c.id;view.lookAt(c.i+2,c.j+2);view.zoom=1.4;return c.id;})()`);
  await wait(1500);console.log('bouton :',await run(`document.querySelector('[data-act="shelter-city"]')?.textContent||'ABSENT'`));
  await run(`document.querySelector('[data-act="shelter-city"]')?.scrollIntoView({block:'center'});0;`);await wait(400);await shot('1_avant.png');
  await run(`document.querySelector('[data-act="shelter-city"]').click();0;`);await wait(800);
  console.log('message :',await run(`[...document.querySelectorAll('.toast,.say,#say,.msg')].map(e=>e.textContent).join(' | ').slice(0,200)`));
  await run(`document.querySelector('.speeds [data-speed="2"]')?.click();0;`);await wait(6000);await run(`document.querySelector('.speeds [data-speed="0"]')?.click();0;`);
  console.log('à l’abri :',await run(`world().shelterHidden(world().building(${id}))`),'bouton :',await run(`document.querySelector('[data-act="shelter-end"]')?.textContent||'ABSENT'`));
  await run(`document.querySelector('[data-act="shelter-end"]')?.scrollIntoView({block:'center'});0;`);await wait(400);await shot('2_alerte.png');
  await run(`document.querySelector('[data-act="shelter-end"]').click();0;`);await wait(800);
  console.log('après fin d’alerte : à l’abri',await run(`world().shelterHidden(world().building(${id}))`),'bouton :',await run(`document.querySelector('[data-act="shelter-city"]')?.textContent||'ABSENT'`));await shot('3_fin.png');
  console.log('erreurs page :',await run(`JSON.stringify(window.__e)`));
},{w:1600,h:900,out:path.join(__dirname,'abris')});
