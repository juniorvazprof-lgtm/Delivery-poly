# Ressonância Zero — Protótipo de ação (MVP 0 + MVP 1 etapa 1)

Protótipo separado do RPG v21. Objetivo: validar se o combate em tempo real é bom no celular (paisagem).
Não lê nem grava o save do RPG (`rz_save_v1`); só guarda preferências em `rz_acao_settings_v1`.

## Como rodar
Sirva a pasta por HTTP (módulos ES não abrem via `file://`):

    cd rz-acao && python3 -m http.server 8000

No Android: Acode com servidor local, ou qualquer hospedagem estática. Three.js 0.160 está incluído (sem CDN).

## Conteúdo
- Kay: joystick flutuante, combo de 3 golpes com o bastão, esquiva com invulnerabilidade curta, ajuste suave de mira.
- Perseguidor (setor no chão + investida) e disparador (linha + projétil lento). Todo ataque tem preparação, golpe e recuperação.
- Guarda (pips amarelos): quebrar atordoa e aumenta o dano. Barra de vida só aparece após o primeiro golpe.
- 3 ondas, pausa (também ao perder foco/trocar de app), contagem antes de retomar, opção de efeitos reduzidos e FPS.
- Teclado: WASD, J ataque, K/Espaço esquiva, Esc pausa.

## Arquivos
- `js/engine/voxel.js`, `js/engine/idle.js`, `js/data/models.js`: copiados sem alteração do RPG v21.
- `js/game/config.js`: todos os valores de ajuste (tempos, alcance, dano, ondas).
- `js/game/merge.js`: junta as caixas de cada modelo por material (menos chamadas de desenho).
- `js/game/{input,kay,enemies,arena,fx,main}.js`: código novo do modo ação.

Espécies dos inimigos (Arborion e Fanaluz) são provisórias até a definição do bioma e da Bíblia Visual.

## MVP 1 · etapa 1 (Fenda)
- Arma de Kay: lâmina de pulso (espada cyberpunk de cuboides com fio ciano).
- Incursão de 6 salas: 5 salas sorteadas entre 5 layouts + câmara final. Ao limpar, 2 portas mostram o tipo da próxima sala (Combate, Recurso, Resgate).
- Investidor (`charger`): recua, marca a linha e corre; bater em obstáculo o atordoa.
- Liga de Fenda cai dos inimigos e é atraída até Kay; na derrota, metade é perdida.
- Resgate e Guardião são marcadores provisórios (etapa 3). Lógica em `js/game/run.js`.

## Ajustes de jogabilidade (pedido do autor, substituem o GDD nestes pontos)
- Inimigos comuns não marcam o chão: o aviso é só a pose de preparação e o brilho branco no corpo; a preparação varia ±15%.
- Salas em clareira: centro livre, decoração e obstáculos só nas bordas, objetos quebráveis que soltam Liga de Fenda.
- Saídas em cima, à esquerda ou à direita, conforme a sala.
- Recuo ao golpe: perseguidor e disparador recuam a cada golpe; o investidor só no 3º.

## Cenário e mapa da Fenda
- Cenário em camadas (`js/game/scenery.js`): chão com iluminação de palco, 4 anéis de folhagem do claro ao quase preto, rochas e restos da cidade, ruínas de Kanda-9 ao fundo (parallax lento), silhuetas de folhas em primeiro plano (parallax rápido), esporos flutuando e detalhes baixos no chão.
- Mapa da Fenda: 8 camadas de 2–3 salas ligadas + câmara final. Ao limpar a sala, a saída leva ao mapa, onde se escolhe o próximo caminho.
- Tipos de sala: Combate, Recurso, Resgate, Baú (quebrar o baú), Evento (altar com escolha) e Descanso (+2 de vida).

## MVP 1 · etapa 2 (companheira)
- Escolha no início da incursão: Brasque (faixa de fogo), Marolho (onda que empurra, interrompe e apaga projéteis) ou Brogume (raízes que prendem por 2 s).
- A companheira segue Kay sem bloquear, dá um golpe leve automático a cada 3,5 s e não tem vida própria.
- Botão de Habilidade com recarga em preenchimento progressivo e segundos restantes. Teclado: L.
- Código em `js/game/companion.js`; valores em `CFG.companions`.

## MVP 1 · etapa 3 (Guardião, resgate, bênçãos) e novas telas
- Guardião (`js/game/boss.js`): Arborion Ancião, 2 fases. Pisão em área e investida marcados no chão; na fase 2, três impactos seguidos e anel de esporos. Bater em obstáculo durante a investida o atordoa.
- Resgate: na sala de Resgate, após limpar, uma Ressona debilitada aparece; o botão contextual "Sincronizar" consome um Cubo Nexus (começa com 2; baús dão +1).
- Bênçãos: a cada 2 salas de combate, escolher 1 de 3 (só nesta incursão). Ícones ativos aparecem no HUD.
- Telas refeitas: escolha da companheira em cartões, mapa com barra de rotas grande e status, painel de pausa/evento e resultado com estatísticas.

## Ajustes: companheiras e Guardião
- Brasque: salta no inimigo (explosão de fogo) e acende a espada de Kay por 5 s: +1 de dano, arco maior e queimadura.
- Marolho: redemoinho que puxa os inimigos para perto de Kay, encharca (sem atacar) por 1,5 s e apaga projéteis.
- Guardião sem marcação no chão: avisa só pela pose e pelo brilho branco. Mais vida (85), golpes mais rápidos, pisão causa 2, salto até a posição de Kay, sequências de 2–3 golpes e reforços na fase 2.
