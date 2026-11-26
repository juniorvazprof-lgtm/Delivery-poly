# 🦫 Capivara Explora (beta)

Uma capivara controlada por IA explora sozinha um mundo 3D low poly gerado por semente,
aprende com as consequências das próprias ações, tira fotos, pesquisa no computador
e grava o próprio vlog vertical (9:16) pela GoPro na cabeça. Feito para celular.

## Rodar localmente
Site estático, sem build:
```bash
cd capivara-explora && python3 -m http.server 8000
# abra http://localhost:8000 (no celular: http://IP-do-computador:8000)
```

## Publicar no Netlify (beta)
O `netlify.toml` na raiz do repositório já configura tudo (pasta publicada, cabeçalhos, sem build).
- **Pelo Git:** no Netlify, *Add new site → Import an existing project*, escolha este repositório e a branch. Nada a preencher.
- **Arrastando:** abra https://app.netlify.com/drop e solte a pasta `capivara-explora`.

No celular, use *Adicionar à tela inicial* para abrir como app (ícone e tela cheia).

## Cérebro
⚙️ → **DeepSeek** (padrão, `deepseek-flash`), **Gemini** (`gemini-2.5-flash`) ou **Offline**.
Cada provedor guarda a própria chave no aparelho; o botão **Testar chave** confirma se está funcionando.
A pesquisa do computador usa a Wikipédia em português (sem chave).

## Estrutura do código (`src/`)
| Pasta | O que tem |
|---|---|
| `core/` | `config.js` (estado salvo, configuração, utilidades), `runtime.js` (G e H compartilhados) |
| `engine/` | renderizador, cena, câmera, luzes |
| `world/` | terreno e biomas, céu, modelos, tipos de objeto (efeitos ocultos), posicionamento, A*, simulação |
| `capy/` | a capivara: modelo, animações, movimento, pegadas e trilhas |
| `brain/` | percepção, cérebro (IA/offline), execução das ações, loop de IA |
| `features/` | computador, câmera/fotos, vlog, sons |
| `ui/` | interface e HUD |
| `main.js` | loop de render e início |

Cada módulo só importa módulos anteriores na ordem acima. Variáveis alteradas por vários
módulos ficam em `G` (ex.: `G.paused`); funções de módulos posteriores são acessadas por `H`
(ex.: `H.showEmoji`). Para criar um objeto novo: modelo em `tools/blender_gen/scripts/`,
tipo e efeitos em `world/types.js`, bioma em `world/objects.js` (tabela `BIOMA`).

## Modelos 3D
Gerados no Blender a partir de scripts em `tools/blender_gen/` (ver o README de lá).
