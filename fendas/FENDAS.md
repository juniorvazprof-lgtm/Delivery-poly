# Fendas — documento do protótipo

> Bullet heaven vertical para celular, com voxels e magia sombria.
> Versão: protótipo jogável (MVP da primeira fase).

---

## 1. O que é o jogo

**Fendas** é um *bullet heaven* (estilo Vampire Survivors) pensado para jogar **na vertical, com um dedo**. Você controla um **Mago** que lança feitiços **sozinho**. O jogador só se move, desvia dos inimigos e escolhe melhorias. A meta é **sobreviver 8 minutos** dentro de uma Fenda e **derrotar o Guardião**.

**Tom e mundo:** magia sombria. Fendas mágicas se abrem num mundo explorado por corporações e guildas, e magos mercenários entram nelas para caçar criaturas (as Ressonas) e saquear cristais.

**Visual:** modelos voxel com contorno escuro e câmera de cima, levemente inclinada. Os efeitos dos feitiços têm brilho e são desenhados numa camada de resolução normal.

---

## 2. Como se joga

| Ação | Como |
|---|---|
| Mover | Arrastar o dedo em qualquer lugar (joystick flutuante) ou WASD/setas |
| Atacar | Automático |
| Subir de nível | Coletar cristais dos inimigos derrotados |
| Pausar | Botão II, Esc ou P |

**Uma partida:**
1. Começa com a **Bola de fogo**.
2. Inimigos cercam o Mago, e a pressão cresce com o tempo.
3. Cada nível oferece **1 de 3 cartas**: um feitiço novo, a melhoria de um feitiço ou uma passiva.
4. Eventos, campeões, minichefe (4:00) e **Guardião (8:00)**.
5. Ao terminar, o ouro ganho vai para o cofre e é usado no Arsenal.

---

## 3. Sistemas implementados

### 3.1 Feitiços (14) — nível 1 a 5, máximo de 4 ataques por partida
| Feitiço | Comportamento | Status que aplica |
|---|---|---|
| Bola de fogo | Projétil no mais próximo, explode em área | Queimar |
| Onda de água | Pulso em volta, empurra | Encharcar |
| Lâmina de vento | Lâminas em leque que atravessam | — |
| Orbe arcano | Orbes giram em volta | Corromper |
| Raio | Atinge e salta entre inimigos | Eletrizar |
| Espinhos de terra | Brotam do chão e prendem | — |
| Feixe da Aurora | Feixe de luz giratório | Expor (+25% de dano) |
| Fagulhas caçadoras | Orbes pequenos que perseguem | Corromper |
| Lâmina rúnica | Ricocheteia nas bordas da tela | Corromper |
| Pulso glacial | Pulso que esfria e congela | Congelar |
| Anel de fogo | Anel em volta do Mago; cresce com o nível | — |
| Chuva de meteoros | Meteoro no maior grupo de inimigos | Queimar |
| Buraco negro | Suga inimigos e explode | Corromper |
| Trovoada | Raios caem do céu por alguns segundos | Eletrizar |

O alcance de mira começa curto (cerca de 4 unidades) e cresce com a passiva **Alcance**.

### 3.2 Evoluções (feitiço no nível 5 + passiva certa)
| Feitiço | + Passiva | = Evolução |
|---|---|---|
| Bola de fogo | Poder | Inferno carmesim |
| Feixe da Aurora | Alcance | Aurora suprema |
| Fagulhas caçadoras | Sorte | Enxame de almas |
| Lâmina rúnica | Eco | Runa eterna |
| Pulso glacial | Ampulheta | Inverno zero |
| Anel de fogo | Vigor | Coroa solar |

As cartas indicam com qual passiva cada feitiço evolui, e as passivas que completam uma evolução aparecem com borda dourada.

### 3.3 Fusões (dois feitiços no nível 5 viram um)
Vapor escaldante (fogo + água), Tempestade de fogo (fogo + vento), Nevasca (água + vento) e Tormenta arcana (raio + arcano).

