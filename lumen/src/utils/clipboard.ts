// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Exemplo pronto, escrito para ser lido em voz alta */
import { toast } from "../ui/effects";

export function clip(t,ok){try{navigator.clipboard.writeText(t).then(()=>toast(ok),()=>toast("Não deu para copiar neste navegador"))}catch{toast("Não deu para copiar neste navegador")}}
