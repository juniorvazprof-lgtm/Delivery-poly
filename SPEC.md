# Escritório de Agentes IA — Especificação para o Claude Code

Visualização 3D low poly de um escritório virtual onde 10 agentes produzem um site simples, do pedido do cliente até a página pronta. Feita para uma **feira de ciências do ensino médio**: o público só **assiste**, e os alunos **explicam** o processo. Não há interação do público com os agentes.

---

## 1. Objetivos

1. Mostrar, de forma visual e simples, como vários agentes de IA dividem uma tarefa e colaboram.
2. Mostrar a diferença entre **agentes de IA** (que pensam) e **bots roteirizados** (que seguem um script).
3. Dar ao aluno-apresentador controles e um painel-guia que ele entenda em 2 segundos.
4. Rodar **100% offline** por padrão. Usar o **modo online** (DeepSeek) só quando quiser fazer 2 ou 3 demonstrações ao vivo.

## 2. Stack

- **Front-end:** HTML + JavaScript (ES modules) + **Three.js** (low poly, sem modelos externos; tudo com primitivas: caixas, cilindros, cones).
- **Build:** Vite (opcional). Também precisa funcionar abrindo o `index.html` por um servidor local simples.
- **Proxy da API (só modo online):** Node.js + Express, um único arquivo `server.js`. A chave **nunca** fica no navegador.
- Tela-alvo: notebook ou TV em paisagem (1920×1080). Deve continuar funcional em 1366×768.

## 3. Estrutura de pastas

```
escritorio-agentes/
├── index.html
├── src/
│   ├── main.js            # inicialização, loop de animação
│   ├── scene/
│   │   ├── office.js      # chão, paredes, mesas, café, sala de reunião, telão, kanban
│   │   ├── agentModel.js  # boneco low poly (corpo, cabeça, etiqueta, balão)
│   │   └── camera.js      # câmera isométrica + "focar no agente ativo"
│   ├── engine/
│   │   ├── director.js    # DIRETOR OCULTO: executa a linha do tempo
│   │   ├── clock.js       # relógio da simulação (pausa / velocidade)
│   │   ├── botScript.js   # rotinas aleatórias dos 6 bots
│   │   └── pipeline.js    # máquina de estados das etapas do projeto
│   ├── ai/
│   │   ├── offlineProvider.js  # lê cenários prontos (JSON)
│   │   ├── onlineProvider.js   # chama /api/agent no proxy local
│   │   └── prompts.js          # prompts de sistema de cada agente IA
│   ├── ui/
│   │   ├── controls.js    # play/pause, velocidade, próxima etapa, reiniciar
│   │   ├── guidePanel.js  # painel do aluno-apresentador
│   │   ├── screenSite.js  # telão que renderiza o site sendo montado
│   │   ├── kanban.js      # quadro A fazer / Fazendo / Feito
│   │   └── tokenMeter.js  # contador de tokens e custo
│   └── data/
│       ├── scenarios/
│       │   ├── lanchonete.json
│       │   ├── pizzaria.json
│       │   └── barbearia.json
│       └── botLines.json  # falas dos bots
└── server/
    ├── server.js          # proxy para a DeepSeek
    └── .env.example       # DEEPSEEK_API_KEY=
```

## 4. Os 10 agentes

| # | Nome | Tipo | Papel | Cor da etiqueta |
|---|------|------|-------|-----------------|
| 1 | Gerente | **IA** | Divide o pedido em tarefas | Azul |
| 2 | Designer | **IA** | Define cores, título e estilo | Roxo |
| 3 | Programador | **IA** | Escreve o HTML de cada seção | Verde |
| 4 | Revisor | **IA** | Aprova ou devolve com 1 correção | Laranja |
| 5 | Cliente | Bot | Chega com o pedido e vai embora no fim | Cinza |
| 6 | Estagiário | Bot | Leva papéis entre as mesas | Cinza |
| 7 | Recepcionista | Bot | Atende o cliente na entrada | Cinza |
| 8 | Suporte | Bot | Digita, vai ao café | Cinza |
| 9 | Analista | Bot | Fica em reunião, digita | Cinza |
| 10 | Faxineiro / Copeiro | Bot | Circula pelo escritório | Cinza |

- **Diretor oculto:** não tem corpo. É o `director.js`, que move os bots, sorteia falas e dispara as etapas.
- Etiqueta acima da cabeça: **"IA"** (colorida, com brilho) ou **"ROTEIRO"** (cinza). Isso é central na explicação.
- O agente ativo ganha um anel luminoso no chão, e a câmera pode segui-lo (toggle).