### 3.4 Passivas (9) — até 4 por partida
Poder, Pressa, Alcance, Ímã, Vigor, Passo leve, Eco (+projéteis), Ampulheta (+duração) e Sorte (crítico e drops).

### 3.5 Status elementais e combos
| Combo | Como acontece | Efeito |
|---|---|---|
| Choque térmico | Fogo em congelado | Dano dobrado |
| Condutor | Raio em encharcado | +80% de dano |
| Congelamento | Gelo em encharcado | Congela o dobro do tempo |
| Sobrecarga | Golpe em eletrizado | Solta um raio no vizinho |
| Corrupção | Corrompido morre | Explode em área |

Cada status muda a cor do inimigo, e o primeiro combo descoberto mostra um aviso na tela.

### 3.6 Inimigos
- **Comuns:** rastejante, espectro, investida (avança em linha reta), brutamonte e cuspidor (atira de longe).
- **Elites:** versões grandes e resistentes que surgem a partir de 2:30.
- **Campeões da Fenda:** chegam em 4 momentos fixos (2:00, 3:00, 5:00 e 6:40), são enormes, lentos e muito resistentes, e **carregam um baú**.
- **Minichefe** (Caldeira Viva, 4:00) e **Guardião** (Arborion Ancião, 8:00), com círculo de aura.

### 3.7 Baús com caça-níquel
O baú abre uma tela de caça-níquel: **1 rolo** nos campeões comuns e **3 rolos** nos campeões fortes e no minichefe. Cada rolo dá uma melhoria, e as evoluções têm prioridade.

### 3.8 Exploração
- **Santuários:** ficam no mapa e você os encontra explorando. Ao ficar no círculo, um contador circular fecha e dá uma **bênção temporária**:
  - Fúria arcana: +60% de dano.
  - Passos do vento: +45% de velocidade.
  - Fluxo total: −40% de recarga.
  - Égide: invulnerável.
  - Chamado: puxa todos os cristais e cura.
- **Minério:** rochas que os feitiços quebram, soltando cristais e ouro.
- **Corações em pixel art:** curam 20 de vida.

### 3.9 Ferramentas de escolha
**Rerolar** (troca as 3 cartas) e **Banir** (remove uma carta da partida), 2 de cada, com mais disponíveis no Arsenal.

### 3.10 Meta-progressão (salva no aparelho)
- **Ouro** ganho por partida, somando moedas, abates, tempo e vitória.
- **Arsenal:**
  - **Feitiços:** 6 liberados de início e 8 para comprar.
  - **Melhorias permanentes:** dano, vida, recarga, ímã, velocidade, ouro, rerolagem, banimento e segunda chance.
  - **Heróis:** Mago; o Necromante aparece como "em breve".
- **Missões** (12) com recompensa em ouro.
- **Estatísticas:** partidas, recordes, combos descobertos e feitiço favorito.

### 3.11 Interface e sensação
- Barra de vida embaixo do Mago e números de dano pequenos e filtrados.
- Sombras sob os personagens e tremor de tela nos golpes fortes.
- **Sons sintetizados**, com um botão para ligar e desligar na pausa.
- **Tela de resultado** com dano por feitiço e o próximo objetivo de compra.

---

## 4. Equilíbrio atual

Testado com um bot automático, que joga pior que uma pessoa:

| Situação | Resultado |
|---|---|
| Ficar parado (qualquer build) | Morre entre 45 s e 2:20, sem build imortal |
| Em movimento, build boa (Fogo + Fagulhas) | 6:30 a 10:00 |
| Em movimento, build fraca | 3:00 a 5:00 |

**Meta:** partidas de **6 a 8 minutos** com uma build adequada.

Todos os números ficam em `js/game/config.js`: dano, recargas, vida dos inimigos, ritmo de surgimento e XP.

