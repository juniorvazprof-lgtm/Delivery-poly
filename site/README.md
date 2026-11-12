# Página de apresentação do Lumen

Página estática (HTML e CSS, sem build) publicada pelo GitHub Pages junto com o app.

| Endereço | Conteúdo |
|---|---|
| `/` | Página de apresentação (`index.html`) |
| `/privacidade.html` | Política de privacidade (exigida pela Play Store) |
| `/app/` | O app Lumen, gerado a partir de `../lumen` |

## Publicar
1. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Envie as mudanças para o branch `main`. O fluxo `.github/workflows/pages.yml` confere os tipos do app, roda o `npm audit`, gera o build e publica tudo.
3. Também dá para publicar manualmente pela aba **Actions → Publicar página e app → Run workflow**.

## Atualizar as capturas de tela
```bash
cd lumen && npm run build && cd ../site && node tools/screenshots.cjs
```

## Antes de divulgar
- Preencha o e-mail de contato em `privacidade.html`.
- Quando tiver o endereço definitivo, coloque-o em `lumen/src/config/features.ts` (`SHARE_FOOTER.site`) para aparecer nas imagens compartilhadas.
