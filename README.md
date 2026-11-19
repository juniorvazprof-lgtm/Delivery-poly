# Escritório de Agentes IA

Escritório 3D low poly em que agentes (4 de IA e 3 de roteiro) constroem um site, para a feira de ciências.

## Rodar
- **Só offline** (sem internet): `python3 -m http.server 8000` e abra `localhost:8000`.
- **Com modo online (IA ao vivo)**: `DEEPSEEK_API_KEY=<sua chave> npm start` e abra `localhost:8080`. A chave vem só da variável de ambiente; nunca é escrita em arquivo nem vai ao navegador. Só o texto do pedido (≤140 caracteres) é enviado à API. Sem chave ou sem internet, o modo online se desliga e o offline continua.
- Em ambientes com proxy, use `NODE_USE_ENV_PROXY=1`.

## Atalhos
Espaço pausa · ← → etapa anterior/próxima · 1–4 velocidade · R reinicia · P modo apresentação (loop dos 4 cenários) · G gira a câmera · clique no telão para tela cheia.

## Material
- `roteiro.html`: roteiro do apresentador, uma página A4 por cenário (imprimir pelo navegador). Gerado por `tools/gerar_roteiro.py`.
- Testes: `npm test`.
