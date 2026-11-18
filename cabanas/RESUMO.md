# Pine Hollow — resumo do projeto

## O que é
**Pine Hollow** é um survival horror em pixel art (visual HD-2D: cena 3D em Three.js desenhada em baixa resolução,
paleta de 26 cores, contorno e pontilhado), com câmera isométrica alta, feito para rodar no navegador do celular.

**História (demo):** o carro do protagonista morre numa ponte; ele chega a pé a Pine Hollow, uma cidadezinha do
interior dos EUA que foi arrancada para outra dimensão por um pacto do Reverendo Absalom Crane. De dia a cidade
parece normal (nevoeiro cinza, NPCs humanos); ao anoitecer o sino da igreja toca três vezes e as criaturas saem.
Personagens: Ruth Mayhew (posto), Velho Amos (barracão do lago), Lucy (motel), Xerife Hooper, Reverendo Absalom.

## Como jogar (versão atual)
- Joystick à esquerda (até a metade = andar devagar e em silêncio). Teclado: WASD/setas, Shift = devagar.
- **Segurar FIRE** = parar e mirar (um laser fecha no alvo); **soltar** = atirar. Tiro sem mira desvia e causa menos dano.
- ⇄ (Q) troca espingarda/pistola · ↻ (R) recarrega · LIGHT (F) lanterna · ✦ (G) vela de mão · ▦ (I) inventário · E abrigo · M som.

## O que já está implementado (etapa 1)
- **Dia e noite:** dia ~8 min, noite ~5 min; luz, céu e névoa mudam; névoa ao redor do personagem (ele sempre nítido).
  Sino ao anoitecer; criaturas só à noite e desfeitas em fumaça ao amanhecer.
- **Abrigos (3):** círculo de sal que as criaturas não cruzam; acender a vela salva o jogo; baú de 24 espaços;
  dormir até o amanhecer (recupera vida). Ao morrer: voltar ao último abrigo ou recomeçar.
- **Inventário de 8 espaços** (espingarda ocupa 2): usar, equipar, combinar (pano + álcool = curativo), largar, guardar no baú.
  Munição, pilhas e velas vêm do inventário. Itens espalhados pelo mapa e nas caixas das cabanas.
- **Combate pesado:** munição rara, mira que fecha, inimigos não derrubam itens.
- **Luz e som:** lanterna com bateria (pilhas), ondas de som visíveis no chão; criaturas investigam barulhos.
- **Criaturas provisórias:** comum, mariposa (corre para a luz), gritador (chama a área) — serão trocadas na etapa 4.
- **Idiomas:** inglês (padrão) e português, escolhidos na tela de título.
- **Sons sintetizados** (sem arquivos de áudio): tiros, recarga, gemidos, sino, ambiente noturno.
- **Salvamento validado** no aparelho (dados corrompidos nunca quebram o jogo).

## Estrutura do código (`cabanas/`)
| Arquivo | Papel |
|---|---|
| `index.html`, `css/estilo.css`, `css/inventario.css` | Página e interface |
| `js/main.js` | Laço principal, liga tudo |
| `js/config.js` | Todos os números de equilíbrio |
| `js/render.js` | Renderização pixel art e névoa ao redor do personagem |
| `js/mundo.js` | Mapa (lago, cabanas, pinheiros, caixas) |
| `js/heroi.js` | Personagem, poses das armas, controles |
| `js/combate.js` | Criaturas, percepção, tiro, mira, itens no chão, velas |
| `js/ciclo.js` | Relógio do dia e da noite, luz |
| `js/abrigos.js`, `js/salvo.js` | Abrigos e salvamento |
| `js/itens.js`, `js/inventario.js`, `js/ui-inventario.js` | Itens, lógica e tela do inventário |
| `js/i18n.js`, `js/lang/en.js`, `js/lang/pt.js` | Idiomas |
| `js/missao.js`, `js/hud.js`, `js/sons.js`, `js/bot.js` | Sessão, interface, sons, bot de teste |
| `tests/` | Testes de unidade (`node --test tests/*.test.mjs`), teste da tela do inventário e bot de equilíbrio |
| `SPEC-etapa1.md` | Especificação técnica da etapa 1 |

**Rodar:** servir a pasta por HTTP (ex.: `npx serve cabanas`) e abrir `index.html`. `?bot=1&rapido=10` joga sozinho.

## Próximos passos de implementação
| Etapa | Entrega |
|---|---|
| **2 · A cidade e a abertura** | Cena inicial (carro na ponte, relógio em 3:33, caminhada até a placa); mapa interligado: estrada, posto da Ruth, lanchonete, motel, igreja no morro, lago com cabanas; portas, chaves e mapa automático |
| **3 · NPCs e história** | Ruth, Amos, Lucy, Xerife e Reverendo de dia; diálogos com escolhas; trocas de itens; documentos e diário; objetivos dos Dias 1 e 2 |
| **4 · Criaturas novas** | Dizimeiro (comum), Lamparina (pequena, apaga a lanterna), Pastor de Pele (só se move quando você não olha); substituem os provisórios |
| **5 · Final da demo** | Coro (mini-chefe), a igreja à noite, Absalom (chefe) e a cena final com a mãe de Ruth |
| **6 · Polimento para publicação** | Órgão e hinos distorcidos, menu de opções (volume, brilho, legendas), tutorial curto, créditos, versão instalável (PWA) e página da demo |

## Melhorias sugeridas
- **Arte:** usar o Gemini (Flash Image) para arte conceitual das criaturas, da cidade e da capa; manter o jogo em blocos/pixel.
- **Voz:** falas curtas dos NPCs e do rádio com o Gemini TTS, com efeito de estática.
- **Desempenho:** criaturas mais leves (instancing ou sprites) se a noite pesar em celulares simples.
- **Acessibilidade:** opção de mira assistida mais forte, tamanho dos botões, vibração, legendas maiores.
- **Equilíbrio:** testes com pessoas reais (o bot é bom para regressão, mas joga diferente de um humano).
- **Conteúdo:** mais receitas (vela + fósforo), mais documentos, segredos de dia que ajudam à noite.
- **Técnico:** empacotar num único arquivo para distribuição, cache offline, telemetria local de mortes/tempo para ajustar a dificuldade.
