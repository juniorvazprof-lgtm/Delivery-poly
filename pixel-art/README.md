# Pixel Art — projeto separado

Pasta de trabalho para criar pixel art com o Claude, separada do jogo Fendas.
As skills ficam em `.claude/skills/` e são carregadas quando você trabalha nesta pasta.

## Skills instaladas

| Skill | O que faz | Origem e licença |
|---|---|---|
| `pixel-art-mestre` | Conhecimento profundo de pixel art: paletas limitadas, hue shifting, dithering, contorno seletivo (selout), animação subpixel, tilesets, restrições de hardware (NES, SNES, GBA) e HD-2D. Inclui padrões, erros comuns e regras de validação. | omer-metin/skills-for-antigravity, Apache 2.0 |
| `pixel-art-sprites` | Foco em sprites de jogo: personagens, sprite sheets, ciclos de animação (caminhar, atacar, parado) e tiles. | omer-metin/skills-for-antigravity, Apache 2.0 |
| `pixel-art-conversor` | Scripts que convertem qualquer imagem em pixel art com 14 estilos (arcade, SNES, NES, Game Boy, PICO-8, C64, neon e outros) e geram vídeo ou GIF animado com efeitos (chuva, vagalumes, neve, brasas). | NousResearch/hermes-agent (autor dodo-reach), MIT |

As duas primeiras são guias de conhecimento, sem código. A terceira usa Python, a biblioteca Pillow e o ffmpeg para vídeo.

## Como usar

- Peça direto, por exemplo: "crie um sprite 32×32 de um mago com paleta de 16 cores", "revise este sprite" ou "monte uma rampa de cores para lava".
- **Converter uma imagem:** coloque a imagem em `entrada/` e peça "converta em pixel art estilo SNES". O resultado vai para `saida/`.
- **Pela linha de comando:**
  ```bash
  cd pixel-art/.claude/skills/pixel-art-conversor/scripts
  python3 pixel_art.py ../../../../entrada/foto.png ../../../../saida/foto_px.png --preset snes
  python3 pixel_art_video.py ../../../../saida/foto_px.png ../../../../saida/foto.mp4 --scene night --gif
  ```

## Pastas

- `entrada/` — imagens de origem.
- `saida/` — pixel art gerada.

## Outras skills pesquisadas e não instaladas

Pedem conta ou API paga:
- **Retro Diffusion:** geração de pixel art por IA, serviço pago.
- **fal.ai gamedev, SpriteCook e Layer:** geração por IA, exigem conta e créditos.
- **agent-sprite-forge:** precisa de um gerador de imagens externo.

Se quiser gerar sprites por IA de texto para imagem, uma delas pode ser instalada depois com a chave de API correspondente.
