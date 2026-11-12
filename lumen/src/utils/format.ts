// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Música: catálogo de exemplo */

export const mmss=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
export const hsh=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
export const fmtN=n=>n>=1000?(n/1000).toFixed(1).replace(".",",").replace(",0","")+" mil":String(n);
