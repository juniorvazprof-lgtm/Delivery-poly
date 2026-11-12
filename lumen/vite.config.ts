import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Produção (npm run build): arquivos separados, com o Púlpito e o compartilhar baixados sob demanda,
// e um service worker que guarda tudo para funcionar sem internet.
// Prévia (npm run build:preview): um único HTML com tudo embutido, para o visualizador do Claude.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "preview" ? [viteSingleFile()] : [],
  build: {
    target: "es2020",
    outDir: mode === "preview" ? "dist-single" : "dist",
    assetsInlineLimit: mode === "preview" ? 100000000 : 4096,
    modulePreload: { polyfill: false },
  },
}));
