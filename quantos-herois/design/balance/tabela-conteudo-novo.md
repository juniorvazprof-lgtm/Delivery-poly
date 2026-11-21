# Tabela de balanceamento do conteúdo novo (gerada pelo DeepSeek, revisada)


## Passivas (permanentes na run, compradas no acampamento)
| id | nome | tipo | efeito | preço | justificativa |
|---|---|---|---|---|---|
| pactoDoPote | Pacto do Pote | run | multPote 1.15 | 120 | +15% em toda a run rende ~150–300 ouro ao longo de 10 rodadas; preço médio-alto |
| contadorDeMoedas | Contador de Moedas | run | juros 0.08 (teto 15) | 100 | ~8% do ouro guardado por rodada; exige disciplina de poupar |
| recrutadorExperiente | Recrutador Experiente | run | descontoRecrutar 0.15 | 140 | 15% em ~15 heróis comprados ≈ 60–80 ouro; paga-se em 2–3 rodadas |
| folhaDePagamento | Folha de Pagamento | run | soldoMenos 1 | 90 | economiza ~1 ouro/herói/rodada; ~30–50 ouro por run |
| enfermariaDeCampanha | Enfermaria de Campanha | run | desmaioMenos 1 | 80 | heróis voltam 1 rodada antes; valoriza elencos largos |
| muralhaDaBase | Muralha da Base | run | curaBasePorRodada 4 | 110 | +4 vida de base por vitória; ~40 vida ao longo da run |
| treinoPesado | Treino Pesado | batalha | danoMult 1.12 todas | 160 | +12% de dano global é forte; preço alto |
| armaduraDePlacas | Armadura de Placas | batalha | reducaoDanoMais 0.08 todas | 150 | +8% de redução global soma com armaduras existentes |
| cadenciaDeBatalha | Cadência de Batalha | batalha | intervaloMult 0.92 todas | 180 | +8% de velocidade de ataque global; multiplicativo e forte |
| bencaoDuradoura | Bênção Duradoura | batalha | regenPct 0.008 todas | 130 | ~0,8% vida/s no time todo; ~5–8 vida/s em elenco médio |

## Melhorias do baú (1 de 3 após vitória)
| id | nome | raridade | peso | efeito | justificativa |
|---|---|---|---|---|---|
| laminaAfiada | Lâmina Afiada | comum | 10 | danoMult 1.08 guerreiro | +8% pequeno, comum |
| couroCurtido | Couro Curtido | comum | 10 | pvMult 1.10 guerreiro | +10% vida pequeno |
| escudoDeTreino | Escudo de Treino | comum | 10 | reducaoDanoMais 0.06 guardiao | +6% redução pequeno |
| brasaMenor | Brasa Menor | comum | 10 | queimaDps 2 queimaDur 2 piromante | queima leve |
| flechaCerteira | Flecha Certeira | comum | 10 | danoMult 1.10 arqueiro | +10% dano pequeno |
| preceCurta | Prece Curta | comum | 10 | curaMult 1.12 clerigo | +12% cura pequeno |
| bolsaDeOuro | Bolsa de Ouro | comum | 10 | ouro 25 | ~1 rodada de pote |
| reforcoDeFileira | Reforço de Fileira | comum | 10 | heroi guerreiro 1 | herói grátis barato |
| balsamoRapido | Bálsamo Rápido | comum | 10 | consumivel bandagem 2 | 2 curas pequenas |
| tonicoRevigorante | Tônico Revigorante | comum | 10 | consumivel tonicoCura 1 | 1 cura média |
| reparosNaBase | Reparos na Base | comum | 10 | curarBase 6 | +6 vida de base |
| passoLeve | Passo Leve | comum | 10 | intervaloMult 0.94 todas | +6% velocidade global pequeno |
| golpeAmplo | Golpe Amplo | rara | 4 | golpeFirmeRaio 5 guerreiro | ativa área no Golpe Firme |
| muralhaViva | Muralha Viva | rara | 4 | auraReducao 0.08 auraRaio 10 guardiao | aura média |
| tornadoMenor | Tornado Menor | rara | 4 | areaMult 1.25 piromante | +25% raio médio |
| chuvaDeFlechas | Chuva de Flechas | rara | 4 | certeiroMenos 1 arqueiro | Tiro Certeiro mais frequente |
| bencaoAmpla | Bênção Ampla | rara | 4 | curaArea 8 clerigo | cura em área média |
| estandarteMarcial | Estandarte Marcial | rara | 4 | danoMult 1.10 pvMult 1.10 Marcial | família média |
| grimorioRapido | Grimório Rápido | rara | 4 | intervaloMult 0.85 Arcano | família média |
| relicarioMenor | Relicário Menor | rara | 4 | regenPct 0.008 Divino | família média |
| furiaDoCampeao | Fúria do Campeão | epica | 1 | danoMult 1.25 golpeFirmeRaio 6 guerreiro | épica forte |
| tempestadeArcana | Tempestade Arcana | epica | 1 | areaMult 1.5 queimaDps 6 queimaDur 4 piromante | épica forte |
| ressurreicaoMenor | Ressurreição Menor | epica | 1 | reviverUmaVez 0.35 clerigo | épica forte |
| cofreDoRei | Cofre do Rei | epica | 1 | ouro 90 | épica de economia |

