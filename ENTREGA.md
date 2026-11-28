# Entrega — portfólio de 4 sites conceituais + página de portfólio

Tudo é **HTML/CSS/JS puro** (sem build, sem dependências): basta abrir os arquivos ou publicar a pasta `sites/`.
Todos os dados (nomes, endereços, telefones, CNPJ, OAB, CREFITO) são **fictícios** e cada rodapé traz o selo "Projeto conceitual — dados fictícios".

## Conteúdo do pacote

| Pasta | O que é |
|---|---|
| `sites/restaurante/` | Brasa do Zé — lanchonete (cardápio, carrinho → WhatsApp, horário, mapa, link Google) |
| `sites/clinica/` | Movimento Pleno — fisioterapia (serviços, equipe, convênios, agendamento, depoimentos ilustrativos) |
| `sites/advocacia/` | Exemplo & Modelo — advocacia (áreas, sobre, contato; sem promessas, preços ou depoimentos — Provimento 205/2021) |
| `sites/app/` | Feira — landing de app (benefícios, como funciona, planos, FAQ, cadastro) |
| `sites/portfolio/` | Página única com os 4 trabalhos, notas Lighthouse, pacotes e contato |
| `sites/index.html` | Redireciona a raiz para o portfólio |
| `qa/<site>/` | Prints em 360, 390 e 768 px + relatório Lighthouse mobile (HTML) |
| `briefs/` | Briefings enviados ao agente construtor (DeepSeek) |
| `tools/ds.py` | Script que envia um briefing ao DeepSeek e grava os arquivos |
| `.github/workflows/pages.yml` | Deploy automático no GitHub Pages |
| `CREDITS.md` | Créditos de fontes e imagens |

## Resultados (Lighthouse mobile, servidor local)

| Site | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | axe WCAG 2.2 AA |
|---|---|---|---|---|---|---|---|
| Restaurante | 100 | 100 | 100 | 100 | 1,4 s | 0 | 0 violações |
| Clínica | 100 | 100 | 100 | 100 | 1,1 s | 0 | 0 violações |
| Advocacia | 100 | 100 | 100 | 100 | 0,8 s | 0,03 | 0 violações |
| App | 100 | 100 | 100 | 100 | 0,9 s | 0 | 0 violações |
| Portfólio | 100 | 100 | 96 | 100 | 1,2 s | 0 | 0 violações |

Nenhum site tem rolagem horizontal em 360 px. O portfólio perde 4 pontos em Boas práticas porque as miniaturas são capturas em 1x (aparecem um pouco suaves em telas de alta densidade); pode ser resolvido com capturas em 2x.
As notas foram medidas localmente; após publicar, vale rodar o Lighthouse de novo na URL real.

## Como publicar no GitHub Pages

1. Envie o conteúdo deste pacote para um repositório no GitHub (branch `main`).
2. Em **Settings → Pages → Source**, escolha **GitHub Actions**.
3. A cada push na `main`, o workflow publica a pasta `sites/`:
   - `https://SEU-USUARIO.github.io/SEU-REPO/` → portfólio
   - `.../restaurante/`, `.../clinica/`, `.../advocacia/`, `.../app/`
4. Os `sitemap.xml` usam URLs de exemplo; troque pelo domínio real depois de publicar.

## Para ver localmente

```bash
cd sites && python3 -m http.server 8080
# abra http://localhost:8080/
```

## Identidade de cada site

- **Restaurante:** letreiro pintado de lanchonete de rua; mostarda, carvão, tomate; fonte Anton.
- **Clínica:** "a linha do movimento"; azul-petróleo, sálvia, areia, coral; fonte Fraunces.
- **Advocacia:** papel timbrado sóbrio, monograma E&M; tinta, papel, verde-garrafa, latão; fonte Cormorant Garamond.
- **App:** nota fiscal de feira com itens que se riscam; verde-feira, limão, papel; fonte Space Grotesk.
- **Portfólio:** folha de contato de fotógrafo com marcações de caneta; fontes do sistema.

Todas as ilustrações são SVG próprios; as fontes são livres (SIL OFL) e auto-hospedadas. Nenhuma foto de terceiros.

## Pontos em aberto

- Herói do restaurante ocupa a primeira tela inteira no celular.
- Linha coral da clínica passa atrás de alguns textos.
- Carimbo do app sobrepõe o total do ticket (intencional).
- Pacotes e contato do portfólio usam nome e telefone provisórios — troque pelos seus antes de divulgar.
