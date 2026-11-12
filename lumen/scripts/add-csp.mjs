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
if (!hashes.length) throw new Error("nenhum script embutido encontrado no build");

const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // estilos inline são usados para cores dinâmicas
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
console.log(`CSP adicionada (${hashes.length} script${hashes.length > 1 ? "s" : ""} permitido${hashes.length > 1 ? "s" : ""})`);
