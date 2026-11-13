// Adiciona a política de segurança de conteúdo (CSP) ao dist/index.html do build de produção.
// Só o script embutido pelo build (identificado pelo hash SHA-256) pode rodar; nada de eval,
// scripts de terceiros, plugins ou formulários enviando dados para fora.
import fs from "node:fs";
import crypto from "node:crypto";

const file = "dist/index.html";
let html = fs.readFileSync(file, "utf8");
const hashes = [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)]
  .filter(m => !/\bsrc=/.test(m[1]))
  .map(m => `'sha256-${crypto.createHash("sha256").update(m[2], "utf8").digest("base64")}'`);
// Scripts em arquivo (assets/*.js) são permitidos por 'self'; scripts embutidos, só pelo hash.
const sha = t => `'sha256-${crypto.createHash("sha256").update(t, "utf8").digest("base64")}'`;
// Estilos: só o CSS embutido pelo build (por hash). O atributo style não é permitido;
// estilos dinâmicos são aplicados por código (CSSOM), o que a CSP permite.
const styleHashes = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => sha(m[1]));
if (/\sstyle="/.test(html.replace(/<script\b[\s\S]*?<\/script>/g, ""))) throw new Error("index.html tem atributo style, que a CSP bloqueia");
if (!/<script\b[^>]*\bsrc=/.test(html) && !hashes.length) throw new Error("nenhum script encontrado no build");

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")}`,
  `style-src 'self' ${styleHashes.join(" ")} https://fonts.googleapis.com`,
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, "");
html = html.replace(/(<meta charset="utf-8">)/, `$1\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n<meta name="referrer" content="no-referrer">`);
fs.writeFileSync(file, html);
console.log(`CSP adicionada: scripts e estilos só do próprio app ('self'${hashes.length ? ` + ${hashes.length} hash(es)` : ""}), sem 'unsafe-inline'`);
