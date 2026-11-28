# Portfólio conceitual — 4 sites + portfólio

HTML/CSS/JS puro, estático, publicado no GitHub Pages pelo workflow `.github/workflows/pages.yml` (publica a pasta `sites/` ao fazer push na `main`).

- `sites/restaurante` — Brasa do Zé (lanchonete)
- `sites/clinica`, `sites/advocacia`, `sites/app`, `sites/portfolio` — próximas etapas
- `briefs/` — briefings enviados ao agente construtor (DeepSeek, via `tools/ds.py`)
- `qa/<site>/` — prints 360/390/768 e relatório Lighthouse mobile

Checklist por site: Lighthouse mobile ≥ 90 nas 4 categorias · LCP ≤ 2,5 s · CLS ≤ 0,1 · axe WCAG 2.2 AA sem violações · sem rolagem horizontal em 360 px · alvos ≥ 44 px · selo "Projeto conceitual — dados fictícios".
