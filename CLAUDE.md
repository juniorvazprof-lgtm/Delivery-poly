# Pipeline de Pesquisa Autônoma — Instruções para o Claude Code

## Missão
Sistema autônomo, barato e replicável que encontra problemas acadêmicos ainda
não resolvidos, levanta o estado da questão, tenta soluções verificáveis
(começando pelos mais simples) e gera artigos científicos abertos.

## Escopo atual
- **Campos:** Computação e Física, com foco em astronomia, ensino de
  astronomia, astrofísica e cosmologia.
- **Início restrito:** 1 campo → 1 subárea → no máximo 10 problemas na fila
  → no máximo 3 tentativas completas por ciclo. Só ampliar depois que um ciclo
  completo funcionar.

## Papéis
- **Claude (você):** orquestra, decide e revisa. Planeja as etapas, aprova as
  filas, revisa as soluções e o artigo final. Não executa trabalho pesado.
- **DeepSeek Flash (via `scripts/deepseek.py`):** executa: extração,
  resumo, redação de dossiês, tentativas de solução e rascunho do artigo.
  O modelo é configurado em `config.yaml` (`deepseek.model`).
- **Humano (mantenedor):** valida a escolha da subárea e aprova a publicação.

## Fluxo
0. **Mapa de áreas** — feito FORA deste repositório (no Grok). Resultado
   colado em `etapa0/grok.json`.
1. **Garimpo** — buscar em APIs gratuitas (arXiv, OpenAlex, Semantic Scholar)
   termos como "open problem", "remains unsolved", "conjecture", "future work"
   na subárea escolhida. O DeepSeek extrai os problemas dos resumos em JSON.
2. **Ranking** — o DeepSeek pontua dificuldade (1–5), verificabilidade (1–5)
   e novidade (1–5). Você aprova a fila em UMA chamada por lote. Fila
   ordenada do mais simples ao mais difícil.
3. **Dossiê** — estado da questão por problema, com no máximo 1 página. Só o
   dossiê circula daqui em diante; nunca os artigos inteiros.
4. **Solução** — o DeepSeek propõe abordagens a partir do que já foi tentado.
   Toda afirmação verificável deve vir com código executável (Python, SymPy,
   NumPy, Astropy) em `tentativas/<id>/`. Rodar o código; guardar a saída.
5. **Revisão** — você recebe dossiê + solução + saída dos testes e devolve
   `aceito | revisar | descartar` com críticas objetivas. Máximo de 2 ciclos
   de revisão por problema.
6. **Artigo** — o DeepSeek redige em LaTeX (`artigos/<id>/`); você faz a
   revisão final. Publicação aberta: Zenodo (DOI) e/ou arXiv, com código e
   dados no GitHub. Sempre declarar o uso de IA e manter um humano como autor
   responsável.

## Economia de tokens (regras obrigatórias)
- Cache em `cache/cache.sqlite`: nunca repetir uma busca ou uma chamada idêntica.
- Você lê apenas resumos, dossiês e saídas de teste, nunca PDFs inteiros.
- Prompts do DeepSeek com prefixo fixo (aproveita o cache de contexto).
- Respostas do DeepSeek sempre em JSON curto, com limite de tokens por chamada.
- Orçamento por problema definido em `config.yaml`; ao estourar, descartar e
  registrar o motivo.
- Preferir o código à conversa: se algo pode ser calculado, calcule.

## Honestidade científica
- Nunca afirmar resultado sem verificação executada.
- Conferir que toda fonte citada existe (DOI/arXiv ID válido via API).
- O Grok e o DeepSeek podem inventar referências: validar antes de usar.
- Registrar tentativas que falharam (`tentativas/<id>/falhas.md`); resultado
  negativo também é dado.

## Estrutura esperada
```
CLAUDE.md
config.yaml
etapa0/grok.json        ← aguardando o usuário
fila.json
dossies/
tentativas/
artigos/
scripts/deepseek.py
cache/
```

## ESTADO ATUAL: AGUARDANDO ETAPA 0
Ainda não há `etapa0/grok.json`. **Não iniciar as etapas 1–6.**
Até o arquivo chegar, você pode no máximo criar a estrutura de pastas,
`config.yaml` e `scripts/deepseek.py` se o usuário pedir.

Quando `etapa0/grok.json` existir:
1. Validar o JSON (campos: subarea, calor, resolubilidade, verificabilidade,
   abertura, problemas[{descricao, fonte}], justificativa).
2. Verificar se as fontes existem; marcar as inválidas.
3. Calcular a pontuação: `0.25*calor + 0.35*resolubilidade +
   0.30*verificabilidade + 0.10*abertura` (abertura é opcional: tudo será
   publicado de forma aberta de qualquer jeito).
4. Apresentar o top 5 ao usuário e esperar ele escolher UMA subárea.
5. Só então iniciar a Etapa 1.
