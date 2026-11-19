## Balance Check: Combate e economia — Quantos Heróis? (etapa 1)

### Data Sources Analyzed
- `data/herois.js`, `data/viloes.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/rodadas.js`
- Metas: `design/gdd/quantos-herois.md` (não há `design/registry/entities.yaml`)
- Simulações: motor `core/combate.js`, 24 sementes por formação, limiar do "ideal" = 90% de vitórias

### Tabela de unidades
| Unidade | Lado | Vida | Dano | Intervalo (s) | Alcance | Movimento | Custo / ouro |
|---|---|--:|--:|--:|--:|--:|--:|
| Guerreiro | herói | 120 | 16 | 0.9 | 5 | 14 | 20 |
| Guardião | herói | 365 | 6 | 1.2 | 5 | 11 | 35 |
| Piromante | herói | 65 | 25 | 1.8 | 40 | 10 | 30 |
| Goblin | vilão | 22 | 7 | 0.8 | 4.5 | 20 | 2 |
| Slime | vilão | 125 | 12 | 1.4 | 5 | 8 | 6 |
| Slime médio | vilão | 45 | 7 | 1.2 | 4.5 | 10 | 2 |
| Slime pequeno | vilão | 30 | 4 | 1 | 4 | 12 | 1 |
| Rei Slime | vilão | 2400 | 45 | 1.6 | 7 | 6 | 40 |

### DPS e tempo até matar (teórico, um alvo, sem deslocamento)
| Herói | DPS | TTK Goblin | TTK Slime | TTK Slime médio | TTK Slime pequeno | TTK Rei Slime |
|---|--:|--:|--:|--:|--:|--:|
| Guerreiro | 20,7 | 1,1 s | 6 s | 2,2 s | 1,4 s | 115,7 s |
| Guardião | 5 | 4,4 s | 25 s | 9 s | 6 s | 480 s |
| Piromante | 13,9 | 1,6 s | 9 s | 3,2 s | 2,2 s | 172,8 s |

TTK de um slime não inclui os filhotes: matar um Slime grande gera 2 médios e 4 pequenos (234 de vida a mais).
| Vilão | DPS contra um herói |
|---|--:|
| Goblin | 8,8 |
| Slime | 8,6 |
| Slime médio | 5,8 |
| Slime pequeno | 4 |
| Rei Slime | 28,1 |

### Health Summary: CONCERNS

### Metas do GDD x resultado
| Métrica | Meta | Resultado | OK? |
|---|---|---|:-:|
| Golpes do Guerreiro para matar 1 goblin (pior caso −10%) | 2 | 2 | ✅ |
| Bolas de fogo para matar 1 goblin (pior caso −10%) | 1 | 1 | ✅ |
| Guerreiro sozinho mata o Slime grande (só o 1º corpo) | 6–10 s | 9,6 s | ✅ |
| Goblins atingidos por bola de fogo (3 Piromantes x 14 goblins) — meta revisada | ≥ 1,5 | 1,7 | ✅ |
| Guardião sozinho resiste a 6 goblins | ≥ 15 s | 15,7 s | ✅ |
| Piromante sozinho contra 6 goblins | vence | 100% | ✅ |
| Duração das batalhas R3–R10 (formação ideal) — R1/R2 rápidas de propósito | 12–45 s | 6,9–44,9 s | ❌ |
| Ideal R1 → R10, sem degraus maiores que +3 | ~2 → 9–12 | 1 → 2 → 3 → 4 → 4 → 4 → 6 → 6 → 8 → 10 | ✅ |
| Piromantes puros piores que guerreiros puros contra slimes | sim | sim | ✅ |
| Piromantes puros melhores que guerreiros puros contra goblins | sim | sim | ✅ |
| Nenhuma classe sozinha é ideal em todas as rodadas | nenhuma | nenhuma | ✅ |
| Chama Concentrada reduz Piromantes necessários contra slimes | reduz | R2: 3→2, R6: 9→6 | ✅ |
| Jogador 2★ consegue repor heróis até a R10 sem ouro negativo | sim | sim | ✅ |

### Número ideal por rodada
| Rodada | Inimigos | Ideal | Melhor formação | Vitórias | Duração | Heróis vivos | Ideal só Guerreiros | Ideal só Piromantes |
|---|---|--:|---|--:|--:|--:|--:|--:|
| R1 Patrulha goblin | 6 Goblin | **1** | 1 Piromante | 100% | 6,8 s | 1 | 2 | 1 |
| R2 Gosma no caminho | 1 Slime | **2** | 2 Guerreiro | 100% | 13 s | 2 | 2 | 3 |
| R3 Bando goblin | 14 Goblin | **3** | 2 Guerreiro + 1 Piromante | 100% | 6,9 s | 2,9 | 4 | 3 |
| R4 Pântano | 2 Slime + 6 Goblin | **4** | 3 Guerreiro + 1 Guardião | 100% | 18,7 s | 3,8 | 4 | 7 |
| R5 Horda goblin | 24 Goblin | **4** | 2 Guerreiro + 1 Guardião + 1 Piromante | 100% | 9,3 s | 3,3 | 6 | 4 |
| R6 Poça de slimes | 4 Slime | **4** | 2 Guerreiro + 2 Guardião | 100% | 36,2 s | 3,8 | 5 | 9 |
| R7 Emboscada | 18 Goblin + 2 Slime | **6** | 3 Guerreiro + 3 Guardião | 100% | 21,9 s | 5,5 | 7 | 8 |
| R8 Exército goblin | 36 Goblin | **6** | 3 Guerreiro + 2 Guardião + 1 Piromante | 96% | 10,8 s | 4,9 | 10 | 7 |
| R9 Mistura nojenta | 5 Slime + 16 Goblin | **8** | 3 Guerreiro + 5 Guardião | 100% | 34,2 s | 6,8 | 10 | 13 |
| R10 O Rei Slime | 1 Rei Slime + 30 Goblin | **10** | 6 Guerreiro + 4 Guardião | 100% | 44,9 s | 7,3 | 12 | Infinity |

