# Cabanas na Floresta (protótipo)

Um mercenário do pós-apocalipse aceita contratos para limpar áreas infestadas, cumpre o objetivo,
sobrevive até a extração e recebe em satoshis. Visual HD-2D: cena 3D (Three.js r160) em baixa
resolução, paleta de 26 cores, contorno seletivo e dithering Bayer.

## Ajustes após o primeiro teste
- Zumbis cinza, 2× mais resistentes (espingarda: 2 tiros de perto; pistola: 3 a 4).
- Pose realista: espingarda no ombro com a mão de apoio na telha e lanterna sob o cano; pistola com as duas mãos.
- Troca de arma (botão ⇄ ou Q); cada arma tem pente e reserva próprios.
- A área começa com 26 zumbis vagando; só aparecem no cone da lanterna, muito perto, no clarão do tiro
  ou perto de uma janela acesa (no escuro, às vezes, só os olhos).
- Sons sintetizados (tiros, recarga, gemidos, passos da horda, sinal, helicóptero, ambiente noturno); botão 🔊 ou M.
- Contrato agora pede 35 abates (5.500 sats).

## Etapa 1
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
