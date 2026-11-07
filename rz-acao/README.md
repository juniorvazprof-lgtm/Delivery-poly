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