## 5. Cena 3D (layout)

```
+------------------------------------------------------+
|  [TELÃO: site sendo montado]      [KANBAN na parede] |
|                                                      |
|   Mesa Gerente    Mesa Designer   Mesa Programador   |
|                                                      |
|   Mesa Revisor    Mesa Analista   Mesa Suporte       |
|                                                      |
|  Sala de reunião        Copa/café       Recepção ->  |
+------------------------------------------------------+
```

- Câmera isométrica fixa por padrão, com leve rotação automática opcional.
- Paleta clara e amigável: chão bege, paredes off-white, mesas de madeira clara, sombras suaves.
- Animações simples: andar (balançar o corpo), digitar (braços sobem e descem), pensar (três pontinhos no balão).
- **Papel voando** entre as mesas quando uma tarefa passa de um agente para outro. Essa é a visualização do "handoff".

## 6. Pipeline (máquina de estados)

Cada cenário passa por estas etapas. O `pipeline.js` controla a etapa atual.

| Etapa | Quem age | O que aparece na tela | Texto do painel-guia |
|-------|----------|----------------------|----------------------|
| 0. PEDIDO | Cliente (bot) + Recepcionista | Cliente entra, balão com o pedido | "Um cliente pediu um site. Ninguém sabe fazer tudo sozinho." |
| 1. PLANEJAR | Gerente (IA) | Cartões aparecem no kanban em "A fazer" | "O Gerente é uma IA. Ele quebra o pedido em tarefas menores." |
| 2. DESIGN | Designer (IA) | Paleta e título surgem no telão | "A Designer escolhe cores e o nome que aparece no topo do site." |
| 3. CODAR | Programador (IA) | Código digitando num monitor, seção aparece no telão | "O Programador escreve o código de UMA parte por vez." |
| 4. REVISAR | Revisor (IA) | Selo ✅ ou ↩️ sobre a seção | "O Revisor confere. Se achar erro, devolve para o Programador." |
| (loop 3↔4) | — | Repete para cada seção (topo, cardápio, contato) | "Esse vai e volta é como as IAs se corrigem." |
| 5. ENTREGA | Gerente + Cliente | Site completo no telão, confete, cliente sai feliz | "Pronto! Quatro IAs e seis bots fizeram o site juntos." |
| 6. PAUSA | — | 5 s de intervalo, depois o próximo cenário | — |

Regra didática: **o roteiro deve ter pelo menos 1 devolução do Revisor** por cenário, para mostrar a correção.

## 7. Controles do aluno-apresentador

Barra fixa no rodapé, botões grandes:

- ⏯ **Play / Pausa** (tecla Espaço)
- 🐢 **Velocidade:** 0,25× · 0,5× · 1× · 2× (teclas 1 a 4)
- ⏭ **Próxima etapa** (tecla →): pula direto para o início da próxima etapa
- ⏮ **Etapa anterior** (tecla ←)
- 🔄 **Reiniciar cenário** (tecla R)
- 📂 **Cenário:** Lanchonete / Pizzaria / Barbearia
- 🌐 **Modo:** Offline (padrão) / Online, com indicador colorido de status
- 🎥 **Seguir agente ativo** (on/off)

Todos os tempos da simulação passam por `clock.js` (`dt * velocidade`, e `0` quando pausado). Nada pode usar `setTimeout` com tempo real.

## 8. Painel-guia (lado direito)

Feito para o aluno bater o olho e explicar:

```
┌─────────────────────────────┐
│ ETAPA 3 de 5  ▓▓▓▓▓▓░░░░    │
│ 💻 CODAR                    │
│                             │
│ Quem está trabalhando:      │
│ 🟢 Programador  [IA]        │
│                             │
│ Explique assim:             │
│ "O Programador escreve o    │
│  código de UMA parte por    │
│  vez."                      │
│                             │
│ Pergunta para o público:    │
│ "Por que não fazer tudo     │
│  de uma vez?"               │
│                             │
│ Último pensamento da IA:    │
│ > Criando seção cardápio... │
│                             │
│ Tokens: 1.240 · US$ 0,0003  │
└─────────────────────────────┘
```

- Fonte grande (mínimo 20 px no texto "Explique assim").
- Cada etapa tem `explicacao` (1 frase) e `perguntaPublico` (1 pergunta), definidas no JSON do cenário.
- Uma legenda fixa no topo: 🟦 IA = pensa e decide · ⬜ ROTEIRO = segue script pronto.