"Ideal" = menor número total de heróis em que alguma combinação vence ≥90% das sementes. "Só X" = o mesmo cálculo usando apenas uma classe (∞ = não vence até 16).

### Estrelas por rodada (regra: 3★ ≤ ideal, 2★ ≤ 150% do ideal, 1★ só vencer)
| Rodada | 3★ com até | 2★ com até |
|---|--:|--:|
| R1 | 1 | 1 |
| R2 | 2 | 3 |
| R3 | 3 | 4 |
| R4 | 4 | 6 |
| R5 | 4 | 6 |
| R6 | 4 | 6 |
| R7 | 6 | 9 |
| R8 | 6 | 9 |
| R9 | 8 | 12 |
| R10 | 10 | 15 |

### Relíquias: efeito na formação ideal (taxa de vitória · heróis vivos)
| Relíquia | R3 | R5 | R8 | R10 |
|---|---|---|---|---|
| (sem relíquia) | 100% · 2,9 | 100% · 3,3 | 96% · 4,9 | 100% · 7,3 |
| Espada Afiada | 100% · 2,9 | 100% · 3,3 | 100% · 4,9 | 100% · 8 |
| Irmãos de Armas | 100% · 2,9 | 100% · 3,3 | 100% · 5 | 100% · 8 |
| Golpe Giratório | 100% · 3 | 100% · 3,7 | 100% · 5,6 | 42% · 5,1 |
| Escudo Reforçado | 100% · 2,9 | 100% · 3,3 | 96% · 4,9 | 100% · 8 |
| Provocação Longa | 100% · 2,9 | 100% · 3,3 | 96% · 4,9 | 100% · 7,8 |
| Muralha | 100% · 2,9 | 100% · 3,3 | 96% · 5 | 100% · 8 |
| Brasa Viva | 100% · 2,9 | 100% · 3,3 | 96% · 4,9 | 100% · 7,3 |
| Foco Arcano | 100% · 2,9 | 100% · 3,5 | 88% · 5,1 | 100% · 7,3 |
| Chama Concentrada | 4% · 1 | 0% · 0 | 0% · 0 | 100% · 7,3 |

### Economia (projeção de um jogador de referência)
**3 estrelas (manda o ideal)**

| Rodada | Mandou | Gastou recrutando | Ganhou | Ouro no fim | Elenco total | Desmaiados |
|---|--:|--:|--:|--:|--:|--:|
| R1 | 1 | 0 | 53 | 113 | 5 | 0 |
| R2 | 2 | 0 | 63 | 176 | 5 | 0 |
| R3 | 3 | 0 | 73 | 249 | 5 | 0 |
| R4 | 4 | 0 | 83 | 332 | 5 | 0 |
| R5 | 4 | 0 | 94 | 426 | 5 | 1 |
| R6 | 4 | 35 | 104 | 495 | 6 | 1 |
| R7 | 6 | 35 | 114 | 574 | 7 | 0 |
| R8 | 6 | 0 | 124 | 698 | 7 | 1 |
| R9 | 8 | 70 | 134 | 762 | 9 | 1 |
| R10 | 10 | 60 | 145 | 847 | 12 | 2 |

**2 estrelas (manda 150% do ideal)**

| Rodada | Mandou | Gastou recrutando | Ganhou | Ouro no fim | Elenco total | Desmaiados |
|---|--:|--:|--:|--:|--:|--:|
| R1 | 2 | 0 | 40 | 100 | 5 | 0 |
| R2 | 3 | 0 | 48 | 148 | 5 | 0 |
| R3 | 5 | 0 | 56 | 204 | 5 | 0 |
| R4 | 6 | 55 | 64 | 213 | 7 | 0 |
| R5 | 6 | 0 | 72 | 285 | 7 | 0 |
| R6 | 6 | 35 | 79 | 329 | 8 | 0 |
| R7 | 9 | 55 | 87 | 361 | 10 | 0 |
| R8 | 9 | 0 | 95 | 456 | 10 | 0 |
| R9 | 12 | 105 | 103 | 454 | 13 | 0 |
| R10 | 15 | 80 | 111 | 485 | 17 | 0 |

### Degenerate Strategies Found
- Nenhuma: nenhuma classe sozinha iguala a melhor mistura em todas as rodadas.

_Gerado em 137 s._
