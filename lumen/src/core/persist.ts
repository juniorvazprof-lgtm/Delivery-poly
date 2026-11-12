/* TOPO */
import { store } from "./state";
import { S } from "../services/storage";

export const persist=()=>{S.set("lumen.taste",store.taste);S.set("lumen.liked",[...store.liked]);S.set("lumen.saved2",store.saved);S.set("lumen.ann",[...store.announced])};
