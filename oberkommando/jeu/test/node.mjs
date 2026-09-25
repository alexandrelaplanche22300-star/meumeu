// Lance les bancs (test/run.mjs) hors du navigateur, avec Node : node test/node.mjs [8,15]
// Un faux document recueille la sortie ; une erreur fait échouer la commande.
const out={textContent:''};
globalThis.document={getElementById:()=>out};
globalThis.location={search:process.argv[2]?`?only=${process.argv[2]}`:''};
try{await import('./run.mjs');}catch(e){console.log(out.textContent);console.error(e);process.exit(1);}
console.log(out.textContent);
