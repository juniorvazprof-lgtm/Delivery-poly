/* Limites diários do plano grátis (compartilhar, buscar) */
import { store } from "../../core/state";
import { S } from "../../services/storage";
import { html } from "../../utils/html";
import { byId } from "../../utils/dom";
import { closeSheet, openSheet } from "../../ui/sheet";
import { goTab } from "../../app/navigation";
import { dayKey } from "../daily/daily";
import { watchRewardAd } from "../monetization/rewarded-ad";
import { toast } from "../../ui/effects";

/** Quantas vezes por dia dá para ganhar +1 vendo anúncio (em cada limite). */
export const AD_BONUS_PER_DAY = 3;

/** Quantos versículos o plano grátis pode compartilhar por dia. */
export const FREE_SHARES_PER_DAY = 3;
/** Quantas buscas o plano grátis pode fazer por dia. */
export const FREE_SEARCHES_PER_DAY = 3;

interface Limit { key: string; max: number; title: string; text: string; reward: string; done: string }
const SHARE: Limit = { key: "lumen.shares", max: FREE_SHARES_PER_DAY,
  title: `Você já compartilhou ${FREE_SHARES_PER_DAY} versículos hoje`,
  text: `No plano grátis são ${FREE_SHARES_PER_DAY} por dia. Amanhã você pode compartilhar de novo, ou assine o Premium para compartilhar sem limite.`, reward: "+1 compartilhamento", done: "Mais 1 compartilhamento liberado" };
const SEARCH: Limit = { key: "lumen.searches", max: FREE_SEARCHES_PER_DAY,
  title: `Você já fez ${FREE_SEARCHES_PER_DAY} buscas hoje`,
  text: `No plano grátis são ${FREE_SEARCHES_PER_DAY} buscas por dia. Amanhã você pode buscar de novo, ou assine o Premium para buscar na Bíblia sem limite.`, reward: "+1 busca", done: "Mais 1 busca liberada" };

interface Day { day: string; n: number; ads: number }
const int = (v: unknown, max: number): number => (typeof v === "number" && v >= 0 ? Math.min(Math.floor(v), max) : 0);
function today(l: Limit): Day {
  const d = dayKey(new Date()), s = S.get<{ day?: unknown; n?: unknown; ads?: unknown }>(l.key, {});
  return s && s.day === d ? { day: d, n: int(s.n, 999), ads: int(s.ads, AD_BONUS_PER_DAY) } : { day: d, n: 0, ads: 0 };
}
const left = (l: Limit): number => { if (store.premium) return Infinity; const t = today(l); return Math.max(0, l.max + t.ads - t.n); };
/** Gasta um uso; devolve false (e oferece o Premium) quando o limite do dia acabou. */
function use(l: Limit, retry?: () => void): boolean {
  if (store.premium) return true;
  const t = today(l);
  if (t.n >= l.max + t.ads) { offerPremium(l, retry); return false; }
  S.set(l.key, { ...t, n: t.n + 1 });
  return true;
}
function offerPremium(l: Limit, retry?: () => void): void {
  const ads = AD_BONUS_PER_DAY - today(l).ads;
  openSheet(html`<h2>${l.title}</h2><p class="sub">${l.text}</p>
   ${ads > 0 ? html`<button class="primary" id="limAd">▶ Ver um anúncio e ganhar ${l.reward}</button>
   <p class="fine">Você pode fazer isso mais ${ads} ${ads > 1 ? "vezes" : "vez"} hoje.</p>` : html`<p class="fine">Você já usou os anúncios de hoje.</p>`}
   <button class="${ads > 0 ? "sec" : "primary"}" id="limPrem" data-style="width:100%;margin-top:14px">Conhecer o Premium · sem limites</button>
   <button class="ghost" id="limLater">Agora não</button>`, "Limite do plano grátis");
  const a = document.getElementById("limAd");
  if (a) a.onclick = () => watchRewardAd(l.reward, () => {
    const t = today(l); S.set(l.key, { ...t, ads: Math.min(AD_BONUS_PER_DAY, t.ads + 1) });
    toast(l.done); retry?.();
  });
  byId("limPrem").onclick = () => { closeSheet(); goTab("premium"); };
  byId("limLater").onclick = closeSheet;
}

export const sharesLeft = (): number => left(SHARE);
export const useShare = (retry?: () => void): boolean => use(SHARE, retry);
export const searchesLeft = (): number => left(SEARCH);
export const useSearch = (retry?: () => void): boolean => use(SEARCH, retry);
