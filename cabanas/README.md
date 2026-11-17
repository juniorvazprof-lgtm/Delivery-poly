# Cabanas na Floresta (protótipo)

Um mercenário do pós-apocalipse aceita contratos para limpar áreas infestadas, cumpre o objetivo,
sobrevive até a extração e recebe em satoshis. Visual HD-2D: cena 3D (Three.js r160) em baixa
resolução, paleta de 26 cores, contorno seletivo e dithering Bayer.

## Etapa 1 (esta versão)
- Contrato de limpeza "Acampamento Pinheiro": abater 25 zumbis e extrair (4.200 sats).
- Zumbis surgem em grupos longe do jogador; tiros fazem barulho e atraem quem está perto;
  lanterna ligada deixa você visível de mais longe.
- Espingarda com pente de 6, recarga e munição limitada; caixas de suprimento na porta das cabanas;
  zumbis soltam moedas, cartuchos e, às vezes, carteiras frias.
- Extração: um sinalizador acende longe; segure o ponto por 25 s enquanto a horda vem em ondas.
- Pagamento em sats (₿ e sats) só se extrair; morrer perde o saque da missão. Carteira salva no aparelho.

## Rodar
Sirva a pasta por HTTP (módulos ES), por exemplo `npx serve cabanas`, e abra `index.html`.
- `?bot=1` joga sozinho; `?rapido=N` acelera a simulação.
- Teste de equilíbrio: `node cabanas/tests/bot.cjs [missões] [rapido]` (usa Playwright).

Os números de equilíbrio ficam em `js/config.js`. `cena-original.html` é a cena enviada, mantida como referência.
Three.js: licença MIT (`js/lib/THREE_LICENSE`).
