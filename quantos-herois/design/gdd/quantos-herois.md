# Quantos Heróis? — Documento de design (metas de balanceamento)

**Pitch:** a cada rodada um grupo de monstros aparece; você decide quantos e quais heróis mandar e a batalha roda sozinha. Menos heróis = mais pontos e ouro.

## Loop
Desafio (mostra inimigos) → escolha (+/− por classe) → batalha automática → resultado (estrelas, ouro, sobreviventes) → loja.

## Contra-ataques pretendidos
| Herói | Bom contra | Ruim contra |
|---|---|---|
| Guerreiro | Slime (dano concentrado, Golpe Firme) | Hordas grandes de goblins |
| Guardião | — (protege: provoca e segura dano) | — (sozinho não mata nada) |
| Piromante | Goblins (área) | Slime (área espalha os filhotes) |

## Metas numéricas (alvos que o balance-check usa)
| Métrica | Alvo |
|---|---|
| Golpes do Guerreiro para matar 1 goblin | 2 |
| Bolas de fogo para matar 1 goblin | 1 |
| Tempo do Guerreiro sozinho para matar um Slime grande (sem filhotes) | 6–10 s |
| Goblins atingidos por bola de fogo numa horda (média) | ≥ 1,5 (revisado: goblins chegam espalhados) |
| Guardião: tempo sobrevivendo sozinho contra 6 goblins | ≥ 15 s |
| Piromante sozinho contra 6 goblins | vence |
| Piromantes puros contra slimes | pior que guerreiros puros (precisam de mais heróis ou perdem) |
| Duração das batalhas R3–R10 | 12–45 s (R1–R2 rápidas de propósito, vitórias cedo) |
| Número ideal por rodada (R1 → R10) | cresce de ~2 até ~9–12, sem degraus de mais de +3 entre rodadas |
| Nenhuma classe sozinha (só um tipo de herói) | deve ser ideal em todas as rodadas — senão é estratégia degenerada |
| Relíquia Chama Concentrada | deve reduzir o número ideal contra slimes para o Piromante |

## Economia (alvos)
| Item | Alvo |
|---|---|
| Ouro inicial | compra 1–2 heróis extras |
| Ouro por rodada com 3 estrelas | ~1 herói barato + sobra para relíquia a cada 2–3 rodadas |
| Jogador médio (2 estrelas) | consegue repor desmaiados e chegar à rodada 10 com elenco suficiente para o número ideal |
