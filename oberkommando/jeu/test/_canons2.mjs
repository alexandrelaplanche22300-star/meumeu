const {KIT_PRESETS}=await import('../js/kitdata.js');const B=await import('../js/ballistics.js');const {DEFAULT_DESIGNS}=await import('../js/designs.js');
const c=DEFAULT_DESIGNS.find(d=>d.id==='canon_mle1');const D=B.derive(c.p);
console.log('canon_mle1 p :',JSON.stringify({d:c.p.d,l:c.p.l,cons:c.p.cons,fill:c.p.fill,shell:c.p.shell,fuse:c.p.fuse,prop:c.p.prop,kit:!!c.p.kit,mag:c.p.mag,action:c.p.action}));
console.log('derive :',JSON.stringify({v0:Math.round(D.v0),he:D.he?{g:+D.he.g?.toFixed?.(3),blast:+D.he.blast?.toFixed?.(2),inj:+D.he.inj?.toFixed?.(2)}:null,perCrate:D.perCrate,costK:D.costK,rpm:D.rpm,crew:D.crew,m:D.m,rm:D.rm}));
const h=KIT_PRESETS.find(p=>p.id==='howitzer').design;console.log('kit obusier :',JSON.stringify(h));