---

## 5. Estrutura do código

```
fendas/
├── index.html            telas (menu, arsenal, missões, nível, caça-níquel, pausa, resultado)
├── css/style.css         estilo pixel do HUD e dos menus
└── js/
    ├── lib/three.js      Three.js 0.160 (local)
    ├── engine/voxel.js   construção de modelos voxel, contorno e lotes estáticos
    ├── data/models.js    modelos voxel dos inimigos
    └── game/
        ├── config.js     TODOS os números de equilíbrio
        ├── main.js       laço do jogo, inimigos, diretor, dano, HUD e telas
        ├── spells.js     comportamento de cada feitiço
        ├── world.js      cenário infinito, decoração, santuários e minério
        ├── instanced.js  desenho em lote (centenas de inimigos com poucas chamadas)
        ├── meta.js       ouro, Arsenal, missões e estatísticas (localStorage)
        └── sfx.js        sons sintetizados (Web Audio)
```

**Como rodar localmente:** dentro da pasta `fendas`, rode `python3 -m http.server 8000` e abra `http://localhost:8000`. Abrir o `index.html` direto não funciona, por causa dos módulos JavaScript.

---

## 6. Próximos passos

### Fase 1.5 — Polimento visual (recomendado agora)
1. **Brilho real (bloom)** em feitiços, cristais e neon, com opção de desligar.
2. **Iluminação no chão** a partir de postes, cristais e feitiços.
3. **Animação dos inimigos:** passos, inclinação e esmagar e esticar ao levar dano.
4. **Morte em pedaços voxel.**
5. Rastros nos projéteis, partículas no ambiente e Mago mais expressivo.
6. **Ajustar o Guardião**, hoje fraco em relação ao resto (vida fixa de 4.200).

### Fase 2 — "O contrato" (identidade própria)
1. **Menu de Fendas:** mapa com várias Fendas, cada uma com bioma, inimigos e chefe próprios, e níveis de perigo.
2. **Contratos:** cada partida é um trabalho com objetivo (extração, escolta, contenção, caçada) e pagamento.
3. **Cláusulas de risco**, no estilo do Heat de Hades: modificadores opcionais que aumentam a recompensa.
4. **Saída voluntária:** um portal de extração aparece e o jogador decide se sai com o saque ou arrisca ficar.
5. **Anomalias da Fenda:** eventos que obrigam a mudar de plano (zonas de lava, gravidade invertida, portal temporário).

### Fase 3 — Profundidade de build
1. **Runas acopláveis** nos feitiços (ricochete, dividir, perseguir, explodir), uma versão simples para celular dos feitiços programáveis de Noita.
2. **Pactos:** itens raros que mudam uma regra da partida, como os Jokers de Balatro.
3. Evoluções para os feitiços que ainda não têm.

### Fase 4 — Novo herói e mundo
1. **Necromante:** invocações, corrupção e **possessão** (ao morrer, possui um campeão próximo).
2. **Saque e pesquisa:** carcaças e minérios vendidos no mercado negro ou pesquisados no laboratório da guilda.
3. **Cicatrizes** em vez de morte permanente (enfermaria por 2 ou 3 partidas).
4. **Fenda do dia:** seed fixa com ranking.

### Técnico e lançamento
- Medir o desempenho num **Android real**, com 200 inimigos e efeitos.
- Empacotar como **PWA** ou **Capacitor** para instalar.
- Salvamento na nuvem (opcional).
- Atualizar o GDD "Guilda das Fendas" para a direção bullet heaven.

### Cuidados de design (aprendidos na pesquisa e nos testes)
- **Não exagerar na meta-progressão:** priorizar liberar opções em vez de atributos brutos.
- **Evitar builds imortais:** sempre testar parado e em movimento.
- **Mortes justas:** todo golpe forte precisa de aviso visível.
- **Sorte controlada:** base de build garantida, rerolar e banir.
