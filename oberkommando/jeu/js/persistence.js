const KEY='okm-v10-save';
const replacer=(_,v)=>ArrayBuffer.isView(v)?{_typed:v.constructor.name,data:Array.from(v)}:v===Infinity?{_number:'Infinity'}:v===-Infinity?{_number:'-Infinity'}:v;
const reviver=(_,v)=>v?._typed==='Uint8Array'?new Uint8Array(v.data):v?._number?Number(v._number):v;
export const PERSISTENCE={
  serialize(){return JSON.stringify({format:'OKM-V10',state:this.s,rng:this.rand.state?.()},replacer);},
  save(){const data=this.serialize();if(globalThis.localStorage)localStorage.setItem(KEY,data);return data;},
  restore(data){const parsed=JSON.parse(data,reviver);if(parsed.format!=='OKM-V10'||parsed.state?.v!==11||!Array.isArray(parsed.state.units)||!Array.isArray(parsed.state.buildings))throw new Error('Sauvegarde V10 incompatible');
    this.init(parsed.state.seed);this.s=parsed.state;this.events=[];this.rand.state?.(parsed.rng);this.grids();this.remod();return this;},
};
export function resumeWorld(World){const data=globalThis.localStorage?.getItem(KEY);if(!data)return new World();try{return new World(1).restore(data);}catch(e){console.warn('Sauvegarde conservée mais non chargée',e);return new World();}}
