/* Limites diários do plano grátis (compartilhar, buscar) */
import { store } from "../../core/state";
import { S } from "../../services/storage";
import { html } from "../../utils/html";
import { byId } from "../../utils/dom";
import { closeSheet, openSheet } from "../../ui/sheet";
import { goTab } from "../../app/navigation";
import { dayKey } from "../daily/daily";

/** Quantos versículos o plano grátis pode compartilhar por dia. */
export const FREE_SHARES_PER_DAY = 3;
/** Quantas buscas o plano grátis pode fazer por dia. */
export const FREE_SEARCHES_PER_DAY = 3;

interface Limit { key: string; max: number; title: string; text: string }
const SHARE: Limit = { key: "lumen.shares", max: FREE_SHARES_PER_DAY,
  title: `Você já compartilhou ${FREE_SHARES_PER_DAY} versículos hoje`,
  text: `No plano grátis são ${FREE_SHARES_PER_DAY} por dia. Amanhã você pode compartilhar de novo, ou assine o Premium para compartilhar sem limite.` };
const SEARCH: Limit = { key: "lumen.searches", max: FREE_SEARCHES_PER_DAY,
  title: `Você já fez ${FREE_SEARCHES_PER_DAY} buscas hoje`,
  text: `No plano grátis são ${FREE_SEARCHES_PER_DAY} buscas por dia. Amanhã você pode buscar de novo, ou assine o Premium para buscar na Bíblia sem limite.` };

function today(l: Limit): { day: string; n: number } {
  const d = dayKey(new Date()), s = S.get<{ day?: unknown; n?: unknown }>(l.key, {});
  return s && s.day === d && typeof s.n === "number" && s.n >= 0 ? { day: d, n: Math.floor(s.n) } : { day: d, n: 0 };
}
const left = (l: Limit): number => (store.premium ? Infinity : Math.max(0, l.max - today(l).n));
/** Gasta um uso; devolve false (e oferece o Premium) quando o limite do dia acabou. */
function use(l: Limit): boolean {
  if (store.premium) return true;
  const t = today(l);
  if (t.n >= l.max) { offerPremium(l); return false; }
  S.set(l.key, { day: t.day, n: t.n + 1 });
  return true;
}
function offerPremium(l: Limit): void {
  openSheet(html`<h2>${l.title}</h2><p class="sub">${l.text}</p>
   <button class="primary" id="limPrem">Conhecer o Premium</button>
   <button class="ghost" id="limLater">Agora não</button>`, "Limite do plano grátis");
  byId("limPrem").onclick = () => { closeSheet(); goTab("premium"); };
  byId("limLater").onclick = closeSheet;
}

export const sharesLeft = (): number => left(SHARE);
export const useShare = (): boolean => use(SHARE);
export const searchesLeft = (): number => left(SEARCH);
export const useSearch = (): boolean => use(SEARCH);
