# Lumen: a ideia e os próximos passos

## A ideia

**Lumen** é um app de celular para o público evangélico brasileiro. Em vez de rolar vídeos, a pessoa rola **versículos da Bíblia**, um por tela, com um visual escuro, dourado e minimalista e animações suaves.

A proposta é ocupar o lugar do "scroll" do dia a dia com algo que edifica. É uma rotina curta e diária de Palavra, oração e louvor, que a pessoa tem vontade de compartilhar.

### Para quem é
- **Público geral:** cristãos evangélicos que querem um momento diário com a Bíblia, rápido e bonito.
- **Líderes:** pastores, líderes de célula e professores de escola dominical, que precisam preparar mensagens. São o principal público do Premium.

### Princípios
- **Simples e minimalista:** o foco é o feed, e cada tela tem um propósito claro.
- **Textos bíblicos só de fonte confiável:** todo versículo vem da **Bíblia Livre (BLIVRE)**, CC BY 4.0. Nada é escrito de memória. O crédito fica num botão discreto na aba Você.
- **Linguagem acessível:** explicações que uma criança de 10–12 anos entenda.
- **App de celular primeiro:** web app hoje, app Android em seguida.

---

## O que o app tem hoje

### Abas (barra inferior em pílula)

| Aba | Para que serve |
|---|---|
| **Início** | O feed de versículos, que se adapta ao que a pessoa curte. |
| **Ouvir** | Player de louvores com biblioteca, ranking, playlists e fila. As faixas ainda são de demonstração. |
| **Premium** | Planos e ferramentas pagas, como o Púlpito. |
| **Você** | Dias seguidos, orações, **curtidos e salvos**, rotina, temas preferidos e "Sobre a Bíblia". |

### Funções que já funcionam
- **Feed:**
  - versículo do dia e contagem de dias seguidos;
  - curtir com um coração (ou dois toques), salvar, filtrar por tema;
  - recomendação pelo que a pessoa curte.
- **Ler capítulo:** abre o capítulo inteiro com o versículo destacado.
- **Oração guiada:** passo a passo, com respiração.
- **Busca:**
  - por referência, de vários jeitos ("João 3:16", "jo 3 16", "sl 23");
  - por palavra na Bíblia inteira.
- **Compartilhar:** imagem do versículo com a marca d'água do Lumen.
- **Funciona sem internet:** o app fica guardado no aparelho, e a Bíblia inteira pode ser baixada (~4 MB).
- **Púlpito (Premium):**
  - gera uma pregação com IA: passagens, contexto e palavras explicadas;
  - modo **Pregar**, para ler no celular durante a mensagem.
- **Monetização (ainda simulada):**
  - anúncio com recompensa: +15 min de louvor, +1 busca ou +1 compartilhamento;
  - limites diários no plano grátis;
  - tela do Premium.

### Qualidade técnica
- **Base do código:** Vite + TypeScript estrito e código em módulos.
- **Segurança:**
  - política de segurança (CSP) sem `unsafe-inline`;
  - todo texto é tratado como texto, nunca como código;
  - os dados salvos no aparelho e as respostas da IA são validados.
- **Testes automáticos de ponta a ponta:** telas, segurança e modo offline.
- **Divulgação:** página do app no GitHub Pages.

### O que ainda é demonstração
Músicas, anúncios, assinatura, a IA do Púlpito fora da prévia e os lembretes ("Em breve").

---

## Próximos passos

### 1. Conteúdo e limpeza (1–2 semanas)
- [x] **Ampliar o feed de 88 para 500–1.000 versículos.**
  - Todos tirados da BLIVRE e conferidos automaticamente com os arquivos da Bíblia.
  - É o item mais urgente: hoje a pessoa vê tudo em poucos dias.
  - Feito: **779 versículos** (15 temas, de 47 a 71 cada), montados por `npm run feed` (`feed/montar-feed.mjs`), que copia o texto da BLIVRE e recusa referências inválidas; exclusões da revisão em `feed/excluir.txt`.
