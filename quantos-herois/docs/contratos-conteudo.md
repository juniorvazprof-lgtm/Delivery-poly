# Contrato de conteúdo — passivas, melhorias do baú, evoluções e inimigos novos

## Vocabulário de modificadores de BATALHA (único aceito pelo motor)
`danoMult`, `pvMult`, `intervaloMult` (<1 = ataca mais rápido), `alcanceMult`, `areaMult` (raio da bola de fogo),
`queimaDps` + `queimaDur` (queimadura/veneno nos acertos), `curaMult`, `curaArea` (metros), `golpeFirmeRaio` (Golpe Firme em área),
`provocarDuracaoMais`, `provocarRaioMais`, `certeiroMenos` (Tiro Certeiro mais frequente), `regenPct` (fração da vida/s, time todo),
`auraReducao` + `auraRaio` (Guardião protege aliados próximos), `reviverUmaVez` (fração de vida; 1ª queda da batalha),
`danoPorAliadoMesmaClasse`, `reducaoDanoMais` (soma à armadura: 0.1 = 10% menos dano recebido).
Multiplicadores (`...Mult`) se multiplicam; números se somam.

## Alvo de um efeito de batalha
`alvo`: `'todas'` | id de classe (`'guerreiro'`, `'guardiao'`, `'piromante'`, `'arqueiro'`, `'clerigo'`) | família (`'Marcial'`, `'Arcano'`, `'Divino'`).
As classes evoluídas herdam a família e também recebem efeitos da classe de origem.

## Habilidades (heróis e monstros), por tipo
- `golpeFirme`: `{ aCada, mult, raioArea? }` — a cada N golpes, dano × mult; com raioArea acerta todos em volta do alvo
- `provocar`: `{ raio, duracao, recarga }` (só heróis)
- `bolaDeFogo`: `{ raio, tornado?: { dps, raio, duracao } }` — projétil em área; com tornado deixa um redemoinho de fogo no chão que causa dps a quem estiver dentro
- `tiroCerteiro`: `{ aCada, mult, perfura }` (requer `projetil: { velocidade, tipo:'flecha' }`)
- `curar`: `{ valor, alcance, recarga, siMesmo?: false }`
- Monstros com `projetil: { velocidade, tipo: 'flecha' | 'luz' }` atacam à distância.
- Monstros: `comportamento: 'flanqueia'` (prefere heróis frágeis), `divide: { em, qtd }`, `respingo: { em, max }`, `invoca: { tipo, qtd, intervalo, primeiro }`, `reducaoDano` (0..1), `ouro`.

## data/passivas.js — `export const PASSIVAS = { id: {...} }`
`{ nome, icone (1 emoji), desc, preco (80–220), efeito }` onde efeito é
- `{ tipo: 'batalha', alvo, mod: {...} }`, ou
- `{ tipo: 'run', chave, valor }` com chave ∈ `multPote` (multiplica o pote), `descontoRecrutar` (0..1), `soldoMenos` (moedas a menos por herói, mín. 0), `desmaioMenos` (rodadas), `curaBasePorRodada` (vida da base ao vencer), `juros` (fração do ouro guardado ganha ao fim de cada rodada, com teto de 15).
Passivas são permanentes na run, compradas uma vez cada, no acampamento; são mais caras que relíquias.

## data/melhorias.js — `export const MELHORIAS = { id: {...} }`
Opções do baú depois de cada vitória (escolhe 1 de 3). `{ nome, icone, desc, raridade: 'comum'|'rara'|'epica', peso (chance relativa), efeito }`:
- `{ tipo: 'batalha', alvo, mod }` (acumulam se escolhidas de novo)
- `{ tipo: 'ouro', valor }`, `{ tipo: 'heroi', classe, qtd }`, `{ tipo: 'consumivel', id, qtd }` (ids: pocaoRessurreicao, pergaminhoMeteoro, bandagem, tonicoCura), `{ tipo: 'curarBase', valor }`

## data/evolucoes.js — `export const EVOLUCOES = { classeOrigem: { para, preco, rodadaMin, desc } }`
e `export const HEROIS_EVOLUIDOS = { id: { ...mesmo formato de data/herois.js..., evolucaoDe: 'classeOrigem' } }`.
No acampamento, evoluir converte 1 herói da classe de origem na classe evoluída pagando `preco`.

## Monstros novos — `export const VILOES_NOVOS = { id: {...} }` (mesmo formato de data/viloes.js) e `export const RODADAS_NOVAS` (10 rodadas, `[tipo, qtd, { chegada:[min,max] }?]`, R10 com `reiSlime` + escolta).
