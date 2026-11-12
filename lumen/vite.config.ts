import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Gera um único index.html com JS e CSS embutidos (bom para o Capacitor e para a prévia).
// A Bíblia fica em public/biblia e é carregada sob demanda, um livro por vez.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: { target: "es2020", assetsInlineLimit: 100000000 },
});
