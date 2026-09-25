// Le chemin : A* sur la grille, huit directions, sans couper les coins. Ce qui bloque dépend de qui marche :
// l'eau, la montagne et les bâtiments bloquent tout le monde ; un mur ne bloque que l'ennemi — et pas tout à fait :
// pour l'ennemi, traverser un mur coûte cher mais reste possible, et c'est là qu'il s'arrête pour l'abattre.
export class Pather{
  constructor(N){this.N=N;const M=N*N;this.g=new Float32Array(M);this.from=new Int32Array(M);this.seen=new Int32Array(M);this.shut=new Int32Array(M);this.stamp=0;
    this.heap=new Int32Array(M*2);this.hf=new Float32Array(M*2);}
  // cost(k) : Infinity si bloqué, sinon le prix d'entrer dans la case (1 d'ordinaire). goal(k) : arrivé ?
  find(si,sj,ti,tj,cost,goal,max=30000){const N=this.N;const st=++this.stamp;const s=sj*N+si;const g=this.g,from=this.from,seen=this.seen,shut=this.shut,H=this.heap,HF=this.hf;let n=0;
    const h=(k)=>{const i=k%N,j=(k/N)|0;const dx=Math.abs(i-ti),dy=Math.abs(j-tj);return dx+dy-.586*Math.min(dx,dy);};
    const push=(k,f)=>{let c=n++;H[c]=k;HF[c]=f;while(c>0){const p=(c-1)>>1;if(HF[p]<=HF[c])break;[H[p],H[c]]=[H[c],H[p]];[HF[p],HF[c]]=[HF[c],HF[p]];c=p;}};
    const pop=()=>{const top=H[0];n--;H[0]=H[n];HF[0]=HF[n];let c=0;for(;;){const l=c*2+1,r=l+1;let m=c;if(l<n&&HF[l]<HF[m])m=l;if(r<n&&HF[r]<HF[m])m=r;if(m===c)break;[H[m],H[c]]=[H[c],H[m]];[HF[m],HF[c]]=[HF[c],HF[m]];c=m;}return top;};
    g[s]=0;seen[s]=st;from[s]=-1;push(s,h(s));let best=s,bh=h(s),exp=0;
    while(n>0){const k=pop();if(shut[k]===st)continue;shut[k]=st;if(goal(k)){best=k;bh=0;break;}if(++exp>max)break;const hk=h(k);if(hk<bh){bh=hk;best=k;}
      const i=k%N,j=(k/N)|0;
      for(let d=0;d<8;d++){const di=DI[d],dj=DJ[d];const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(shut[kk]===st)continue;
        const c=cost(kk);if(c===Infinity)continue;
        // en diagonale, les deux cases de côté doivent être libres
        if(di&&dj&&(cost(j*N+a)===Infinity||cost(b*N+i)===Infinity))continue;
        const ng=g[k]+c*(di&&dj?1.414:1);if(seen[kk]===st&&ng>=g[kk])continue;seen[kk]=st;g[kk]=ng;from[kk]=k;push(kk,ng+h(kk));}}
    const out=[];for(let k=best;k!==-1&&k!==s;k=from[k])out.push([k%N,(k/N)|0]);out.reverse();return {path:out,done:bh===0};}
}
const DI=[1,-1,0,0,1,1,-1,-1],DJ=[0,0,1,-1,1,-1,1,-1];
