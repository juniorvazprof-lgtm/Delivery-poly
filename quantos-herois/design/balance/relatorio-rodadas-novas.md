## Balance Check: Combate — Quantos Heróis? (etapa 1, revisão 2)

### Data Sources Analyzed
- `data/herois.js`, `data/viloes.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/rodadas.js`
- Metas: `design/gdd/quantos-herois.md`. Simulações: `core/combate.js`, 12 sementes por formação, ideal = menor time com ≥90% de vitórias. Com Chama Concentrada, cada formação usa a melhor posição da chave.

### Health Summary: CONCERNS

### Tabela de unidades
| Unidade | Vida | Dano | Intervalo (s) | Alcance | Movimento | Custo / ouro | Especial |
|---|--:|--:|--:|--:|--:|--:|---|
| Guerreiro | 120 | 16 | 0.9 | 5 | 14 | 20 |  |
| Guardião | 365 | 6 | 1.2 | 5 | 11 | 35 | armadura 30% |
| Piromante | 65 | 25 | 1.8 | 40 | 10 | 30 |  |
| Arqueiro | 70 | 9 | 1 | 34 | 12 | 25 |  |
| Clérigo | 80 | 3 | 1.5 | 22 | 10 | 35 |  |
| Goblin | 22 | 7 | 0.8 | 4.5 | 20 | 2 |  |
| Slime | 125 | 12 | 1.4 | 5 | 8 | 6 | divide em 2, respinga até 4 |
| Slime médio | 45 | 7 | 1.2 | 4.5 | 10 | 2 | divide em 2, respinga até 3 |
| Slime pequeno | 30 | 4 | 1 | 4 | 12 | 1 |  |
| Rei Slime | 1400 | 58 | 1.6 | 7 | 6 | 40 | divide em 3, invoca 7 goblin a cada 8 s |
| Goblin Arqueiro | 30 | 6 | 1 | 30 | 16 | 3 |  |
| Ogro | 260 | 22 | 1.6 | 6 | 7 | 12 |  |
| Morcego | 30 | 4 | 0.5 | 4 | 26 | 1 |  |
| Xamã Goblin | 40 | 3 | 1.5 | 26 | 10 | 5 |  |

### DPS e tempo até matar (teórico, um alvo)
| Herói | DPS | Goblin | Slime | Slime médio | Slime pequeno | Rei Slime | Goblin Arqueiro | Ogro | Morcego | Xamã Goblin |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Guerreiro | 20,7 | 1,1 s | 6 s | 2,2 s | 1,4 s | 67,5 s | 1,4 s | 12,5 s | 1,4 s | 1,9 s |
| Guardião | 5 | 4,4 s | 25 s | 9 s | 6 s | 280 s | 6 s | 52 s | 6 s | 8 s |
| Piromante | 13,9 | 1,6 s | 9 s | 3,2 s | 2,2 s | 100,8 s | 2,2 s | 18,7 s | 2,2 s | 2,9 s |
| Arqueiro | 9 | 2,4 s | 13,9 s | 5 s | 3,3 s | 155,6 s | 3,3 s | 28,9 s | 3,3 s | 4,4 s |
| Clérigo | 2 | 11 s | 62,5 s | 22,5 s | 15 s | 700 s | 15 s | 130 s | 15 s | 20 s |

### Metas do GDD x resultado
| Métrica | Meta | Resultado | OK? |
|---|---|---|:-:|
| Golpes do Guerreiro para matar 1 goblin (pior caso −10%) | 2 | 2 | ✅ |
| Bolas de fogo para matar 1 goblin (pior caso −10%) | 1 | 1 | ✅ |
| Guerreiro sozinho mata o Slime grande (só o 1º corpo) | 6–10 s | 9,7 s | ✅ |
| Goblins atingidos por bola de fogo (3 Piromantes x 14 goblins) | ≥ 1,5 | 1,7 | ✅ |
| Guardião sozinho resiste a 6 goblins | ≥ 15 s | 15,7 s | ✅ |
| Piromante sozinho contra 6 goblins | vence | 100% | ✅ |
| Duração das rodadas só de goblins R3–R10 (formação ideal) | 8–45 s | ∞–-∞ s | ✅ |
| Duração das demais rodadas R3–R10 | 12–45 s | 8,3–34 s | ❌ |
| Ideal R1 → R10, sem degraus maiores que +3 | ~2 → 9–12 | 1 → 2 → 3 → 3 → 4 → 5 → 6 → 6 → 6 → 10 | ❌ |
| Só Piromantes piores que só Guerreiros contra slimes | sim | sim | ✅ |
| Só Piromantes melhores que só Guerreiros contra goblins | sim | sim | ✅ |
| R6: Piromantes necessários (só Piromantes) ≤ 2× o ideal | ≤ 2× | 8 / 5 = 1,6× | ✅ |
| Piromante na formação ideal de alguma rodada R7–R10 | sim | R7, R8, R9, R10 | ✅ |
| Nenhuma classe sozinha é ideal em todas as rodadas | nenhuma | nenhuma | ✅ |
| Chama Concentrada (chave) reduz Piromantes necessários contra slimes | reduz |  | ✅ |
| Cada relíquia rara reduz o ideal em ≥ 1 em alguma rodada | todas | todas | ✅ |
| Jogador 2★ repõe heróis até a R10 sem ouro negativo | sim | sim | ✅ |

