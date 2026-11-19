## Balance Check: Economia da run — Quantos Heróis? (simulação de runs)

### Data Sources Analyzed
- `data/rodadas.js` (ECONOMIA), `data/herois.js`, `data/reliquias.js`, `data/consumiveis.js`, `data/ideais.json`
- Simulador de runs: `tools/runs.mjs` (escrito pelo DeepSeek, revisado e corrigido), varredura: `tools/varredura.py`
- 120 runs por robô e por configuração; batalhas com o motor real `core/combate.js`

### Regras simuladas
- 10 rodadas, 3 vidas (perder custa 1 vida e repete a rodada), heróis mortos desmaiam por 2 rodadas.
- Loja entre rodadas: recrutar (preço sobe com a inflação por classe), 3 relíquias sorteadas, consumíveis.
- Estrelas: 3★ se enviou até o ideal, 2★ até 150%, 1★ só vencer.

### Robôs
| Robô | Estratégia |
|---|---|
| Cauteloso | manda 1,5× o ideal, compra heróis, tônico e bandagem |
| Esperto | manda o ideal + 1, compra heróis antes de relíquias, poção de reserva |
| Arriscado | manda exatamente o ideal (busca 3★) e investe em relíquias |
| Exagerado | manda 2× o ideal e só compra heróis |

### Health Summary: CRITICAL ISSUES (na economia atual)
Com a economia atual, mandar o dobro de heróis (Exagerado) completa 100% das runs e termina com tanto ouro quanto os robôs eficientes: **estratégia degenerada**. O dilema "quantos mandar" não existe no nível da run.

### Causa
1. O ouro dos abates (a maior parte da renda) é igual para quem manda 4 ou 12 heróis.
2. O prêmio por eficiência (estrelas) era pequeno.
3. Heróis recrutados não custam nada por batalha, e quem manda muito nunca perde nem repõe heróis.

### Varredura (120 runs por linha; % de runs completas e ouro total ganho)
| Configuração | Cauteloso | Esperto | Arriscado | Exagerado |
|---|---|---|---|---|
| Atual: abate ×1, bônus 10+4r, estrelas 1/1,3/1,7, infl 10% | 100% · 987 | 82% · 1169 | 57% · 1078 | **100% · 955** |
| Abate ×0,5, bônus 6+2r, infl 20% | 98% · 541 | 94% · 524 | 62% · 513 | **99% · 562** |
| + soldo 2/herói por batalha (robôs sem reserva) | 3% | 18% | 22% | 0% |
| Soldo 2 com reserva, abate ×0,7, bônus 8+3r, estrelas 0,8/1,3/2 | 98% · 761 | 72% · 717 | 34% · 680 | **98% · 771** |
| idem + inflação 50% | 80% | 68% | 25% | 72% |
| **Q: abate ×0,2, bônus 16+6r, estrelas 0,4/1,2/3,0, soldo 2, infl 25%** | **82% · 687** | **58% · 640** | **31% · 937** | **51% · 455** |
| Q + soldo 3, infl 30% | 28% | 29% | 27% | 34% |
| Abate 0, bônus 20+7r, estrelas 0,3/1,2/3, soldo 3, infl 30% | 59% | 38% | 27% | 30% |

### Leitura da configuração Q (a melhor encontrada)
- Exagerado cai para 51% de runs completas e é o mais pobre (455 de ouro na run): mandar todo mundo deixa de ser a resposta.
- Arriscado (só 3★) é o mais rico (937) e o que mais compra relíquias (5,7), mas completa só 31%: alto risco, alta recompensa.
- Cauteloso é o mais seguro (82%) com renda média.
- Esperto (ideal + 1) completa menos que o Cauteloso (58%): perde nas rodadas de slime (R4, R6) quando manda pouco. O robô adapta mal depois de perder; um jogador humano tende a ir melhor.

### Recommendations
| Prioridade | Problema | Sugestão | Impacto |
|---|---|---|---|
| 1 | Mandar o dobro é sempre seguro e não custa nada | Adotar **soldo** (2 de ouro por herói enviado, pago antes da luta) | Torna "quantos mandar" uma decisão econômica também |
| 1 | Renda igual para todos | Ouro dos abates baixo (×0,2) e **pote da rodada** grande multiplicado pelas estrelas (0,4 / 1,2 / 3,0) | Premia eficiência de verdade |
| 2 | Moedas por monstro ficam quase zero com abate ×0,2 | Visual: cada monstro morto solta moedas que **enchem o pote da rodada**; no fim, o pote é multiplicado pelas estrelas com animação | Mantém o "ouro saltando" sem quebrar o balanceamento |
| 2 | Relíquias não salvam runs | Rever: hoje elas aumentam sobreviventes mas raramente evitam derrotas | Comprar relíquia deve valer mais que comprar herói em algum momento |
| 3 | Métrica "rodada do aperto" sai vazia | Corrigir a agregação em `tools/runs.mjs` | Diagnóstico |

### Values That Need Attention
- `ECONOMIA.multAbate` 1,0 → 0,2; `bonusVitoria` 10+4r → 16+6r; `multEstrelas` 1/1,3/1,7 → 0,4/1,2/3,0; `inflacao` 0,10 → 0,25; novo `soldo` = 2.
- Nada foi aplicado ainda em `data/rodadas.js`: aguarda decisão.