## 9. Formato do cenário offline (JSON)

Tudo pré-gravado, inclusive o HTML final. O modo offline **nunca** depende de internet.

```json
{
  "id": "lanchonete",
  "pedido": "Quero um site para minha lanchonete, a Sabor do Sertão.",
  "etapas": [
    {
      "id": "planejar",
      "agente": "gerente",
      "duracao": 6,
      "explicacao": "O Gerente quebra o pedido em tarefas menores.",
      "perguntaPublico": "Como vocês dividiriam esse trabalho?",
      "pensamento": "Vou dividir em: topo, cardápio e contato.",
      "saida": { "tarefas": ["Topo com nome", "Cardápio", "Contato"] }
    },
    {
      "id": "design",
      "agente": "designer",
      "duracao": 5,
      "explicacao": "A Designer escolhe cores e título.",
      "perguntaPublico": "Que cores combinam com comida?",
      "pensamento": "Laranja e marrom lembram comida caseira.",
      "saida": { "cores": ["#E8742C", "#5A3A22", "#FFF4E6"], "titulo": "Sabor do Sertão" }
    },
    {
      "id": "codar",
      "agente": "programador",
      "secao": "cardapio",
      "duracao": 7,
      "pensamento": "Vou listar os 4 lanches mais pedidos.",
      "saida": { "html": "<section class='cardapio'>...</section>" }
    },
    {
      "id": "revisar",
      "agente": "revisor",
      "secao": "cardapio",
      "duracao": 4,
      "pensamento": "Faltou o preço do cuscuz.",
      "saida": { "aprovado": false, "correcao": "Adicionar preço do cuscuz." }
    }
  ],
  "htmlFinal": "<!-- site completo pronto -->"
}
```

Os bots usam `botLines.json` (ex.: "Alguém viu meu grampeador?", "Café acabou de novo!", "Reunião às 15h."). O diretor sorteia uma fala a cada 6 a 12 s (tempo da simulação) e move o bot para um ponto de interesse (café, reunião, mesa de alguém).

## 10. Modo online (DeepSeek)

### 10.1 Arquitetura

```
Navegador (onlineProvider.js)
   │  POST http://localhost:3000/api/agent  { agente, entrada }
   ▼
server.js (Node/Express)  ← lê DEEPSEEK_API_KEY do .env
   │  POST https://api.deepseek.com/chat/completions
   ▼
DeepSeek (modelo flash)
```

- A chave fica só no `.env` do notebook. Nunca vai para o front-end nem para o GitHub (`.gitignore` com `.env`).
- O proxy aplica: limite de **30 chamadas por sessão** e **1 chamada por vez** (fila).
- Se a chamada falhar ou demorar mais de 15 s → o front-end **troca sozinho para a resposta offline** daquela etapa e mostra um aviso discreto ("usando resposta gravada").

### 10.2 Chamada à API (server.js)

A API da DeepSeek é compatível com o formato da OpenAI.

```js
// server.js
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());
app.use(express.static('..')); // serve o front-end

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
let callsThisSession = 0;
const MAX_CALLS = 30;

app.post('/api/agent', async (req, res) => {
  if (callsThisSession >= MAX_CALLS) {
    return res.status(429).json({ error: 'limite da sessão atingido' });
  }
  callsThisSession++;

  const { system, user, maxTokens = 120 } = req.body;

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        stream: false
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await r.json();
    res.json({
      content: data.choices?.[0]?.message?.content ?? '{}',
      usage: data.usage // prompt_tokens, completion_tokens, prompt_cache_hit_tokens
    });
  } catch (e) {
    res.status(502).json({ error: 'falha na DeepSeek', detail: String(e) });
  }
});

app.listen(3000, () => console.log('Escritório em http://localhost:3000'));
```

> Nota: o modelo atual da DeepSeek é o **V4.1 Flash** (nome `deepseek-flash`). Os nomes antigos (`deepseek-v4-flash`) são redirecionados para ele. Deixe o nome configurável no `.env` e confira a documentação oficial antes da feira: https://api-docs.deepseek.com

### 10.3 Prompts dos agentes (prompts.js)

Prompts curtos e **fixos** (iguais em toda chamada, o que ajuda o cache da DeepSeek a baratear a entrada). Sempre pedir **JSON** e respostas curtas.

```js
export const PROMPTS = {
  gerente: {
    maxTokens: 100,
    system: `Você é o Gerente de um pequeno escritório que cria sites simples.