### Número ideal por rodada
| Rodada | Inimigos | Ideal | Melhor formação | Vitórias | Duração | Só Guerreiros | Só Piromantes |
|---|---|--:|---|--:|--:|--:|--:|
| R1 Patrulha goblin | 6 Goblin | **1** | 1 Piromante | 100% | 6,9 s | 2 | 1 |
| R2 Gosma e flechas | 1 Slime + 3 Goblin Arqueiro | **2** | 1 Guerreiro + 1 Guardião | 92% | 27,8 s | 3 | 3 |
| R3 Bando misto | 10 Goblin + 4 Morcego | **3** | 1 Guerreiro + 2 Piromante | 100% | 8,3 s | 4 | 3 |
| R4 Pântano vigiado | 2 Slime + 4 Goblin Arqueiro + 1 Xamã Goblin | **3** | 1 Guardião + 2 Piromante | 92% | 19,5 s | 5 | 5 |
| R5 Horda e ogro | 14 Goblin + 1 Ogro | **4** | 2 Guerreiro + 1 Piromante + 1 Clérigo | 100% | 14 s | 4 | 5 |
| R6 Poça e xamãs | 3 Slime + 2 Xamã Goblin + 6 Morcego | **5** | 3 Guerreiro + 1 Guardião + 1 Clérigo | 100% | 29 s | 5 | 8 |
| R7 Emboscada aérea | 12 Morcego + 6 Goblin Arqueiro + 2 Ogro | **6** | 1 Guardião + 2 Piromante + 1 Arqueiro + 2 Clérigo | 100% | 18,9 s | 9 | 8 |
| R8 Exército misto | 20 Goblin + 2 Ogro + 2 Xamã Goblin | **6** | 2 Guerreiro + 2 Guardião + 2 Piromante | 100% | 17,2 s | 9 | 8 |
| R9 Mistura nojenta | 4 Slime + 10 Goblin Arqueiro + 2 Ogro + 1 Xamã Goblin | **6** | 1 Guardião + 5 Piromante | 100% | 18,9 s | 14 | 11 |
| R10 O Rei Slime | 1 Rei Slime + 6 Goblin Arqueiro + 1 Ogro + 1 Xamã Goblin + 6 Goblin | **10** | 3 Guerreiro + 3 Guardião + 3 Piromante + 1 Arqueiro | 100% | 34 s | 14 | 16 |

### Atalho perigoso: ideal medido x estimativa antiga (ideal × 1.4)
| Rodada | Inimigos | Ideal medido | Estimativa antiga | Melhor formação |
|---|---|--:|--:|---|
| R1 | 9 Goblin | **2** | 2 | 1 Guerreiro + 1 Piromante |
| R2 | 2 Slime + 5 Goblin Arqueiro | **3** | 3 | 1 Guardião + 2 Piromante |
| R3 | 15 Goblin + 6 Morcego | **4** | 5 | 2 Guerreiro + 2 Piromante |
| R4 | 3 Slime + 6 Goblin Arqueiro + 2 Xamã Goblin | **5** | 5 | 2 Guardião + 3 Piromante |
| R5 | 21 Goblin + 2 Ogro | **5** | 6 | 1 Guardião + 2 Piromante + 2 Clérigo |
| R6 | 5 Slime + 3 Xamã Goblin + 9 Morcego | **7** | 7 | 4 Guerreiro + 2 Guardião + 1 Clérigo |
| R7 | 18 Morcego + 9 Goblin Arqueiro + 3 Ogro | **8** | 9 | 2 Guardião + 4 Piromante + 1 Arqueiro + 1 Clérigo |
| R8 | 30 Goblin + 3 Ogro + 3 Xamã Goblin | **8** | 9 | 1 Guerreiro + 2 Guardião + 4 Piromante + 1 Arqueiro |
| R9 | 6 Slime + 15 Goblin Arqueiro + 3 Ogro + 2 Xamã Goblin | **10** | 9 | 2 Guardião + 7 Piromante + 1 Arqueiro |

### Relíquias: número ideal com cada relíquia (sem relíquia na primeira linha; em negrito onde reduz)
| Relíquia | Raridade | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | Maior redução |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| (sem relíquia) | — | 1 | 2 | 3 | 3 | 4 | 5 | 6 | 6 | 6 | 10 | — |

### Guardião: ideal com e sem a armadura de 30%
| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Com armadura | 1 | 2 | 3 | 3 | 4 | 5 | 6 | 6 | 6 | 10 |
| Sem armadura | 1 | 2 | 3 | 3 | 4 | 5 | 6 | 6 | 6 | 10 |
| Guardiões na formação (com) | 0 | 1 | 0 | 1 | 0 | 1 | 1 | 2 | 1 | 3 |
| Guardiões na formação (sem) | 0 | 1 | 0 | 1 | 0 | 1 | 1 | 2 | 1 | 3 |

Com armadura, o Guardião aparece em 7 de 10 formações ideais e é 22% dos heróis enviados.

### Degenerate Strategies Found
- Nenhuma classe sozinha iguala a melhor mistura em todas as rodadas.

_Gerado em 1068 s._
