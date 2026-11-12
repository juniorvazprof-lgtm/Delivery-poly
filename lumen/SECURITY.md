# Segurança do Lumen

## De onde podem vir dados perigosos

| Origem | Exemplo de risco | Proteção |
|---|---|---|
| Resposta da IA (Púlpito) | A IA devolve `<img onerror=…>` ou um JSON fora do formato | `security/sermon-schema.ts` valida o formato, descarta campos desconhecidos, limita tamanhos, remove caracteres de controle e confere as referências. O texto bíblico é sempre trocado pelo da Bíblia do app. A tela usa `html```, que escapa tudo |
| Texto digitado pela pessoa | Nome de playlist com código | Limpo e limitado (`cleanText`) e mostrado como texto |
| Dados salvos no aparelho | Armazenamento corrompido, de versão antiga ou alterado à mão | `security/validate.ts` confere cada chave ao abrir o app: tipos, tamanhos, ids contra o catálogo, cores só em hexadecimal, horários no formato HH:MM. O que não passa é descartado |
| Arquivos da Bíblia | Arquivo trocado ou corrompido | `services/bible.ts` só aceita abreviações conhecidas como caminho e confere o formato de cada livro |
| Scripts injetados | Qualquer `<script>` que não seja o do app | Política de segurança de conteúdo (CSP) no build de produção: só roda o script do app, identificado pelo hash SHA-256. Sem `eval`, plugins ou envio de formulários |

## Regras para quem mexe no código

1. **Dados de fora entram no HTML só pelo `html```** (`utils/html.ts`), inserido com `setHTML()`. O `html``` escapa toda interpolação. `raw()` é só para markup fixo do próprio app, como ícones.
2. **Nada de `eval`, `new Function`, `document.write` nem atributos `on…=` em HTML.** Eventos são ligados por código (`el.onclick = …`).
3. **Tudo o que é lido do aparelho passa por um validador** em `security/validate.ts`. Chave nova = validador novo.
4. **Chaves de API nunca ficam no app.** A IA do Púlpito, quando for para produção, passa por um servidor próprio com login e limite de uso.
5. **IDs únicos** no app inteiro. Telas diferentes não podem reaproveitar o mesmo `id`.
6. **Dependências:** `npm audit` precisa estar zerado antes de publicar.

## Testes

```bash
npm run test:security
```

Sobe o build de produção e tenta atacar o app de verdade. São 17 verificações:
- **Injeção de código:** nome de playlist com `<img onerror>` e `<script>` injetado na página.
- **Dados adulterados:** cores com CSS malicioso, ids falsos, tentativa de poluir o protótipo de objetos e JSON quebrado.
- **Resposta maliciosa da IA:** HTML, caracteres de inversão de texto, números absurdos e referências inválidas.
- **CSP:** confere que ela não bloqueia nada legítimo.

## Pendências conhecidas

- **Montagem de HTML:** os módulos que mostram só conteúdo do próprio app (catálogo, ícones, textos fixos) ainda montam HTML com template comum. Eles não recebem dados de fora, mas a meta é migrar todos para `html``` aos poucos.
- **Tipagem:** os módulos com `// @ts-nocheck` ainda não são checados pelo TypeScript. Serão tipados um por vez.
- **Estilos inline:** a CSP permite `'unsafe-inline'` em estilos, porque as cores de capa e de fundo são definidas por atributo `style`. O risco é baixo (CSS não executa código), e as cores vindas do aparelho já são validadas.
- **Android:** ofuscação (R8), bloqueio de tráfego sem HTTPS e permissões mínimas entram na etapa do Capacitor.
