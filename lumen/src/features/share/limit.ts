/* Limite diário de compartilhamentos no plano grátis */
import { store } from "../../core/state";
import { S } from "../../services/storage";
import { html } from "../../utils/html";
import { byId } from "../../utils/dom";
import { closeSheet, openSheet } from "../../ui/sheet";
import { goTab } from "../../app/navigation";
import { dayKey } from "../daily/daily";

/** Quantos versículos o plano grátis pode compartilhar por dia. */
export const FREE_SHARES_PER_DAY = 3;
const KEY = "lumen.shares";

function today(): { day: string; n: number } {
  const d = dayKey(new Date()), s = S.get<{ day?: unknown; n?: unknown }>(KEY, {});
  return s && s.day === d && typeof s.n === "number" && s.n >= 0 ? { day: d, n: Math.floor(s.n) } : { day: d, n: 0 };
}
export const sharesLeft = (): number => (store.premium ? Infinity : Math.max(0, FREE_SHARES_PER_DAY - today().n));

/** Conta um compartilhamento; devolve false (e oferece o Premium) quando o limite do dia acabou. */
export function useShare(): boolean {
  if (store.premium) return true;
  const t = today();
  if (t.n >= FREE_SHARES_PER_DAY) { offerPremium(); return false; }
  S.set(KEY, { day: t.day, n: t.n + 1 });
  return true;
}

function offerPremium(): void {
  openSheet(html`<h2>Você já compartilhou ${FREE_SHARES_PER_DAY} versículos hoje</h2>
   <p class="sub">No plano grátis são ${FREE_SHARES_PER_DAY} por dia. Amanhã você pode compartilhar de novo, ou assine o Premium para compartilhar sem limite.</p>
   <button class="primary" id="shPrem">Conhecer o Premium</button>
   <button class="ghost" id="shLater">Agora não</button>`, "Limite de compartilhamentos");
  byId("shPrem").onclick = () => { closeSheet(); goTab("premium"); };
  byId("shLater").onclick = closeSheet;
}
