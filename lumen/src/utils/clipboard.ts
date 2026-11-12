import { toast } from "../ui/effects";

/** Copia texto e avisa a pessoa. Nunca lança erro. */
export function clip(text: string, okMessage: string): void {
  const fail = () => toast("Não deu para copiar neste navegador");
  try { navigator.clipboard.writeText(text).then(() => toast(okMessage), fail); } catch { fail(); }
}
