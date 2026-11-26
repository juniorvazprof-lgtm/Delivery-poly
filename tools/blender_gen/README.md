# Gerador de modelos (Blender + DeepSeek)

O Claude orquestra; o DeepSeek escreve os scripts `bpy`; o Blender gera os GLB em `capivara-explora/models/`.

```bash
apt-get install -y blender python3-numpy
DEEPSEEK_API_KEY=... python3 tools/blender_gen/gerar_modelos.py            # gera todos (specs.py)
DEEPSEEK_API_KEY=... python3 tools/blender_gen/gerar_modelos.py pedra --feedback "mais achatada"
python3 tools/blender_gen/gerar_modelos.py --rebuild                         # regera a partir de scripts/, sem API
```

- `harness_header.py` define os helpers (`prim`, `empty`, `mat`) que o DeepSeek usa; `harness_footer.py` exporta e mede.
- O orquestrador valida erros, nº de triângulos, tamanho e nomes obrigatórios, e devolve os problemas ao DeepSeek (até 4 tentativas).
- `preview.html?m=nome1,nome2` mostra os modelos com a luz do jogo (sirva a raiz do repo com `python3 -m http.server`).
- Revisões feitas à mão pelo Claude: `capivara` (pernas), `flores` (sem placa de terra), `cogumelo_marrom` (sem pintas),
  `arbusto_espinhos`, `caverna` e `bola` (reescritos).
