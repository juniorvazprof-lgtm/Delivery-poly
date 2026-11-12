// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Folhas */
import { html } from "../../utils/html";
import { persist } from "../../core/persist";
import { store } from "../../core/state";
import { openReader } from "../bible/reader";
import { setFilter } from "./filter";
import { copy, toast } from "../../ui/effects";
import { IC, ICON } from "../../ui/icons";
import { closeSheet, openSheet, sheet } from "../../ui/sheet";
import { SB, soon } from "../../ui/soon";

export function openMenu(v){
  openSheet(`<h2>${v.r}</h2><p class="sub">${v.t.join(" · ")}</p>
   <button class="opt" data-a="ler">${ICON.book}<div>Ler o capítulo inteiro<small>Veja o versículo no contexto</small></div></button>
   <button class="opt" data-a="tema">${ICON.tag}<div>Ver mais sobre ${v.t[0]}<small>Filtra o feed por este tema</small></div></button>
   <button class="opt" data-a="ouvir">${ICON.ear}<div>Ouvir em voz alta</div>${SB}</button>
   <button class="opt" data-a="copiar">${ICON.copy}<div>Copiar texto</div></button>
   <button class="opt" data-a="foco">${IC("lens")}<div>Modo foco<small>Esconde tudo e deixa só o versículo. Toque para sair.</small></div></button>
   <button class="opt" data-a="menos">${ICON.less}<div>Mostrar menos assim<small>Diminui este tema no seu feed</small></div></button>`,"Opções do versículo");
  sheet.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{const a=b.dataset.a;closeSheet();
    if(a==="copiar")copy(v);else if(a==="tema")setFilter(v.t[0]);
    else if(a==="foco"){setTimeout(()=>document.body.classList.add("focus"),300)}
    else if(a==="menos"){v.t.forEach(t=>store.taste[t]=Math.min(store.taste[t]||0,0)-3);persist();toast(html`Vamos mostrar menos sobre <em>${v.t[0]}</em>`)}
    else if(a==="ler")setTimeout(()=>openReader(v),250);
    else setTimeout(()=>soon("Ouvir em voz alta"),280)});
}