## Evoluções (1,6–1,9× o poder do original)
| origem → evoluída | preço | rodadaMin | DPS orig → novo | EHP orig → novo | justificativa |
|---|---|---|---|---|---|
| piromante → magoTornado | 90 | 4 | 13,9 → 22,2 (+60%) + tornado 8 dps em área | 65 → 110 (+69%) | tornado adiciona dano contínuo em área |
| guerreiro → campeao | 70 | 3 | 17,8 → 28,4 (+60%) + área nativa | 120 → 210 (+75%) | golpe firme em área nativo |
| guardiao → paladino | 100 | 5 | 5,0 → 8,0 (+60%) + aura | 365×1,43 → 620×1,43 (+70%) | provoca + aura redução |
| arqueiro → atirador | 80 | 4 | 9,0 → 15,0 (+67%) perfura 3 | 70 → 115 (+64%) | perfura mais e alcance maior |
| clerigo → sumoSacerdote | 110 | 5 | 2,0 → 3,5 (+75%) + cura em área | 80 → 135 (+69%) | cura em área nativa |

## Monstros novos
| id | pv | dano | intervalo | DPS | ouro | papel |
|---|---|---|---|---|---|---|
| goblinArqueiro | 18 | 6 | 1,0 | 6,0 | 3 | à distância, frágil, flanqueia |
| ogro | 260 | 22 | 1,6 | 13,8 + golpe firme ×2 em área 6 | 12 | tanque lento, reducaoDano 0,2 |
| morcego | 12 | 4 | 0,5 | 8,0 | 1 | rapidíssimo, frágil, em bando |
| xamaGoblin | 40 | 3 | 1,5 | 2,0 + cura 14 | 5 | suporte, cura monstros |

## Rodadas novas (ideal esperado ≈ atual: 1→8 heróis)
| n | nome | composição | ideal esperado |
|---|---|---|---|
| 1 | Patrulha goblin | 6 goblins | 1 |
| 2 | Gosma e flechas | 1 slime + 3 goblinArqueiro | 2 |
| 3 | Bando misto | 10 goblins + 4 morcego | 3 |
| 4 | Pântano vigiado | 2 slime + 4 goblinArqueiro + 1 xamaGoblin | 3 |
| 5 | Horda e ogro | 14 goblins + 1 ogro | 4 |
| 6 | Poça e xamãs | 3 slime + 2 xamaGoblin + 6 morcego | 4 |
| 7 | Emboscada aérea | 12 morcego + 6 goblinArqueiro + 1 ogro | 5 |
| 8 | Exército misto | 20 goblins + 2 ogro + 2 xamaGoblin | 6 |
| 9 | Mistura nojenta | 4 slime + 10 goblinArqueiro + 2 ogro + 1 xamaGoblin | 7 |
| 10 | O Rei Slime | 1 reiSlime + 8 goblinArqueiro + 2 ogro + 2 xamaGoblin + 10 goblin | 8 |

