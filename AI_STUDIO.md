# Escritório de Agentes IA para o Google AI Studio

Escritório 3D low poly em que agentes constroem um site, feito para a feira de ciências. Este guia explica como levar o projeto para o Google AI Studio e ligar o modo online à API do Gemini de lá.

## O que o projeto é

- Três.js (r160) em módulos ES, **sem build**: tudo em arquivos estáticos (`index.html` + `src/`).
- Funciona **100% offline** com 4 cenários prontos (Lanchonete, Pet Shop, Escola, Banda). Não precisa de chave para isso.
- O **modo online** gera um cenário novo a partir de um pedido digitado ("um site para minha loja de skates"). Ele chama uma função de IA que o AI Studio fornece (ver "Ligar o Gemini").
- Telão com o site sendo construído (toque para tela cheia), quadro de tarefas, quiz IA × roteiro, modo apresentação em loop, layout para celular na horizontal.

## Como usar no AI Studio

A interface do AI Studio muda com frequência, então confira as opções que aparecem na sua tela. O caminho geral:

1. Abra <https://aistudio.google.com> e entre na seção **Build** (criar app).
2. Crie um app novo. Se houver a opção de importar/enviar arquivos, envie o conteúdo do zip `escritorio-agentes-ai-studio.zip` (já extraído). Se não houver, cole o prompt da próxima seção e anexe os arquivos de `src/` e o `index.html`.
3. Peça ao AI Studio para ligar o modo online com a função `window.ESCRITORIO_IA` (código em "Ligar o Gemini").
4. Teste: abra o app, toque em **✨ Pedir um site**, escolha uma sugestão ou digite um pedido e toque em **Gerar com IA**.

### Prompt pronto para colar no AI Studio

```text
Tenho um app web estático chamado "Escritório de Agentes IA" (Three.js r160 em módulos ES, sem build,
index.html + pasta src/). Mantenha a estrutura de arquivos e o visual como estão.

Tarefa: ligar o modo online à API do Gemini.
1. O app chama window.ESCRITORIO_IA(prompt) quando existe. Defina essa função assim (chave SOMENTE pelo
   ambiente do AI Studio, nunca escrita em arquivo):

     import { GoogleGenAI } from '@google/genai';
     const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
     window.ESCRITORIO_IA = async (prompt) => {
       const r = await ai.models.generateContent({
         model: 'gemini-2.5-flash', contents: prompt,
         config: { responseMimeType: 'application/json' },
       });
       return r.text;   // o app valida e limpa o JSON recebido
     };

2. Não altere src/engine/validate.js (valida o cenário e remove scripts) nem o texto do aviso de privacidade.
3. O app deve continuar funcionando offline (sem a função, o botão "Pedir um site" avisa que a IA está indisponível).
4. Layout para celular na horizontal é requisito: não quebre as regras @media (max-height: 520px).
```

## Ligar o Gemini (como funciona)

`src/ui/online.js` escolhe a fonte de IA nesta ordem:

| Ordem | Fonte | Quando |
| --- | --- | --- |
| 1 | `gemini` | existe `window.ESCRITORIO_IA` (AI Studio) |
| 2 | `servidor` | `npm start` com `DEEPSEEK_API_KEY` no ambiente |
| 3 | `claude` | artefato publicado no Claude |

O app envia um prompt com um cenário de exemplo e o pedido, e espera de volta **um JSON** no mesmo formato. `src/engine/validate.js` confere o formato (12 etapas, agentes permitidos, última etapa "entrega") e remove `<script>`, `onclick=` e `javascript:` do HTML. O site aparece num `<iframe sandbox>` sem scripts.

Modelo e tempo medidos: **gemini-2.5-flash gerou um cenário válido em cerca de 23 s** (≈2,5 mil tokens de resposta, ≈2,3 mil de entrada). Esse teste foi feito com o mesmo prompt chamando a API do Gemini diretamente, **fora do AI Studio**: a ligação dentro do AI Studio em si eu não testei.

## Segurança e privacidade

- **Nunca escreva a chave da API em nenhum arquivo** nem em prompts. No AI Studio ela vem do ambiente (`process.env.GEMINI_API_KEY`).
- Se você publicar o app para outras pessoas, o código que roda no navegador pode expor a chave. Para a feira, use o app só na sua conta, ou coloque a chamada atrás de um servidor.
- O pedido digitado vai para o Gemini. A tela de pedido avisa para **não escrever nomes, telefones ou endereços**. Numa feira com público, fique de olho no que é digitado.
- A chave do Gemini, se for usada, não deve ser compartilhada em conversas, commits ou capturas de tela.

## Arquivos

```
index.html                 página e estrutura
src/main.js                cena, laço principal, botões, fluxo do pedido online
src/scene/office.js        escritório 3D, mesas, telão, quadro
src/scene/agentModel.js    bonecos (4 IA + 3 roteiro)
src/scene/kanban.js        quadro de tarefas animado
src/engine/clock.js        relógio da simulação (pausar, velocidade)
src/engine/director.js     etapas, falas, desvio entre bonecos
src/engine/nav.js          rotas sem atravessar móveis (A*)
src/engine/validate.js     valida e limpa cenários de IA
src/ui/online.js           fontes de IA (gancho do AI Studio)
src/ui/telao.js, quiz.js, rotulos.js, controls.js (+ .css)
src/data/scenarios/*.json  cenários prontos
src/data/botLines.json     falas dos bonecos de roteiro
roteiro.html               roteiro do apresentador, uma página A4 por cenário
server.js                  servidor opcional (modo online com DeepSeek)
tests/                     14 testes (npm test)
```

## Atalhos

Espaço pausa · ← → etapa anterior/próxima · 1–4 velocidade · R reinicia · P modo apresentação (loop dos 4 cenários) · G gira a câmera · toque no telão para tela cheia.

## Rodar fora do AI Studio

- Offline: `python3 -m http.server 8000` na pasta e abra `localhost:8000`.
- Testes: `npm test` (14 testes).
