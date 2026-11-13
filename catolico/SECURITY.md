# Segurança do Lumen

## De onde podem vir dados perigosos

| Origem | Exemplo de risco | Proteção |
|---|---|---|
| Resposta da IA (Púlpito) | A IA devolve `<img onerror=…>` ou um JSON fora do formato | `security/sermon-schema.ts` valida o formato, descarta campos desconhecidos, limita tamanhos, remove caracteres de controle e confere as referências. O texto bíblico é sempre trocado pelo da Bíblia do app. A tela usa `html```, que escapa tudo |
| Texto digitado pela pessoa | Nome de playlist com código | Limpo e limitado (`cleanText`) e mostrado como texto |
| Dados salvos no aparelho | Armazenamento corrompido, de versão antiga ou alterado à mão | `security/validate.ts` confere cada chave ao abrir o app: tipos, tamanhos, ids contra o catálogo, cores só em hexadecimal, horários no formato HH:MM. O que não passa é descartado |
| Arquivos da Bíblia | Arquivo trocado ou corrompido | `services/bible.ts` só aceita abreviações conhecidas como caminho e confere o formato de cada livro |
| Scripts e estilos injetados | Qualquer `<script>` ou atributo `style` que não seja do app | Política de segurança de conteúdo (CSP) no build de produção, **sem `'unsafe-inline'`**: só roda o script do app e só vale o CSS do app, os dois identificados por hash SHA-256. Sem `eval`, plugins ou envio de formulários. Estilos dinâmicos (cores de capa, tamanho do versículo) são aplicados por código a partir de `data-style`, com lista de propriedades permitidas |

## Regras para quem mexe no código

1. **Todo HTML do app é montado com `html```** (`utils/html.ts`) e inserido com `setHTML()`. O `html``` escapa toda interpolação; `raw()` é só para markup fixo do próprio app, como ícones. Não existe `innerHTML =` fora de `utils/html.ts`.
2. **Nada de atributo `style` no HTML.** Use `data-style="--cor:#fff;width:50%"`; o `setHTML()` aplica por código, aceitando só as propriedades listadas em `utils/dom.ts`. Por código: `el.style.setProperty(...)`.
3. **Nada de `eval`, `new Function`, `document.write` nem atributos `on…=` em HTML.** Eventos são ligados por código (`el.onclick = …`).
4. **Tudo o que é lido do aparelho passa por um validador** em `security/validate.ts`. Chave nova = validador novo.
5. **Chaves de API nunca ficam no app.** A IA do Púlpito, quando for para produção, passa por um servidor próprio com login e limite de uso.
6. **IDs únicos** no app inteiro. Telas diferentes não podem reaproveitar o mesmo `id`.
7. **Dependências:** `npm audit` precisa estar zerado antes de publicar.

## Testes

```bash
npm test                # tipagem + build + roteiro de telas + segurança
npm run test:flows      # build + roteiro por todas as telas
npm run test:security   # build + 20 testes de ataque
```

- **Roteiro de telas:** passa pelas 12 áreas do app e, em cada passo, confere erros de script, violações da CSP e HTML aparecendo como texto.
- **Testes de segurança:** tentam atacar o app de verdade:
  - injeção de código por nome de playlist;
  - `<script>` e atributo `style` injetados;
  - dados adulterados no aparelho (CSS malicioso, ids falsos, poluição de protótipo, JSON quebrado);
  - resposta maliciosa da IA;
  - conferência de que a CSP não bloqueia nada legítimo.

## Pendências conhecidas

- **Android:** ofuscação (R8), bloqueio de tráfego sem HTTPS e permissões mínimas entram na etapa do Capacitor.
- **IA em produção:** o Púlpito com IA precisa de um servidor próprio, com login e limite de uso, antes de sair do "Em breve".
