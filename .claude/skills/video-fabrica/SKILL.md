---
name: video-fabrica
description: Fábrica de vídeos verticais (Shorts/Reels/TikTok) em estilo "tech thriller" 3D a partir de uma narração (mp3/wav). O DeepSeek planeja as cenas e escreve o código novo; scripts locais transcrevem (Whisper), checam quadros vazios, renderizam (30 fps) e mixam áudio. Claude só orquestra e revisa UMA folha de prévia. Use quando o usuário mandar um áudio/narração para virar vídeo, pedir "gera o vídeo", "faz o episódio", "vídeo do áudio", ou quiser produzir vários vídeos por dia gastando poucos tokens.
---

# video-fabrica

Objetivo: **muitos vídeos por dia com o mínimo de tokens do Claude**. Claude é orquestrador:
roda comandos, lê saídas curtas, olha 1 imagem por vídeo. Todo texto longo (plano, código de cena,
correções) é do DeepSeek (`api.deepseek.com`, credencial injetada pelo proxy).

Pasta: `.claude/skills/video-fabrica/` (abreviada `F`). Trabalhos ficam em `F/trabalho/<nome>/` (fora do git).

## Fluxo (siga nesta ordem, sem ler código)

1. **Tudo até a prévia** — um comando, em segundo plano (leva ~5–15 min):
   ```bash
   cd F && python3 fabrica.py tudo trabalho/<nome> <audio> --tema "<tema em 1 linha>" > trabalho/<nome>.log 2>&1
   ```
   (transcreve → DeepSeek planeja → DeepSeek escreve cenas novas → checagem automática com até 2
   rodadas de correção pelo DeepSeek → `folha.png`).
2. **Revisão (único gasto visual)**: leia `trabalho/<nome>/folha.png` (12 quadros) e
   `tail -20` do log. Só intervenha se algo estiver claramente quebrado:
   - cena de biblioteca ruim → troque params no `plano.json` (edição pequena, sem reescrever);
   - cena nova ruim → `python3 fabrica.py checar trabalho/<nome>` de novo, ou edite o brief em
     `trabalho/<nome>/briefs/X.txt` e rode `cenas` + `checar`. Não escreva cenas você mesmo.
3. **Aprovação**: mande a folha ao usuário (SendUserFile) se ele pediu para aprovar antes.
4. **Render final** (em segundo plano, ~0,6 s por quadro ÷ processos):
   ```bash
   python3 fabrica.py render trabalho/<nome> --fps 30 --proc 3
   ```
   Saída: `trabalho/<nome>/final.mp4` (1080x1920, 30 fps, −14 LUFS, ~8 Mbps). Envie com SendUserFile.

## Regras de economia
- Não leia `motor/*.js`, `fabrica.py` nem cenas geradas, a não ser para depurar um erro real.
- Não renderize quadros avulsos para "dar uma olhada": a folha basta.
- Vários vídeos: rode vários `tudo` em paralelo (um por pasta) e revise as folhas juntas.
- Cenas novas que ficaram boas e são genéricas: copie para `motor/cenas/` com comentário de
  cabeçalho (`// descrição` + `// params: {...}`) — o planejador passa a reutilizá-las e o custo cai.
- Render: 30 fps padrão; `--proc` = núcleos − 1.

## Biblioteca de cenas (`motor/cenas/`)
globo (ataque ao alvo + onda vermelha), celular (tela de alerta com textos), relogio (separador
"MINUTO X"), mapa (países reais, rotas, pinos, estilos cyber/vox), titulo (frase de impacto).
Contrato para cenas novas: `motor/contrato-cena.md`. Exemplos completos: `exemplos/ep1/`.

## Requisitos (já atendidos no ambiente de nuvem)
python3 + `pip install faster-whisper numpy pillow`, node + playwright (Chromium), ffmpeg.
Modelo Whisper small é baixado sozinho via npm na primeira vez (`modelo/small`, fora do git).
Créditos de música (CC BY 4.0, Kevin MacLeod / incompetech.com) devem ir na descrição do vídeo.
