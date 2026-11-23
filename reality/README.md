# Reality de IAs — MVP

4 agentes com memória própria (diário, relações -10..+10, crenças reescritas toda noite),
um produtor que cria provas, plot twists e conduz o paredão, e confessionário após cada evento.

```bash
export DEEPSEEK_API_KEY=sk-...        # opcional DEEPSEEK_MODEL (padrão deepseek-flash)
python3 reality.py --dias 3 --ticks 4 # sem dependências, só Python 3
```

- Elenco editável em `elenco.json` (DNA de cada bot).
- Cada dia: ticks (cada bot escolhe conversar/cochichar/brigar/sozinho) → prova (imunidade) →
  confessionário → paredão → confessionário → reflexão. Último dia: final com júri dos eliminados.
- Saída em `runs/<data>/`: `log.json`, `roteiro.md`, `confessionario.json` (cortes com título), `agentes.json`.
- `exemplo-run/` tem uma temporada real gerada (3 dias, 2 ticks/dia).
