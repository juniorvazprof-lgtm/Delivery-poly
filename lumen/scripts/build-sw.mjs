// Gera dist/sw.js a partir de sw/sw.js com a lista de arquivos do build e uma versão (hash do conteúdo).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DIST = "dist";
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = walk(DIST).map(p => path.relative(DIST, p).split(path.sep).join("/"));

// Guardados na instalação: o app em si. A Bíblia (4 MB) fica de fora e é guardada sob demanda.
const precache = files.filter(f => !f.startsWith("biblia/blivre/") && f !== "sw.js" && !f.endsWith(".map"));
precache.unshift("./");

const hash = crypto.createHash("sha256");
for (const f of precache.filter(f => f !== "./")) hash.update(f).update(fs.readFileSync(path.join(DIST, f)));
const version = hash.digest("hex").slice(0, 10);

const tpl = fs.readFileSync("sw/sw.js", "utf8");
fs.writeFileSync(path.join(DIST, "sw.js"), tpl.replace(`"__VERSION__"`, JSON.stringify(version)).replace("= __PRECACHE__;", `= ${JSON.stringify(precache, null, 1)};`));
console.log(`service worker: versão ${version}, ${precache.length} arquivos guardados na instalação`);
