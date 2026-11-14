/* Compartilhar um cartão como imagem 1080×1920 (Stories e status), com a luz na cor litúrgica do dia e o símbolo do cartão. */
import { html, setHTML } from "../utils/html";
import { byId, qMaybe } from "../utils/dom";
import { openSheet, toast } from "../ui/ui";
import { simboloURL } from "../ui/simbolos";
import { LUZ } from "../core/liturgia";
import { infoDoDia } from "../core/dia";
import type { Cartao } from "../data/cartoes";

const rgba = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
function quebra(x: CanvasRenderingContext2D, t: string, max: number): string[] {
  const out: string[] = []; let linha = "";
  for (const w of t.split(" ")) { const tt = linha ? linha + " " + w : w; if (x.measureText(tt).width > max && linha) { out.push(linha); linha = w; } else linha = tt; }
  out.push(linha); return out;
}
const carregar = (src: string) => new Promise<HTMLImageElement | null>(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

export async function desenhar(c: Cartao): Promise<HTMLCanvasElement> {
  try { await Promise.all([document.fonts.load('400 80px "Fraunces"'), document.fonts.load('600 36px "Manrope"')]); } catch { /* sem fontes: usa as do sistema */ }
  const W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d"); if (!x) return cv;
  const luz = LUZ[infoDoDia(new Date()).cor];
  x.fillStyle = "#0E0D14"; x.fillRect(0, 0, W, H);
  ([[160, 380, luz[0], .55], [940, 1580, luz[1], .45]] as [number, number, string, number][]).forEach(([cx, cy, cor, a]) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, 1050); g.addColorStop(0, rgba(cor, a)); g.addColorStop(1, rgba(cor, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H); });
  const img = await carregar(simboloURL(c.simbolo, "#E2BE74")); if (img) x.drawImage(img, W / 2 - 90, 250, 180, 180);
  x.textAlign = "center"; x.fillStyle = "#E2BE74"; x.font = '700 30px "Manrope", sans-serif'; x.letterSpacing = "8px"; x.fillText(c.rotulo.toUpperCase(), W / 2, 520); x.letterSpacing = "0px";
  let y = 600;
  if (c.titulo) { x.fillStyle = "#F1ECE2"; x.font = '500 64px "Fraunces", Georgia, serif'; for (const l of quebra(x, c.titulo, 860)) { x.fillText(l, W / 2, y + 60); y += 78; } y += 40; }
  const len = c.texto.length, fs = len < 70 ? 92 : len < 160 ? 70 : len < 260 ? 56 : 46, lh = fs * 1.35;
  x.font = `400 ${fs}px "Fraunces", Georgia, serif`; x.fillStyle = c.titulo ? "rgba(241,236,226,.86)" : "#F1ECE2";
  const linhas = quebra(x, c.titulo ? c.texto : `“${c.texto}”`, 880).slice(0, 14);
  const topo = c.titulo ? y + 20 : Math.max(y, (H - linhas.length * lh) / 2 - 60);
  linhas.forEach((l, i) => x.fillText(l, W / 2, topo + fs + i * lh));
  x.fillStyle = "rgba(241,236,226,.66)"; x.font = '600 34px "Manrope", sans-serif'; x.fillText(c.de, W / 2, topo + fs + linhas.length * lh + 60);
  x.fillStyle = "rgba(226,190,116,.9)"; x.font = 'italic 400 54px "Fraunces", Georgia, serif'; x.fillText("Lumen Católico", W / 2, H - 150);
  x.fillStyle = "rgba(241,236,226,.55)"; x.font = '500 28px "Manrope", sans-serif'; x.fillText("Terço, santo e oração do dia", W / 2, H - 100);
  return cv;
}

export async function compartilhar(c: Cartao): Promise<void> {
  openSheet(html`<h2>Compartilhar</h2><p class="sub">Imagem pronta para Stories e status do WhatsApp.</p><div class="shot"><div class="skel"></div></div>
    <button class="primary" id="shShare">Enviar imagem</button><button class="ghost" id="shCopy">Copiar só o texto</button>`, "Compartilhar");
  const cv = await desenhar(c), url = cv.toDataURL("image/png"), shot = qMaybe(byId("sheet"), ".shot");
  if (shot) setHTML(shot, html`<img alt="Imagem para compartilhar" src="${url}">`);
  byId("shShare").onclick = async () => {
    try { const blob = await new Promise<Blob | null>(r => cv.toBlob(r)); if (!blob) throw 0; const f = new File([blob], "lumen-catolico.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); return; } throw 0; }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; toast("Pressione a imagem para salvar e enviar"); }
  };
  byId("shCopy").onclick = () => { const t = `${c.titulo ? c.titulo + "\n" : ""}${c.texto}\n— ${c.de}`;
    try { navigator.clipboard.writeText(t).then(() => toast("Texto copiado"), () => toast("Não deu para copiar")); } catch { toast("Não deu para copiar"); } };
}