Divida o pedido em EXATAMENTE 3 tarefas curtas (topo, conteúdo principal, contato).
Responda só em JSON: {"pensamento":"<frase curta>","tarefas":["...","...","..."]}`
  },
  designer: {
    maxTokens: 80,
    system: `Você é a Designer. Escolha 3 cores hex e um título curto para o site.
Responda só em JSON: {"pensamento":"<frase curta>","cores":["#..","#..","#.."],"titulo":"..."}`
  },
  programador: {
    maxTokens: 250,
    system: `Você é o Programador. Escreva UMA seção HTML simples (sem <html>, sem <script>),
usando as classes: topo, cardapio, contato. No máximo 12 linhas.
Responda só em JSON: {"pensamento":"<frase curta>","html":"<section>...</section>"}`
  },
  revisor: {
    maxTokens: 60,
    system: `Você é o Revisor. Analise a seção HTML recebida.
Se estiver ok, aprove. Se faltar algo óbvio, peça UMA correção curta.
Responda só em JSON: {"pensamento":"<frase curta>","aprovado":true|false,"correcao":"..."}`
  }
};
```

Mensagem do usuário montada pelo `onlineProvider.js`, com o mínimo de contexto:

```js
// exemplo para o programador
user: JSON.stringify({
  pedido: cenario.pedido,
  tarefa: 'Cardápio',
  cores: estado.cores,
  correcaoAnterior: estado.correcao || null
})
```

### 10.4 Segurança do HTML gerado

- Antes de mostrar no telão, **sanitizar** o HTML: remover `<script>`, `on*=`, `<iframe>` e `javascript:`. Pode usar DOMPurify (CDN) ou um filtro simples.
- Renderizar o telão num `<iframe sandbox>` usando `srcdoc`, ou como textura (html → canvas). O mais simples é sobrepor um `iframe` 2D posicionado sobre o telão 3D.

### 10.5 Orçamento de tokens (por site)

| Agente | Chamadas | Entrada aprox. | Saída máx. |
|--------|---------|----------------|------------|
| Gerente | 1 | 150 | 100 |
| Designer | 1 | 150 | 80 |
| Programador | 3–4 | 250 cada | 250 cada |
| Revisor | 3–4 | 300 cada | 60 cada |
| **Total** | **~9** | **~2.200** | **~1.500** |

O custo fica bem abaixo de 1 centavo de dólar por site. O `tokenMeter.js` soma `usage` de cada resposta e mostra o total na tela (preço por milhão configurável).

## 11. Interface comum dos provedores

Offline e online implementam a mesma interface, e o `director.js` não sabe qual está usando:

```js
// provider.runStep(etapa, estado) -> Promise<{ pensamento, saida, usage? }>
```

- **Offline:** devolve `etapa.pensamento` e `etapa.saida` do JSON, depois de `etapa.duracao` segundos de simulação.
- **Online:** chama `/api/agent`. Enquanto espera, o agente mostra "pensando…" no balão. Se falhar, usa o offline da mesma etapa.
- No modo online, **os bots continuam roteirizados**. Só os 4 agentes IA chamam a API.

## 12. Critérios de aceite

1. Abre e roda o cenário Lanchonete completo, **sem internet**, em menos de 3 minutos a 1×.
2. Pausa congela tudo (bots, agentes, papéis voando, telão). Velocidade 0,25× fica visivelmente lenta e fluida.
3. "Próxima etapa" funciona em qualquer momento sem quebrar o estado.
4. Painel-guia sempre mostra a etapa, quem está agindo, a frase de explicação e a pergunta para o público.
5. Etiquetas IA / ROTEIRO visíveis de qualquer ângulo da câmera.
6. Pelo menos uma devolução do Revisor aparece em cada cenário.
7. Modo online: 1 site completo gerado ao vivo com no máximo 12 chamadas; com a internet desligada no meio, o sistema cai para o offline sem travar.
8. A chave da API não aparece em nenhum arquivo do front-end.
9. Roda a 60 fps num notebook comum (sem sombras pesadas; no máximo ~3 mil polígonos por agente).

## 13. Ordem sugerida de implementação

1. Cena 3D estática (escritório + 10 bonecos + etiquetas).
2. `clock.js` + controles (pausa e velocidade) funcionando com uma animação simples.
3. Bots andando com o diretor oculto e falas sorteadas.
4. Pipeline offline com o cenário Lanchonete, kanban e telão.
5. Painel-guia.
6. Cenários Pizzaria e Barbearia.
7. Proxy `server.js` + modo online + fallback.
8. Contador de tokens e polimento visual (papel voando, confete, anel do agente ativo).
