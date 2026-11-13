# Delivery-poly — Claude orquestrador + DeepSeek como subagente

Neste repositório o Claude Code planeja e revisa, e o **DeepSeek V4.1 Flash** faz o trabalho braçal
através do servidor MCP open source [deepseek-as-subagent](https://github.com/PsChina/deepseek-as-subagent)
(commit `4144047`, auditado). Regras de delegação: veja [CLAUDE.md](CLAUDE.md).

| Arquivo | Para quê |
|---|---|
| `.mcp.json` | Registra o servidor `deepseek`; a chave vem de `DEEPSEEK_API_KEY` |
| `setup.sh` | Instala o servidor em `/opt/deepseek-mcp` (idempotente, ~3 s) |
| `scripts/deepseek-mcp.sh` | Inicia o servidor e roda o `setup.sh` sozinho se faltar a instalação |
| `CLAUDE.md` | Regras do que delegar e do que nunca enviar |

## Configurar o ambiente em nuvem pelo app do Claude

1. Crie uma chave em <https://platform.deepseek.com> (API keys). Guarde-a; não cole em arquivos.
2. No app do Claude, abra **Code** → toque no nome do ambiente da sessão → **editar ambiente**
   (ou crie um novo, ex.: `delivery-poly`).
3. **Network access** → escolha **Custom**.
   - Mantenha marcada a opção de incluir a **lista padrão** (registries de pacotes, GitHub etc.).
   - Em hosts permitidos adicione: `api.deepseek.com`
4. **Chave** — escolha um jeito:
   - **Mais fácil (sem PC):** peça ao Claude na sessão "peça a chave do DeepSeek". Abre um formulário
     seguro; a chave fica salva como *network secret* de `api.deepseek.com` e o proxy a injeta
     (já libera o host; o `.mcp.json` usa um valor fictício quando a variável não existe).
   - Ou em **Environment variables**: `DEEPSEEK_API_KEY=sk-sua-chave-aqui`.
5. **Setup script** (opcional) → cole o conteúdo de [`setup.sh`](setup.sh). Sem ele funciona igual:
   o `scripts/deepseek-mcp.sh` instala na primeira vez que o servidor sobe (~3 s a mais).
6. Salve e **inicie uma sessão nova** neste repositório (o setup e as variáveis só valem em sessões novas).

## Testar se a delegação funciona

Na sessão nova, mande:

> Rode `/mcp` e confirme que o servidor deepseek está conectado. Depois chame `ping` do deepseek
> e delegue ao DeepSeek: "crie `scratch/hello.txt` com a frase Olá do DeepSeek". Revise e me mostre o resultado.

Esperado: o servidor `deepseek` aparece como conectado, o `ping` responde, o arquivo é criado e o
Claude informa quantas chamadas delegou e uma estimativa de tokens.

Se falhar:
- `deepseek` não aparece / falhou ao iniciar → o setup script não rodou; confira o log da sessão
  ou rode `bash setup.sh` manualmente.
- Erro de chave → `DEEPSEEK_API_KEY` não está nas variáveis do ambiente.
- Erro de conexão/proxy → `api.deepseek.com` não está no Network access Custom.

## Privacidade
Tudo que o DeepSeek lê vai para servidores na China. O `CLAUDE.md` proíbe enviar `.env`, chaves e
dados pessoais — mantenha esses arquivos fora do que é delegado.
