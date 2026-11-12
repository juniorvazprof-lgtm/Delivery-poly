/* Compartilhar como imagem */
import type { Verse } from "../../types";
import { SHARE_FOOTER } from "../../config/features";
import { html, setHTML } from "../../utils/html";
import { byId, qMaybe } from "../../utils/dom";
import { copy, toast } from "../../ui/effects";
import { openSheet, sheet } from "../../ui/sheet";

export function rgba(h:string,a:number){const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}
/** Quebra o texto em linhas que cabem na largura. */
export function wrap(ctx:CanvasRenderingContext2D,text:string,max:number):string[]{const out:string[]=[];let line="";for(const w of text.split(" ")){const t=line?line+" "+w:w;if(ctx.measureText(t).width>max&&line){out.push(line);line=w}else line=t}out.push(line);return out}
/** Desenha a imagem 1080×1920 do versículo para Stories e status. */
/**
 * Marca d'água e aviso no rodapé da imagem: a palavra "lumen" bem grande e quase transparente ao fundo,
 * e embaixo a marca, o aviso de lançamento e, se houver, o endereço do site.
 */
export function drawFooter(x:CanvasRenderingContext2D,W:number,H:number){
  x.save();
  x.textAlign="center";
  x.fillStyle="rgba(226,190,116,.05)";x.font='italic 400 300px "Fraunces", Georgia, serif';x.fillText("lumen",W/2,H-330);
  x.fillStyle="rgba(226,190,116,.5)";x.fillRect(W/2-30,H-262,60,2);
  x.fillStyle="rgba(226,190,116,.95)";x.font='italic 400 58px "Fraunces", Georgia, serif';x.fillText("lumen",W/2,H-188);
  x.fillStyle="rgba(241,236,226,.72)";x.font='600 30px "Manrope", sans-serif';x.letterSpacing="1px";x.fillText(SHARE_FOOTER.tagline,W/2,H-134);
  if(SHARE_FOOTER.site){x.fillStyle="rgba(241,236,226,.45)";x.font='500 26px "Manrope", sans-serif';x.fillText(SHARE_FOOTER.site,W/2,H-92)}
  x.restore();
}
export async function renderShot(v:Verse):Promise<HTMLCanvasElement>{
  try{await Promise.all([document.fonts.load('400 80px "Fraunces"'),document.fonts.load('italic 400 44px "Fraunces"'),document.fonts.load('600 36px "Manrope"')])}catch{}
  const W=1080,H=1920,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");if(!x)return cv;
  x.fillStyle="#0E0D14";x.fillRect(0,0,W,H);
  ([[180,420,v.h[0],.6],[920,1560,v.h[1],.5]] as [number,number,string,number][]).forEach(([cx,cy,c,a])=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,1050);g.addColorStop(0,rgba(c,a));g.addColorStop(1,rgba(c,0));x.fillStyle=g;x.fillRect(0,0,W,H)});
  const len=v.x.length,fs=len<60?104:len<110?86:70,L=120,M=W-2*L;
  x.font=`400 ${fs}px "Fraunces", Georgia, serif`;const lines=wrap(x,"“"+v.x+"”",M),lh=fs*1.3;
  const top=H/2-(lines.length*lh)/2;
  x.fillStyle="#E2BE74";x.font='700 30px "Manrope", sans-serif';x.letterSpacing="8px";x.fillText(v.t[0].toUpperCase(),L,top-70);x.letterSpacing="0px";
  x.fillRect(L,top-120,44,3);
  x.fillStyle="#F1ECE2";x.font=`400 ${fs}px "Fraunces", Georgia, serif`;lines.forEach((l,i)=>x.fillText(l,L,top+i*lh+fs));
  x.fillStyle="rgba(241,236,226,.72)";x.font='600 40px "Manrope", sans-serif';x.fillText(v.r,L,top+lines.length*lh+fs*.4+70);
  drawFooter(x,W,H);
  return cv;
}
export async function openShare(v:Verse){
  openSheet(html`<h2>Compartilhar</h2><p class="sub">Imagem pronta para Stories e status do WhatsApp.</p><div class="shot"><div class="skel" data-style="width:60%;height:46vh;border-radius:18px;margin:0"></div></div>
   <div class="row"><button class="primary" id="shShare">Compartilhar</button><button class="sec" id="shSave">Salvar imagem</button></div>
   <button class="ghost" id="shCopy">Copiar só o texto</button>`,"Compartilhar versículo");
  const cv=await renderShot(v),url=cv.toDataURL("image/png");
  const shot=qMaybe(sheet, ".shot");if(!shot)return;setHTML(shot, html`<img alt="Imagem do versículo ${v.r}" src="${url}">`);
  const file=()=>new Promise<File>((r,j)=>cv.toBlob(b=>b?r(new File([b],"versiculo.png",{type:"image/png"})):j(new Error("imagem vazia"))));
  byId("shShare").onclick=async()=>{try{const f=await file();
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:`${v.r} · lumen`});return}throw 0}
    catch(e){if(e instanceof DOMException&&e.name==="AbortError")return;toast("Pressione a imagem para salvar e enviar")}};
  byId("shSave").onclick=()=>{try{const a=document.createElement("a");a.href=url;a.download="versiculo-"+v.r.replace(/\W+/g,"-")+".png";a.click()}catch{}
    toast("Se não baixar, pressione a imagem e escolha Salvar")};
  byId("shCopy").onclick=()=>copy(v);
}
