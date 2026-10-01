import {HOUR_REAL,UNITS} from './data.js';
const active=u=>u&&u.hp>0&&u.h?.state!=='hors';
const dist=(u,p)=>Math.hypot(u.x-p[0],u.y-p[1]);
export const OP_PHASE={preparation:'Préparation',en_cours:'En cours',suspendue:'Suspendue',retour:'Retour',terminee:'Terminée',annulee:'Annulée'};
export const OP_STEP={approche:'Approche',deplacement:'Déplacement',observation:'Observation',sabotage:'Sabotage',repli:'Repli',retour:'Retour'};
export const OPERATIONS={
  operation(id){return this.s.operations?.find(o=>o.id===id)||null;},
  prepareOperation(ids){const members=[...new Set(ids)].map(id=>this.unit(id)).filter(u=>u?.f==='meumeu'&&active(u)&&u.k!=='villageois');
    if(!members.length)return {ok:false,why:['sélectionnez des soldats en état de partir']};
    const existing=this.s.operations?.find(o=>o.state!=='terminee'&&o.state!=='annulee'&&o.members.some(id=>members.some(u=>u.id===id)));if(existing)return {ok:true,op:existing};
    const home=[members.reduce((n,u)=>n+u.x,0)/members.length,members.reduce((n,u)=>n+u.y,0)/members.length];
    const op={id:this.id(),name:'Opération '+((this.s.operations?.length||0)+1),members:members.map(u=>u.id),home,steps:[],index:0,state:'preparation',roe:'retenu',nv:true,log:[],created:this.t};
    (this.s.operations??=[]).push(op);return {ok:true,op};
  },
  operationPreflight(op){const units=op.members.map(id=>this.unit(id)).filter(Boolean),warnings=[],missing=[];
    if(!units.some(active))missing.push('aucun membre valide');
    if(!op.steps.length)missing.push('aucune étape');
    const remaining=op.steps.slice(op.index);if(remaining.filter(s=>s.kind==='sabotage').length>units.reduce((n,u)=>n+(u.charges||0),0))missing.push('charges insuffisantes pour le programme restant');
    if(remaining.some(s=>s.kind==='sabotage'&&(!this.building(s.target)||!this.s.intel?.[s.target]&&!this.visibleAt('meumeu',...this.bc(this.building(s.target))))))missing.push('cible non reconnue');
    if(units.some(u=>u.w&&!((u.mag||0)+(u.pouch||0)>0)))warnings.push('un ou plusieurs soldats sans munitions');
    if(!units.some(u=>u.jum||u.bino||u.w&&this.W(u.w).optic?.mag>1))warnings.push('aucune optique de reconnaissance');
    if(!units.some(u=>u.bino||u.w&&this.W(u.w).ir))warnings.push('aucune vision nocturne');
    if(units.some(u=>u.h?.state==='blesse'))warnings.push('blessés dans l’équipe');
    if(units.some(u=>u.w&&this.W(u.w).crew>1))warnings.push('pièce collective : approche lente et audible');
    if(!op.steps.some(s=>s.kind==='retour'||s.kind==='repli'))warnings.push('retour au point de rassemblement ajouté après la dernière étape');
    let length=0,p=units.length?[units[0].x,units[0].y]:op.home,seconds=0;
    const pace=Math.max(.15,Math.min(...units.filter(active).map(u=>this.speedOf(u,true)),8));
    for(const s of remaining){const q=s.kind==='retour'||s.kind==='repli'?op.home:s.point||p;length+=Math.hypot(q[0]-p[0],q[1]-p[1]);p=q;seconds+=s.kind==='observation'?(s.seconds||8):s.kind==='sabotage'?5:0;}
    seconds+=(length+Math.hypot(p[0]-op.home[0],p[1]-op.home[1]))/pace*HOUR_REAL*1.4;
    const night=this.nightRemaining();if(night.night&&seconds>night.seconds)warnings.push('durée estimée supérieure à la nuit restante');
    return {ok:!missing.length,missing,warnings,seconds,units};
  },
  addOperationStep(id,step){const op=this.operation(id);if(!op||!['preparation','suspendue'].includes(op.state))return {ok:false,why:['suspendez l’opération pour modifier son programme']};
    if(!OP_STEP[step.kind])return {ok:false,why:['étape inconnue']};
    if(step.kind==='sabotage'){const b=this.building(step.target);if(!b||b.f!=='beee'||!this.s.intel?.[b.id]&&!this.visibleAt('meumeu',...this.bc(b)))return {ok:false,why:['une infrastructure ennemie reconnue']};step.point=this.bc(b);}
    if(!step.point&&!['retour','repli'].includes(step.kind))return {ok:false,why:['choisissez un point sur la carte']};
    op.steps.push({...step});return {ok:true,text:OP_STEP[step.kind]+' ajoutée'};
  },
  startOperation(id){const op=this.operation(id);if(!op)return {ok:false,why:['opération inconnue']};const p=this.operationPreflight(op);if(!p.ok)return {ok:false,why:p.missing};
    if(op.state==='terminee'||op.state==='annulee')return {ok:false,why:['cette opération est clôturée']};
    if(!op.initial)op.initial=Object.fromEntries(p.units.map(u=>[u.id,{name:u.name,ammo:(u.mag||0)+(u.pouch||0),charges:u.charges||0}]));
    for(const u of p.units){u.op=op.id;u.holdFire=op.roe==='retenu';u.quiet=op.roe==='discret';u.roe=op.roe;if(op.nv&&(u.irMax||u.bino||u.w&&this.W(u.w).ir))u.nvOn=true;}
    op.state='en_cours';op.begun??=this.t;op.issued=null;this.operationLog(op,'Départ : '+p.units.length+' participants');return {ok:true,text:op.name+' lancée'};
  },
  operationLog(op,text){op.log.unshift({t:this.t,text});if(op.log.length>30)op.log.pop();this.log(op.name,text,'info');},
  suspendOperation(id,reason='Suspension demandée'){const op=this.operation(id);if(!op||['terminee','annulee'].includes(op.state))return;op.state='suspendue';op.issued=null;op.why=reason;
    for(const id of op.members){const u=this.unit(id);if(active(u)&&u.op===op.id){u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};u.hold=true;u.path=null;}}
    this.operationLog(op,reason);
  },
  interruptOperations(ids){const set=new Set(ids);for(const op of this.s.operations||[])if(['en_cours','retour'].includes(op.state)&&op.members.some(id=>set.has(id))){this.suspendOperation(op.id,'Ordre manuel prioritaire : programme suspendu');for(const id of ids){const u=this.unit(id);if(u)u.op=null;}}},
  returnOperation(id){const op=this.operation(id);if(!op)return;op.state='retour';op.issued=null;op.returnAt=this.t;this.operationLog(op,'Repli vers le point de retour');},
  operationTick(){for(const op of this.s.operations||[]){if(!['en_cours','retour'].includes(op.state))continue;const units=op.members.map(id=>this.unit(id)).filter(active);
    if(!units.length){this.suspendOperation(op.id,'Plus aucun participant valide : vérifier les blessés et organiser une évacuation');op.result=this.operationResult(op);continue;}
    if(op.state==='retour'){
      if(!op.issued){units.forEach((u,n)=>{const a=n*2.4,r=.45*Math.sqrt(n);const p=this.walkSpot(op.home[0]+Math.cos(a)*r,op.home[1]+Math.sin(a)*r);this.order([u.id],{type:'point',x:p[0],y:p[1]},true);if(u.task){u.task.kind='move';u.task.retreat=true;}u.sneakHome=true;});op.issued=this.t;}
      const here=units.filter(u=>dist(u,op.home)<=3);op.returned=here.map(u=>u.id);
      const inactive=op.members.map(id=>this.unit(id)).filter(u=>u&&u.h?.state==='hors'&&dist(u,op.home)>3);
      if(here.length===units.length&&!inactive.length){op.state='terminee';op.finished=this.t;op.result=this.operationResult(op);for(const u of units){u.op=null;u.sneakHome=false;}this.operationLog(op,`Retour effectif : ${here.length} rentrés · ${op.result.dead} perdus`);}
      else if(this.t-op.issued>4&&units.some(u=>u.why?.startsWith('passage bloqué'))){op.why='Retour bloqué : choisissez un autre point ou donnez un ordre manuel';}
      if(inactive.length)op.why=`${inactive.length} blessé(s) à terre : évacuation nécessaire avant de clôturer`;
      continue;
    }
    const step=op.steps[op.index];if(!step){this.returnOperation(op.id);continue;}
    if(!op.issued){op.why=null;op.issued=this.t;op.stepCharges=Object.fromEntries(units.map(u=>[u.id,u.charges||0]));
      if(step.kind==='retour'||step.kind==='repli'){this.returnOperation(op.id);continue;}
      if(step.kind==='observation')this.observe(units.map(u=>u.id),...step.point);
      else if(step.kind==='sabotage'){
        const sab=units.filter(u=>(u.charges||0)>0);if(!sab.length){this.suspendOperation(op.id,'Plus de charges : sabotage impossible');continue;}
        const result=this.order([sab[0].id],{type:'building',id:step.target},true);if(!result.ok){this.suspendOperation(op.id,result.why[0]);continue;}
        if(sab[0].task?.kind==='sabotage')sab[0].task.back=op.home.slice();
        for(const u of units)if(u!==sab[0]){u.task={kind:'guard',tx:u.x,ty:u.y,hold:true};u.hold=true;u.path=null;}
      }else{this.order(units.map(u=>u.id),{type:'point',x:step.point[0],y:step.point[1]},true);for(const u of units)if(u.task)u.task.kind='move';}
      this.operationLog(op,`Étape ${op.index+1} : ${OP_STEP[step.kind]}`);
    }
    const complete=step.kind==='observation'?this.t-op.issued>=(step.seconds||8)/HOUR_REAL:step.kind==='sabotage'?units.some(u=>(u.charges||0)<op.stepCharges[u.id]):units.every(u=>dist(u,step.point)<=Math.max(3,units.length*.8));
    if(complete){op.index++;op.issued=null;}
    else if(step.kind==='sabotage'&&units.some(u=>u.why==='compromis : l’équipe décroche')){this.returnOperation(op.id);op.why='Équipe compromise : repli';}
    else if(this.t-op.issued>3&&units.some(u=>u.why?.startsWith('passage bloqué'))){this.suspendOperation(op.id,'Itinéraire bloqué : modifier le programme ou commander manuellement');}
  }},
  operationResult(op){const roster=op.members.map(id=>this.unit(id)||this.s.buildings.flatMap(b=>[...(b.inside||[]),...(b.wardList||[])]).find(u=>u.id===id));let ammo=0,charges=0;
    ammo=op.fired||0;charges=op.planted||0;
    return {returned:roster.filter(u=>active(u)&&dist(u,op.home)<=3).length,wounded:roster.filter(u=>u?.h&&u.h.state!=='ok').length,dead:roster.filter(u=>!u||u.hp<=0).length,evacuated:roster.filter(u=>u&&this.s.buildings.some(b=>b.wardList?.includes(u))).length,ammo,charges,seconds:(this.t-(op.begun??this.t))*HOUR_REAL};
  }
};
