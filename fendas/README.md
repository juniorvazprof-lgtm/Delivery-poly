# Fendas — protótipo bullet heaven (vertical, voxel pixelado)

Projeto paralelo ao `rz-acao` (que continua intacto). Valida a diversão e o equilíbrio do combate do Mago antes das telas de menu.

## Rodar
    cd fendas && python3 -m http.server 8000

## O que tem
- Celular em pé, um dedo: arraste em qualquer lugar para mover; os feitiços saem sozinhos. Teclado: WASD, Esc pausa.
- Visual voxel pixelado: os modelos voxel são desenhados numa resolução baixa (≈340 px de altura) e ampliados sem suavizar.
- Mago com 6 feitiços (Bola de fogo, Onda de água, Lâmina de vento, Orbe arcano, Raio, Espinhos de terra) e 6 passivas, níveis 1 a 5, 4 espaços de cada.
- Fusões: dois feitiços no nível 5 viram um evoluído — Vapor escaldante (fogo + água), Tempestade de fogo (fogo + vento), Nevasca (água + vento), Tormenta arcana (raio + arcano).
- Inimigos (Ressonas sombrias) em enxame desenhados em lote: rastejante, espectro, investida, brutamonte, cuspidor, elites; minichefe aos 4:00 (dá um baú com 2 melhorias) e Guardião aos 8:00.
- Eventos: Surto de mana, Cercado!, Horda. Combo, cristais com ímã, moedas, números de dano.
- Todos os números de equilíbrio em `js/game/config.js`.

## Efeitos em resolução normal e poderes absurdos
- O cenário e os personagens continuam pixelados; os poderes são desenhados numa segunda camada em resolução normal, com brilho aditivo (`GlowPool` em `instanced.js`).
- Poderes grandes (ocupam um dos 5 espaços): Anel de fogo (cresce sem parar e explode no máximo), Chuva de meteoros (sombra de aviso, cratera), Buraco negro (suga e explode ao fechar), Trovoada (raios do céu por alguns segundos). Tremor de câmera nos impactos grandes.
