Crie uma página única de portfólio estática (HTML + CSS, JS mínimo, sem frameworks, sem CDN, sem fontes externas — use system-ui e, para títulos, uma pilha serifada do sistema: Georgia, "Times New Roman", serif em peso 700).
Arquivos: index.html, style.css, sitemap.xml, robots.txt, og.svg, img/favicon.svg. As imagens img/restaurante.webp, img/clinica.webp, img/advocacia.webp, img/app.webp JÁ EXISTEM (390x760) — use com width="390" height="760", loading="lazy" (exceto a primeira), alt descritivo.

Autor fictício: "Estúdio Rascunho — sites para pequenos negócios" (nome provisório, inventado). Contato: WhatsApp (00) 90000-0009 → wa.me/5500900000009, e-mail ola@rascunho.invalid.
Conceito visual: "mesa de luz / folha de contato de fotógrafo": as 4 capturas aparecem como provas em uma folha de contato, com marcações de lápis (círculo SVG desenhado à mão em volta da nota Lighthouse), fundo cinza-quente #EDEBE6, tinta #1A1A1A, marcador vermelho #B42318 (só marcações e texto ≥ 18px bold), azul-caneta #1D4ED8 para links (contraste ok sobre o fundo). Evitar: gradientes, gradiente roxo, cards iguais com sombra, emojis, eyebrows caixa-alta, setas →.

Seções:
1) herói: H1 "Sites rápidos e acessíveis para pequenos negócios", subtítulo curto, CTA "Pedir orçamento pelo WhatsApp".
2) Trabalhos (4 projetos conceituais), cada um com captura, nome, nicho, 1 frase da ideia visual, notas Lighthouse mobile (Performance 100 · Acessibilidade 100 · Boas práticas 100 · SEO 100 — todos os 4 tiraram 100) e link "Ver o site" para ../restaurante/, ../clinica/, ../advocacia/, ../app/:
   - Brasa do Zé — lanchonete — letreiro pintado de chapa de rua, cardápio em quadro de preços e pedido pelo WhatsApp.
   - Movimento Pleno — clínica de fisioterapia — a linha contínua do movimento atravessando a página.
   - Exemplo & Modelo Advogados — escritório de advocacia — papel timbrado sóbrio, dentro das regras de publicidade da OAB.
   - Feira — landing page de app — nota fiscal de feira com itens que se riscam sozinhos.
   Deixe claro que são projetos conceituais com dados fictícios.
3) Pacotes com preços de lançamento (lista/tabela legível em 360px, não cards idênticos): Landing page R$ 600 · Site institucional R$ 1.400 · Perfil no Google (Google Business Profile) R$ 350 · Gestão de Instagram R$ 600/mês · Correção de WordPress a partir de R$ 150. Uma linha descritiva curta por pacote. Nota "preços de lançamento, sujeitos a alteração".
4) Contato: WhatsApp, e-mail, e formulário (nome, contato, pacote de interesse select, mensagem) com <label>s; ao enviar NÃO envia: mensagem de demonstração em aria-live.
5) rodapé com selo "Projeto conceitual — dados fictícios".

Requisitos: mobile-first, sem rolagem horizontal em 360px, alvos ≥44px, foco visível 3px, skip-link, teclado, prefers-reduced-motion, H1 único, lang pt-BR, meta description, Open Graph (og.svg), JSON-LD "ProfessionalService" com makesOffer (Offer em BRL para cada pacote). Lighthouse mobile ≥90.
Entregue TODOS os arquivos listados, completos (o JS, se houver, inline no fim do body). Responda apenas com blocos ===FILE: caminho=== conteúdo ===END===, sem cercas de código.
