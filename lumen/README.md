# Lumen

App de versículos da Bíblia em formato de feed vertical, para o público evangélico brasileiro. Tem oração guiada, leitura dos capítulos sem internet, Púlpito com modo Pregar e uma prévia da aba Ouvir.

Esta pasta é o código de produção, organizado em módulos com Vite + TypeScript. O arquivo `../versiculo-scroll/prototipo.html` foi a versão de protótipo e fica só como referência histórica: **as mudanças agora são feitas aqui**.

## Comandos

```bash
npm install
npm run dev            # servidor local com recarregamento automático
npm run typecheck      # confere os tipos (TypeScript)
npm run build          # gera dist/index.html (arquivo único, com CSP) + dist/biblia
npm test               # tipagem + build + roteiro de telas + segurança (Playwright)
npm run test:flows     # build + roteiro por todas as telas
npm run test:security  # build + testes de segurança
npm run build:preview  # build + dist-preview/lumen.html, a página usada na prévia publicada
```

Requer Node 20 ou mais novo.

## Estrutura

```
index.html                 marcação das telas (feed, folhas, telas cheias, barra de navegação)
public/biblia/             Bíblia Livre (BLIVRE): livros.json + um arquivo por livro em blivre/
docs/CATALOGO-BIBLIA.md    versões avaliadas, licença, crédito e correções feitas no texto
src/
├── main.ts                ponto de entrada: liga os eventos e inicia o feed, nesta ordem
├── types.ts               tipos centrais (versículo, livro, música, pregação…)
├── config/features.ts     chaves de funções: o que está ligado e o que aparece como "Em breve"
├── core/
│   ├── state.ts           estado compartilhado (store.<chave>), lido e alterado pelos módulos
│   └── persist.ts         grava curtidas, salvos e gostos no aparelho
├── data/
│   ├── versiculos-feed.json   88 versículos conferidos (fonte da verdade do feed)
│   ├── verses.ts          carrega o JSON acima no formato do feed
│   └── themes.ts          temas vizinhos e opções de humor
├── services/
│   ├── storage.ts         armazenamento local seguro (nunca lança erro, valida o tipo salvo)
│   ├── bible.ts           referências ("1 Pedro 5:7") e carregamento dos livros sob demanda
│   └── audio-engine.ts    trilhas de demonstração geradas no navegador
├── security/              validação dos dados salvos e da resposta da IA (ver SECURITY.md)
├── ui/                    peças reutilizáveis: ícones, folhas, avisos, arrastar, "Em breve"
├── utils/                 html seguro (html``), formatação, texto e área de transferência
├── app/navigation.ts      barra de navegação e troca de abas
├── features/              uma pasta por função
│   ├── feed/              feed, cards, recomendação, filtro por tema, menu do versículo
│   ├── daily/             versículo do dia e sequência de dias
│   ├── bible/             leitura do capítulo
│   ├── share/             imagem para Stories e WhatsApp
│   ├── prayer/            oração guiada com respiração
│   ├── pulpit/            Púlpito, exemplo pronto e modo Pregar
│   ├── music/             catálogo, reprodução, biblioteca, Tocando agora, mini player
│   ├── premium/           tela Premium
│   ├── monetization/      anúncios e recompensas (desligados; ver config/features.ts)
│   ├── onboarding/        "Como está seu coração hoje?"
│   └── profile/           aba Você e "Sobre a Bíblia"
└── styles/                CSS dividido por área; index.css define a ordem da cascata
```

## Convenções

- **Uma função, uma pasta.** Uma função nova vai para `src/features/<nome>/`. O que for usado por mais de uma função vai para `ui/`, `services/` ou `utils/`.
- **Estado compartilhado só em `core/state.ts`.** Os módulos leem e alteram `store.<chave>`. O que precisa durar entre sessões é gravado com `S.set` (`services/storage.ts`), sempre com o prefixo `lumen.`.
- **Funções ainda não prontas** aparecem como "Em breve" e são ligadas em `config/features.ts`.
- **Textos bíblicos só da Bíblia Livre.** Nada de versículo escrito de memória. Para mudar o feed, edite `data/versiculos-feed.json` com textos tirados de `public/biblia`.
- **Segurança:** todo HTML é montado com o template `html``` e inserido com `setHTML()`, sem atributo `style` (use `data-style`) (`utils/html.ts`), e tudo o que é lido do aparelho passa por `security/validate.ts`. Regras completas em [SECURITY.md](SECURITY.md).
- **IDs únicos.** Cada botão tem um `id` exclusivo no app inteiro. Telas diferentes não reaproveitam o mesmo `id`.

## Tipagem

Todo o código é TypeScript estrito (`strict: true`), sem `@ts-nocheck`. `npm run typecheck` precisa passar sem erros antes de qualquer commit. O DOM é acessado por `byId`, `q` e `qa` (`utils/dom.ts`), que avisam com clareza quando um elemento obrigatório não existe; para elementos opcionais existem `byIdMaybe` e `qMaybe`.

## Próximas etapas

1. ~~Segurança~~ (feito: ver SECURITY.md).
2. **Offline e desempenho:** service worker, carregamento sob demanda de Ouvir e Púlpito, feed com quantidade limitada de cards na memória.
3. **Testes:** já existem o roteiro de telas e os testes de segurança (Playwright). Faltam testes unitários (Vitest) para referências, recomendação, fila e formatação, e um teste que confere os versículos do feed contra a Bíblia.
4. **Android:** Capacitor, ajustes de segurança do Android e geração do pacote para a Play Store.

## Offline e desempenho
- **Sem internet:** o service worker (`sw/sw.js`, gerado em `dist/sw.js` por `scripts/build-sw.mjs`) guarda o app na instalação. Cada livro da Bíblia lido fica guardado; na aba Você, "Bíblia sem internet" baixa os 66 livros (~4 MB).
- **Carregamento sob demanda:** o Púlpito e o compartilhar só são baixados quando abertos (`src/app/lazy.ts`).
- **Memória do feed:** no máximo 24 cards no DOM; os antigos são removidos sem mover a tela (`trimFeed` em `features/feed/feed.ts`).
- Teste: `npm run test:offline`.
