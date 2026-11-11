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
Edite `versiculos.js` (`t` tema, `x` texto, `r` referência).
Texto baseado na tradução de Almeida em domínio público. Versões como NVI/ARA são protegidas por direitos autorais — use-as só com licença.
