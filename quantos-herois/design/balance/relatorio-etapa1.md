## Balance Check: Combate — Quantos Heróis? (etapa 1, revisão 2)

### Data Sources Analyzed
- `data/herois.js`, `data/viloes.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/rodadas.js`
- Metas: `design/gdd/quantos-herois.md`. Simulações: `core/combate.js`, 24 sementes por formação, ideal = menor time com ≥90% de vitórias. Com Chama Concentrada, cada formação usa a melhor posição da chave.

### Health Summary: HEALTHY

### Tabela de unidades
| Unidade | Vida | Dano | Intervalo (s) | Alcance | Movimento | Custo / ouro | Especial |
|---|--:|--:|--:|--:|--:|--:|---|
| Guerreiro | 120 | 16 | 0.9 | 5 | 14 | 20 |  |
| Guardião | 365 | 6 | 1.2 | 5 | 11 | 35 | armadura 30% |
| Piromante | 65 | 25 | 1.8 | 40 | 10 | 30 |  |
| Goblin | 22 | 7 | 0.8 | 4.5 | 20 | 2 |  |
| Slime | 125 | 12 | 1.4 | 5 | 8 | 6 | divide em 2, respinga até 4 |
| Slime médio | 45 | 7 | 1.2 | 4.5 | 10 | 2 | divide em 2, respinga até 3 |
| Slime pequeno | 30 | 4 | 1 | 4 | 12 | 1 |  |
| Rei Slime | 1900 | 45 | 1.6 | 7 | 6 | 40 | divide em 3, invoca 6 goblin a cada 9 s |

### DPS e tempo até matar (teórico, um alvo)
| Herói | DPS | Goblin | Slime | Slime médio | Slime pequeno | Rei Slime |
|---|--:|--:|--:|--:|--:|--:|
| Guerreiro | 20,7 | 1,1 s | 6 s | 2,2 s | 1,4 s | 91,6 s |
| Guardião | 5 | 4,4 s | 25 s | 9 s | 6 s | 380 s |
| Piromante | 13,9 | 1,6 s | 9 s | 3,2 s | 2,2 s | 136,8 s |

### Metas do GDD x resultado
| Métrica | Meta | Resultado | OK? |
|---|---|---|:-:|
| Golpes do Guerreiro para matar 1 goblin (pior caso −10%) | 2 | 2 | ✅ |
| Bolas de fogo para matar 1 goblin (pior caso −10%) | 1 | 1 | ✅ |
| Guerreiro sozinho mata o Slime grande (só o 1º corpo) | 6–10 s | 9,6 s | ✅ |
| Goblins atingidos por bola de fogo (3 Piromantes x 14 goblins) | ≥ 1,5 | 1,6 | ✅ |
| Guardião sozinho resiste a 6 goblins | ≥ 15 s | 15,7 s | ✅ |
| Piromante sozinho contra 6 goblins | vence | 100% | ✅ |
| Duração das rodadas só de goblins R3–R10 (formação ideal) | 8–45 s | 8,1–13,4 s | ✅ |
| Duração das demais rodadas R3–R10 | 12–45 s | 18,7–37,9 s | ✅ |
| Ideal R1 → R10, sem degraus maiores que +3 | ~2 → 9–12 | 1 → 2 → 3 → 4 → 4 → 4 → 6 → 6 → 8 → 9 | ✅ |
| Só Piromantes piores que só Guerreiros contra slimes | sim | sim | ✅ |
| Só Piromantes melhores que só Guerreiros contra goblins | sim | sim | ✅ |
| R6: Piromantes necessários (só Piromantes) ≤ 2× o ideal | ≤ 2× | 7 / 4 = 1,8× | ✅ |
| Piromante na formação ideal de alguma rodada R7–R10 | sim | R8, R10 | ✅ |
| Nenhuma classe sozinha é ideal em todas as rodadas | nenhuma | nenhuma | ✅ |
| Chama Concentrada (chave) reduz Piromantes necessários contra slimes | reduz | R2: 3→2, R6: 7→6 | ✅ |
| Cada relíquia rara reduz o ideal em ≥ 1 em alguma rodada | todas | todas | ✅ |
| Jogador 2★ repõe heróis até a R10 sem ouro negativo | sim | sim | ✅ |

