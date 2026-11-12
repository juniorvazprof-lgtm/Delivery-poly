// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Púlpito: preparar e pregar */

export const cap=t=>t[0].toUpperCase()+t.slice(1);
export const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
