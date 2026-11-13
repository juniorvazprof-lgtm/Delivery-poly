// Converte dist/index.html (build de arquivo único) na página usada pela prévia publicada no Claude.
// A prévia já fornece <html>, <head> e <body>; aqui ficam só o título, as fontes, o CSS, o corpo e o script.
import fs from "node:fs";

const html = fs.readFileSync("dist-single/index.html", "utf8");
const pick = re => [...html.matchAll(re)].map(m => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g)[0] ?? "<title>Lumen</title>";
const fonts = pick(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts\.[^>]+>/g);
const styles = pick(/<style[^>]*>[\s\S]*?<\/style>/g);
const scripts = pick(/<script type="module"[^>]*>[\s\S]*?<\/script>/g).map(s => s.replace(" crossorigin", ""));
const body = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>")).replace(/<script[\s\S]*?<\/script>/g, "").trim();
if (!styles.length || !scripts.length) throw new Error("build sem CSS ou JS embutido: rode `npm run build:preview`");

const page = [title, '<meta name="claude:viewport-fit-sides" content="cover">', ...fonts, ...styles, body, ...scripts].join("\n");
fs.mkdirSync("dist-preview", { recursive: true });
fs.writeFileSync("dist-preview/lumen.html", page);
console.log(`dist-preview/lumen.html (${(page.length / 1024).toFixed(0)} KB)`);
