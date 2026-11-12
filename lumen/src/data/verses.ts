import feedData from "./versiculos-feed.json";
import type { FeedEntry, Verse } from "../types";

/**
 * Versículos do feed, todos da Bíblia Livre (BLIVRE) e conferidos.
 * A fonte da verdade é versiculos-feed.json; para incluir um versículo, edite esse arquivo.
 */
export const V: Verse[] = (feedData.versiculos as FeedEntry[]).map(v => ({ x: v.exibir, r: v.ref, t: v.temas, h: v.cores }));

/** Encontra um versículo do feed pela referência. */
export const byRef = (ref: string): Verse | undefined => V.find(v => v.r === ref);
