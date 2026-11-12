> **O código do app agora fica em [`../lumen`](../lumen)**, organizado em módulos (Vite + TypeScript). Esta pasta guarda o protótipo original (`prototipo.html`), a primeira versão simples e os dados da Bíblia, só como referência.

# Versículo Scroll 📖

App web estilo "feed vertical" (como TikTok/Reels) para o público brasileiro — mas em vez de vídeos, você desliza **versículos da Bíblia**.

## Recursos
- Feed infinito em tela cheia com *snap* vertical e fundos em degradê
- ♡ ou **toque duplo** para salvar em **Favoritos** (salvo no aparelho)
- Compartilhar (WhatsApp, Instagram etc. via menu nativo) e copiar
- Instalável como app (PWA manifest), sem dependências nem build

## Rodar
```
cd versiculo-scroll && python3 -m http.server 8000
```
Abra http://localhost:8000 no celular ou navegador.

## Adicionar versículos
Os versículos vêm da Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, 2018, licença CC BY 4.0 Brasil. Veja `dados/CATALOGO.md` para a fonte, a licença e as correções feitas. Versões como NVI e ARA têm direitos autorais e só podem ser usadas com licença.
