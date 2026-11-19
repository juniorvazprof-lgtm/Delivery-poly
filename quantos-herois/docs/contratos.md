# Contratos entre módulos — Quantos Heróis? (MVP horizontal)

Navegador, ES modules nativos, sem build e sem bibliotecas. Português do Brasil em textos e comentários. Tela SEMPRE deitada (paisagem).

## Dados (já existem, não reescrever)
- `data/herois.js`: `HEROIS = { guerreiro:{nome,familia,papel,pv,dano,intervalo,alcance,velocidade,raio,custo}, guardiao, piromante }`
- `data/viloes.js`: `VILOES = { goblin:{nome,pv,ouro,...}, slime, slimeMedio, slimePequeno, reiSlime }`
- `data/reliquias.js`: `RELIQUIAS = { id: { nome, classe, preco, raridade:'comum'|'rara', desc, chave?:true } }` (chave=true: Chama Concentrada, o jogador liga/desliga antes de cada batalha)
- `data/consumiveis.js`: `CONSUMIVEIS = { pocaoRessurreicao, pergaminhoMeteoro, bandagem, tonicoCura }` cada `{ nome, preco, desc }`
- `data/rodadas.js`: `RODADAS = [{ n, nome, inimigos:[[tipo,qtd,opc?]], chefe? }]` (10) e `ECONOMIA` (ver arquivo: ouroInicial, elencoInicial, vidaBase, danoBase{tipo:n}, danoBaseMinimo, multAbate, bonusVitoria(r), multEstrelas{1,2,3}, soldo, inflacao, rodadasDesmaio, limiteEstrelas{tres,duas}, perigosa{multInimigos,multPremio,multIdeal}, bau{rodadas:[3,6,9], chance3Estrelas}, reliquiaNaLoja)
- `data/ideais.json`: `{ "1": { n, comp } ... "10" }` — número ideal de heróis por rodada (opção segura). Carregar com `fetch('data/ideais.json')` no navegador.

## Motor de combate `core/combate.js` (já existe)
- `ARENA = { largura: 140, altura: 90 }` (metros; heróis nascem à esquerda x≈14–32, monstros à direita x≈104–134)
- `criarBatalha({ herois:{classe:n}, inimigos, reliquias:[ids], chaves:{chamaConcentrada:bool}, consumiveis:{}, semente }) → b`
- `passo(b, dt)`, `DT = 0.05`; `usarTonico(b)`, `usarMeteoro(b)` → bool (jogador aperta o botão; cada um só uma vez por batalha)
- `resumo(b) → { vitoria, fim, tempo, sobreviventes:{classe:n}, mortos:{classe:n}, restantes:[tipos de monstros vivos], porClasse:{ classe: { enviados, caidos, abates, dano, cura, danoRecebido } }, ouroAbates }`
- `b.unidades` [{ id, lado:'h'|'v', tipo, x, y, pv, pvMax, raio, morto, atraso, ... }], `b.eventos` (o visual consome e esvazia), `b.t`, `b.fim`.

## Lógica da run `core/run.js` (DeepSeek escreve)
Função pura de estado (sem DOM). Ver especificação no pedido.

## Visual `render/batalha.js` e `render/sprites.js` (já existem; o DeepSeek ajusta)
`criarVisual(canvas, b, { velocidade, aoFim(resumo), aoMoeda(valor), alvoMoeda() → {x,y} em px CSS relativos ao canvas }) → { iniciar, pausar, setVelocidade(0.5|1|2), destruir, contagem() → {herois, viloes}, forca() → {herois:0..1, viloes:0..1} }`

## Interface `index.html`, `ui/estilo.css`, `ui/app.js`, `ui/telas.js`, `ui/hud.js` (DeepSeek escreve)
