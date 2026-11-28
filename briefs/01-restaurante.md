Crie um site estático (HTML + CSS + JS mínimo, sem frameworks, sem CDN, sem fontes externas) para uma lanchonete FICTÍCIA.
Arquivos: index.html, style.css, app.js, sitemap.xml, robots.txt, og.svg, e ilustrações SVG próprias em img/ (cada lanche desenhado em SVG plano, estilo sticker, viewBox 0 0 240 180).

Marca: "Brasa do Zé — Lanches na Chapa" (inventada). Endereço: Rua dos Exemplos, 000 — Bairro Fictício, Cidade Modelo/UF. Telefone/WhatsApp: (00) 90000-0000 → wa.me/5500900000000. CNPJ 00.000.000/0000-00.
Identidade (siga exatamente): conceito "placa de chapa de lanchonete de rua com letreiro pintado à mão".
Paleta: carvão #1F1B18 (texto), mostarda #F2B705 (fundo do herói/placas), tomate #B3261E (CTA, texto branco), papel #FFF8E7 (fundo), alface #2E6B3A (detalhes). Contraste ≥4,5:1 em todo texto (nunca texto branco sobre mostarda).
Fontes: pilha de sistema; títulos com font-family "Impact, 'Arial Narrow Bold', sans-serif" condensado, sem caixa-alta forçada em rótulos. Corpo: system-ui.
Evitar: gradientes, cards idênticos com sombra cinza, emojis como ícones, eyebrows em caixa-alta, setas → em botões.

Seções: 1) herói como letreiro mostarda com o nome grande e um CTA "Pedir pelo WhatsApp"; 2) cardápio em formato de "quadro de preços" (lista com linha pontilhada entre nome e preço, R$), 3 categorias (Lanches, Porções, Bebidas), 9 itens com ilustração SVG nos lanches; cada item tem botão "Adicionar" e um carrinho fixo no rodapé móvel que monta a mensagem e abre wa.me com o texto do pedido (encodeURIComponent); 3) horário (tabela semântica) com indicador "aberto agora/fechado" calculado em JS; 4) mapa: NÃO use iframe do Google; use um SVG de mapa estilizado fictício + link "Ver no Google Maps" para https://www.google.com/maps/search/?api=1&query=Cidade+Modelo e link "Avaliações no Google" (href="#" com aria-label explicando que é demonstração); 5) rodapé com selo visível "Projeto conceitual — dados fictícios" e o CNPJ falso.

Requisitos: mobile-first, sem rolagem horizontal em 360px, alvos de toque ≥44px, foco visível (outline 3px), skip-link, navegação por teclado, aria-live no carrinho, prefers-reduced-motion respeitado, H1 único, lang="pt-BR", meta description, Open Graph (og:image og.svg relativo), canonical relativo omitido, JSON-LD Restaurant com servesCuisine, openingHoursSpecification, menu, priceRange. Todas as <img> com width/height, alt, loading="lazy" (exceto a do herói). CSS inline crítico não é necessário; um único style.css pequeno. Lighthouse mobile ≥90 em tudo.
Responda apenas com blocos ===FILE: caminho=== ... ===END===.
