# Pine Hollow · Etapa 1 — especificação (escrita pelo orquestrador)

Jogo: survival horror em pixel art (Three.js r160, módulos ES sem build, pasta `cabanas/`).
Esta etapa troca o "extraction shooter" por: ciclo de dia/noite, abrigos com salvamento, inventário de 8 espaços,
munição rara, textos em inglês com opção de português. **Sem dinheiro/satoshis, sem contratos, sem loja.**

## Convenções
- JavaScript ES2022, módulos ES (`import`/`export`), sem dependências novas, sem build.
- Comentários em português, curtos. Nomes de variáveis em português, como no resto do código.
- Nada de `innerHTML` com texto vindo do salvamento sem escapar (use a função `esc` já usada em `hud.js`).
- Números de equilíbrio ficam em `js/config.js`.

## Módulos e interfaces

### `js/i18n.js`
```js
export function t(chave, vars = {})   // texto no idioma atual; {nome} em vars é substituído; chave inexistente → a própria chave
export function idioma()              // 'en' | 'pt'
export function setIdioma(cod)        // grava em localStorage 'cabanas.idioma' e dispara evento 'idioma' no window
```
Idioma padrão: `'en'`; se `navigator.language` começa com `pt`, padrão `'pt'`. Dicionários em `js/lang/en.js` e `js/lang/pt.js`,
cada um `export default { 'chave.ponto': 'texto', ... }` (objeto plano, chaves com pontos).

### `js/itens.js`
```js
export const ITENS = {
  // id: { nome: 'chave i18n', icone: 'caractere', pilha: max por espaço, espacos: 1|2, tipo: 'arma'|'municao'|'cura'|'luz'|'chave'|'doc'|'material', ... }
};
export const RECEITAS = [ { a: 'id', b: 'id', resultado: 'id', qtd: n } ];
```
Itens mínimos: `espingarda` (arma, 2 espaços), `pistola` (arma), `cartuchos` (municao, pilha 8, arma: 'espingarda'),
`balas` (municao, pilha 15, arma: 'pistola'), `pilha` (luz, pilha 3), `vela` (luz, pilha 3; jogada como o antigo sinalizador),
`pano` (material, pilha 3), `alcool` (material, pilha 2), `curativo` (cura, pilha 3, cura: 35), `kit` (cura, pilha 1, cura: 100),
`fosforo` (material, pilha 5), `chave_barracao` e `chave_motel7` (chave, pilha 1), `bilhete` (doc).
Receitas: pano + alcool → curativo ×1; vela + fosforo → nada nesta etapa (deixe fora).

### `js/inventario.js` (lógica pura, sem DOM)
```js
export function criarInventario(espacos = 8)   // { espacos, slots: Array(espacos) de null | { id, qtd } }
export function adicionar(inv, id, qtd)        // empilha onde der, depois usa espaços livres; item de 2 espaços ocupa slot e o seguinte (marcado { ref: i });
                                                // devolve a quantidade que NÃO coube (0 = coube tudo)
export function remover(inv, id, qtd)          // remove de qualquer slot; devolve quanto removeu
export function contar(inv, id)
export function combinar(inv, i, j)            // se houver receita entre os itens dos slots i e j: consome 1 de cada e adiciona o resultado; devolve id do resultado ou null
export function mover(origem, i, destino)      // move o slot i inteiro de um inventário para outro (o baú é um inventário de 24 espaços); devolve true/false
export function serializar(inv) / desserializar(obj, espacos) // desserializar valida: ids que existem em ITENS, qtd inteira 1..pilha; descarta o resto
```

### `js/ciclo.js` (orquestrador escreve)
Relógio do mundo: `{ hora: 0..24 }`. Dia = 06:00–19:00, noite = 19:00–06:00. Duração: dia ~8 min reais, noite ~5 min.
Eventos: 'anoitecer' (sino ×3), 'amanhecer'.

### Salvamento (orquestrador escreve) — localStorage `cabanas.salvo`
```json
{ "v": 1, "hora": 14.5, "dia": 1, "pos": [x, z], "vida": 100, "bateria": 0.8,
  "inventario": {...serializar}, "bau": {...serializar}, "abrigo": "posto", "flags": { } }
```

## Remover (tarefa D6)
`js/base.js`, `js/sats.js`, a loja, contratos, carteira, saque de moedas/carteiras, ganância, extração/helicóptero/sinal de extração,
a tela de pagamento. Os zumbis atuais continuam como inimigos noturnos provisórios.
