/* Estado global */
import { S } from "../services/storage";
import { V } from "../data/verses";
import { TR } from "../features/music/catalog";
import * as valid from "../security/validate";
import type { Store } from "../types";

/** Conjuntos conhecidos, usados para descartar ids inválidos lidos do aparelho. */
const REFS = new Set(V.map(v => v.r));
const TRACKS = new Set<string>(TR.map(t => t.id));
const THEMES = new Set(V.flatMap(v => v.t));

/** Estado mutável compartilhado do app. Cada chave é lida e alterada pelos módulos como store.<chave>. */
export const store: Store = {
  taste: valid.numberMap(S.get("lumen.taste", {}), THEMES, -5, 40),
  liked: new Set(valid.idList(S.get("lumen.liked", []), REFS, valid.LIMITS.saved)),
  saved: valid.idList(S.get("lumen.saved2", []), REFS, valid.LIMITS.saved),
  announced: new Set(valid.idList(S.get("lumen.ann", []), THEMES, 20)),
  filterTag: null,
  tt: undefined,
  onClose: null,
  streak: valid.streak(S.get("lumen.streak", {})),
  remind: valid.time(S.get("lumen.remind", null)),
  AC: null,
  master: null,
  dly: null,
  premium: false,
  musicPreview: false,
  soundOn: S.get<boolean>("lumen.sound", false) === true,
  rewardUntil: valid.timestamp(S.get("lumen.rwu", 0)),
  rw: valid.rewards(S.get("lumen.rw", {})),
  warned: false,
  songLikes: valid.idList(S.get("lumen.songLikes", []), TRACKS, 500),
  pls: valid.playlists(S.get("lumen.pls", []), TRACKS),
  plays: valid.numberMap(S.get("lumen.plays", {}), TRACKS, 0, 1e6),
  recentS: valid.idList(S.get("lumen.recentS", []), TRACKS, valid.LIMITS.recent),
  playerOpen: false,
  LV: { tab: "home", det: null, range: "week" },
  npOpen: false,
  ctx: {},
  plan: "anual",
  adI: 0,
  prayAt: valid.time(S.get("lumen.prayAt", null)),
  pStep: 0,
  pSteps: [],
  SAMPLE: null,
  sermon: null,
  smCtl: null,
  PR: null,
  wake: null,
  active: null,
  since: 0,
  made: 1,
  sinceAd: 0,
  adsShown: 0,
};
