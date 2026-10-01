import {OP_PHASE,OP_STEP} from './operations.js';
export function operationUI({world,view,ui,say,open,close,speed}){
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let previousSpeed;
  const finishPick=()=>{ui.opPick=null;if(previousSpeed!=null){speed(previousSpeed);previousSpeed=null;}};
  function show(id){open('operation',id);}
  function pick(kind,id){previousSpeed=ui.speed;speed(0);ui.opPick={kind,id};close();say('Clic gauche sur la carte pour '+(kind==='home'?'le point de retour':OP_STEP[kind])+'. Clic droit : annuler.');}
  return {
    modal(id){const W=world(),op=W.operation(id),night=W.nightRemaining();if(!op)return `<header class="mhead"><b>Opérations</b><button data-act="modal-off">Fermer</button></header><div class="mbody"><button data-op="create">Préparer avec la sélection</button>${(W.s.operations||[]).map(o=>`<p><button data-op="open:${o.id}">${escape(o.name)} · ${OP_PHASE[o.state]}</button></p>`).join('')}<p>Sélectionnez votre équipe sur la carte avant de préparer une opération.</p></div>`;
      const p=W.operationPreflight(op),editable=['preparation','suspendue'].includes(op.state),r=op.result;
      return `<header class="mhead"><div><b>${escape(op.name)}</b><small>${OP_PHASE[op.state]} · ${night.night?'Nuit restante':'Avant la nuit'} ${Math.ceil(night.seconds/(ui.speed>0?ui.speed:1))} s ${ui.speed>0?'à la vitesse choisie':'à 1× · en pause'}</small></div><button data-act="modal-off">Fermer</button></header><div class="mbody">
        <p>Équipe : ${op.members.map(id=>escape(W.unit(id)?.name||'absent')).join(', ')} · Retour : ${op.home.map(n=>n.toFixed(1)).join(', ')}</p>
        <div class="row"><button data-op="home:${op.id}">Placer le retour</button><button data-op="roster:${op.id}">Sélectionner l’équipe</button><button data-op="observe:${op.id}">Observer un secteur maintenant</button></div>
        <p>Durée estimée : ${Math.ceil(p.seconds)} s à 1× (trajet et terrain peuvent l’allonger).</p>
        ${p.missing.map(s=>`<p class="bad">Manque : ${escape(s)}</p>`).join('')}${p.warnings.map(s=>`<p class="warn">${escape(s)}</p>`).join('')}
        <p>Règles de tir : ${['retenu','riposte','discret','libre'].map(k=>`<button data-op="roe:${op.id}:${k}" class="${op.roe===k?'on':''}">${k}</button>`).join(' ')} <button data-op="nv:${op.id}">Vision nocturne : ${op.nv?'oui':'non'}</button></p>
        <ol>${op.steps.map((s,n)=>`<li>${n===op.index?'→ ':''}${OP_STEP[s.kind]} ${s.point?s.point.map(v=>v.toFixed(0)).join(', '):'au point de retour'} ${editable?`<button data-op="delete:${op.id}:${n}">Retirer</button>`:''}</li>`).join('')}</ol>
        ${editable?`<div class="row">${['approche','deplacement','observation','sabotage'].map(k=>`<button data-op="add:${op.id}:${k}">${OP_STEP[k]}</button>`).join('')}<button data-op="returnstep:${op.id}">Étape de retour</button></div>`:''}
        <div class="row"><button data-op="start:${op.id}" ${!editable||!p.ok?'disabled':''}>${op.state==='suspendue'?'Reprendre':'Lancer'}</button><button data-op="pause:${op.id}">Suspendre</button><button data-op="return:${op.id}">Replier maintenant</button><button data-op="close:${op.id}">Clôturer / abandonner</button></div>
        ${op.why?`<p class="warn">${escape(op.why)}</p>`:''}${r?`<p>Bilan réel : ${r.returned} rentrés · ${r.wounded} blessés · ${r.dead} perdus · ${r.evacuated} hospitalisés · ${r.ammo} coups tirés · ${r.charges} charges posées.</p>`:''}
        <p class="quiet">Un ordre manuel suspend le programme immédiatement. Le tir retenu reste prioritaire. Une observation est un arrêt orienté, pas un déplacement. Les cibles de sabotage doivent être reconnues.</p>
        ${op.log.map(l=>`<p class="small">${escape(l.text)}</p>`).join('')}</div>`;
    },
    action(value){const [verb,i,arg]=value.split(':'),W=world(),id=+i,op=W.operation(id);let r;
      if(verb==='create'){r=W.prepareOperation([...view.sel]);if(r.ok)show(r.op.id);}else if(verb==='open')show(id);
      else if(verb==='add'||verb==='home'||verb==='observe')pick(verb==='add'?arg:verb,id);
      else if(op){if(verb==='start')r=W.startOperation(id);if(verb==='pause')W.suspendOperation(id);if(verb==='return')W.returnOperation(id);
        if(verb==='returnstep')r=W.addOperationStep(id,{kind:'retour'});if(verb==='roe'){op.roe=arg;for(const u of op.members.map(i=>W.unit(i)).filter(Boolean)){u.roe=arg;u.holdFire=arg==='retenu';u.quiet=arg==='discret';}}
        if(verb==='nv'){op.nv=!op.nv;for(const u of op.members.map(i=>W.unit(i)).filter(Boolean))u.nvOn=op.nv;}
        if(verb==='delete'&&['preparation','suspendue'].includes(op.state)){const n=+arg;op.steps.splice(n,1);if(n<op.index)op.index--;op.index=Math.min(op.index,op.steps.length);}
        if(verb==='roster'){view.sel.clear();op.members.forEach(i=>view.sel.add(i));close();}
        if(verb==='close'){W.suspendOperation(id);op.state='annulee';op.result=W.operationResult(op);for(const i of op.members){const u=W.unit(i);if(u?.op===id)u.op=null;}}}
      if(r)say(r.ok?r.text||'Préparation ouverte':r.why?.join(' · '),r.ok?'good':'bad');
    },
    map(w,button){if(!ui.opPick)return false;const {kind,id}=ui.opPick,op=world().operation(id);finishPick();if(button===2){show(id);return true;}
      if(kind==='home'){op.home=[w.x,w.y];if(op.state==='retour')op.issued=null;}else if(kind==='observe'){world().interruptOperations(op.members);world().observe(op.members,w.x,w.y);}
      else{const target=world().targetAt(w.x,w.y),r=world().addOperationStep(id,{kind,point:[w.x,w.y],seconds:8,target:target?.type==='building'?target.id:null});if(!r.ok)say(r.why.join(' · '),'bad');}show(id);return true;
    }
  };
}
