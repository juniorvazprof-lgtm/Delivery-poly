/**
 * Telas carregadas sob demanda: o código só é baixado quando a pessoa abre a tela.
 * Na primeira abertura pode haver um pequeno atraso; depois fica em cache (e offline, pelo service worker).
 */
import { toast } from "../ui/effects";

let pulpit: Promise<typeof import("../features/pulpit/pulpit")> | null = null;
let share: Promise<typeof import("../features/share/share")> | null = null;

const failed = (e: unknown) => {
  toast("Não foi possível abrir agora. Verifique a internet e tente de novo.");
  throw e;
};

export function loadPulpit() {
  // Se falhar (sem internet na primeira vez), a próxima tentativa baixa de novo.
  pulpit ??= import("../features/pulpit/pulpit").catch(e => { pulpit = null; return failed(e); });
  return pulpit;
}

export function loadShare() {
  share ??= import("../features/share/share").catch(e => { share = null; return failed(e); });
  return share;
}