### Número ideal por rodada
| Rodada | Inimigos | Ideal | Melhor formação | Vitórias | Duração | Só Guerreiros | Só Piromantes |
|---|---|--:|---|--:|--:|--:|--:|
| R1 Patrulha goblin | 6 Goblin | **1** | 1 Piromante | 100% | 6,7 s | 2 | 1 |
| R2 Gosma no caminho | 1 Slime | **2** | 2 Guerreiro | 100% | 13 s | 2 | 3 |
| R3 Bando goblin | 14 Goblin | **3** | 2 Guerreiro + 1 Piromante | 100% | 8,1 s | 4 | 3 |
| R4 Pântano | 2 Slime + 6 Goblin | **4** | 3 Guerreiro + 1 Guardião | 100% | 18,7 s | 4 | 5 |
| R5 Horda goblin | 24 Goblin | **4** | 3 Guerreiro + 1 Piromante | 96% | 9,4 s | 6 | 5 |
| R6 Poça de slimes | 4 Slime | **4** | 2 Guerreiro + 2 Guardião | 100% | 36,2 s | 5 | 7 |
| R7 Emboscada | 18 Goblin + 2 Slime | **6** | 3 Guerreiro + 3 Guardião | 100% | 21,9 s | 7 | 7 |
| R8 Exército goblin | 36 Goblin | **6** | 3 Guerreiro + 2 Guardião + 1 Piromante | 100% | 13,4 s | 8 | 7 |
| R9 Mistura nojenta | 5 Slime + 16 Goblin | **8** | 3 Guerreiro + 5 Guardião | 100% | 34,2 s | 10 | 12 |
| R10 O Rei Slime | 1 Rei Slime + 18 Goblin | **9** | 6 Guerreiro + 2 Guardião + 1 Piromante | 100% | 37,9 s | 12 | 15 |

### Relíquias: número ideal com cada relíquia (sem relíquia na primeira linha; em negrito onde reduz)
| Relíquia | Raridade | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | Maior redução |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| (sem relíquia) | — | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | 8 | 9 | — |
| Espada Afiada | comum | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | 8 | 9 | 0 |
| Irmãos de Armas | comum | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | 8 | 9 | 0 |
| Golpe Giratório | rara | 1 | 2 | **2** | 4 | **3** | 4 | **5** | **4** | 8 | 9 | −2 |
| Escudo Reforçado | rara | 1 | 2 | 3 | **3** | 4 | 4 | 6 | 6 | 8 | 9 | −1 |
| Provocação Longa | rara | 1 | 2 | 3 | 4 | 4 | 4 | **5** | 6 | 8 | 9 | −1 |
| Muralha | rara | 1 | 2 | 3 | **3** | 4 | 4 | **5** | 6 | 8 | 9 | −1 |
| Brasa Viva | rara | 1 | 2 | 3 | 4 | 4 | 4 | **5** | 6 | 8 | 9 | −1 |
| Foco Arcano | comum | 1 | 2 | 3 | 4 | 4 | 4 | **5** | 6 | 8 | 9 | −1 |
| Chama Concentrada | rara | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | **7** | 9 | −1 |

### Guardião: ideal com e sem a armadura de 30%
| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Com armadura | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | 8 | 9 |
| Sem armadura | 1 | 2 | 3 | 4 | 4 | 4 | 6 | 6 | 8 | 9 |
| Guardiões na formação (com) | 0 | 0 | 0 | 1 | 0 | 2 | 3 | 2 | 5 | 2 |
| Guardiões na formação (sem) | 0 | 0 | 0 | 1 | 0 | 1 | 2 | 0 | 4 | 2 |

Com armadura, o Guardião aparece em 6 de 10 formações ideais e é 32% dos heróis enviados.

### Degenerate Strategies Found
- Nenhuma classe sozinha iguala a melhor mistura em todas as rodadas.

_Gerado em 356 s._