- [x] **Revisar os limites do plano grátis.**
  - Compartilhamento: liberar ou subir para ~10 por dia, porque cada imagem compartilhada é propaganda grátis.
  - Busca: liberar a busca por referência e limitar só a busca por palavra.
- [x] **Esconder a aba Ouvir** até haver louvores reais. Enquanto isso, a barra fica com Início · Buscar · Premium · Você.
- [ ] **Reduzir os "Em breve"** para no máximo um ou dois. (Parcial: "Ouvir em voz alta" saiu do menu; faltam Lembretes e ferramentas do Premium.)
- [x] **Remover a opção "barra em cima/embaixo"**, mantendo só embaixo.
- [x] **Testes unitários com Vitest:**
  - referências bíblicas;
  - validações de segurança;
  - recomendação do feed;
  - conferência dos versículos do feed contra a BLIVRE.

### 2. App Android e teste fechado (2–3 semanas)
- [ ] Empacotar com **Capacitor** e gerar o app assinado.
- [ ] **Notificações locais:**
  - versículo do dia;
  - horário da oração;
  - lembrete de manter os dias seguidos.
- [ ] Criar a conta de desenvolvedor na Google Play (taxa única de US$ 25).
- [ ] **Teste fechado com 20–50 pessoas** (a Play exige 12+ testadores por 14 dias em contas novas).
- [ ] **Medir o uso:**
  - quantas pessoas voltam no dia seguinte (meta: 25–30%) e depois de 7 dias;
  - versículos compartilhados por pessoa.
- [ ] Coletar opiniões e ajustar.

### 3. Lançamento gratuito na Play Store
- [ ] **Página na loja:**
  - capturas de tela e vídeo curto;
  - política de privacidade, com o e-mail de contato preenchido.
- [ ] **Anúncios reais com AdMob:**
  - anúncio com recompensa;
  - cards de anúncio no feed, com poucos anúncios por sessão.
- [ ] **Reações** nos versículos ("Amém", "🙏 Orando", "Me tocou"), com um servidor simples (Firebase ou Supabase).
- [ ] **Começar a divulgação aberta:**
  - Instagram e TikTok com os próprios versículos;
  - grupos de igrejas no WhatsApp;
  - as imagens compartilhadas pelos usuários.

### 4. Premium de verdade
- [ ] **Assinatura pela Google Play:**
  - mensal e anual com desconto;
  - **7 dias de teste grátis**.
- [ ] **Púlpito com IA ligado a um servidor próprio:**
  - a chave da IA nunca fica no app;
  - limite de uso por assinante.
- [ ] **Uma pregação com IA por mês no plano grátis**, como degustação.
- [ ] **Benefícios do Premium:**
  - sem anúncios;
  - busca por palavra ilimitada;
  - temas visuais extras para as imagens.
- [ ] **Louvores originais.** É a parte mais cara e demorada:
  - produção e licenças;
  - streaming e cache offline.

### 5. Depois do lançamento
- [ ] **Contas de usuário:** login com Google, para guardar curtidos, salvos e dias seguidos na nuvem.
- [ ] **Comentários nos versículos, com moderação:**
  - filtro automático de ofensas;
  - botão "denunciar";
  - bloqueio de usuários.
- [ ] **Planos de leitura:** 7 dias sobre ansiedade, 30 dias nos Salmos, etc.
- [ ] **Ouvir os versículos em voz alta.**
- [ ] **Versão para iPhone (App Store).**

---

## Quando divulgar

| Momento | Tipo de divulgação |
|---|---|
| **Agora** | Só amigos e a igreja, para colher opiniões. A página do GitHub Pages serve como "em breve". |
| **Depois do passo 3** | Divulgação aberta, se o teste fechado mostrar 25–30% das pessoas voltando no dia seguinte. |
| **Depois do passo 4** | Divulgação vendendo o Premium, com foco em pastores e líderes. |

**Regra principal:** não vender o Premium antes de ele existir de verdade. Promessas não cumpridas viram avaliações ruins na loja.
