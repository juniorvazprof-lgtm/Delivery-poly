/**
 * Funcionamento sem internet.
 * - Registra o service worker (só no app de produção; a prévia no Claude não permite).
 * - Avisa quando a conexão cai ou volta.
 * - "Baixar a Bíblia inteira": guarda os 66 livros no cache, para ler qualquer capítulo offline.
 */
import { toast } from "../ui/effects";
import { BOOKS } from "./bible";

const BIBLE_CACHE = "lumen-biblia-v1";
const FILE: Record<string, string> = { "Jó": "Job", "Êx": "Ex" };
const bookUrls = () => [...new Set(Object.values(BOOKS))].map(ab => new URL(`biblia/blivre/${FILE[ab] || ab}.json`, location.href).href);

/** O app está rodando como app de verdade (não na prévia do Claude, nem aberto como arquivo)? */
export const canWorkOffline = (): boolean =>
  import.meta.env.MODE !== "preview" && "serviceWorker" in navigator && "caches" in window && location.protocol !== "file:";

export function startOffline(): void {
  addEventListener("offline", () => toast("Sem internet. O feed, a oração e a Bíblia guardada continuam funcionando."));
  addEventListener("online", () => toast("Conexão de volta"));
  if (!canWorkOffline()) return;
  const register = () => { navigator.serviceWorker.register("sw.js").catch(() => { /* sem service worker o app funciona normalmente online */ }); };
  // O app pode iniciar depois do evento "load" (dados carregados antes); nesse caso registra já.
  if (document.readyState === "complete") register(); else addEventListener("load", register);
}

/** Quantos livros da Bíblia já estão guardados no aparelho (de 66). */
export async function bibleCachedCount(): Promise<number> {
  if (!canWorkOffline()) return 0;
  try {
    const cache = await caches.open(BIBLE_CACHE);
    const keys = new Set((await cache.keys()).map(r => r.url));
    return bookUrls().filter(u => keys.has(u)).length;
  } catch { return 0; }
}

/** Baixa os livros que faltam, avisando o progresso. Devolve quantos ficaram guardados. */
export async function downloadBible(onProgress: (done: number, total: number) => void): Promise<number> {
  const cache = await caches.open(BIBLE_CACHE);
  const urls = bookUrls(), have = new Set((await cache.keys()).map(r => r.url));
  let done = urls.filter(u => have.has(u)).length;
  onProgress(done, urls.length);
  for (const url of urls.filter(u => !have.has(u))) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("falha ao baixar " + url);
    await cache.put(url, res);
    onProgress(++done, urls.length);
  }
  return done;
}
