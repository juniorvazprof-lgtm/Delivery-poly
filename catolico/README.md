# Lumen Católico (nome provisório) — MVP

App no estilo do Lumen para o público católico: **Hoje** (dia litúrgico, santo do dia, oração do dia, terço de hoje, Ângelus/Rainha do Céu e jaculatórias), **Terço guiado**, **Orações** e **Você** (progresso só no aparelho).

## Rodar
    npm ci && npm run dev        # desenvolvimento
    npm test                     # tipos, testes unitários (calendário) e de ponta a ponta (terço completo)
    npm run build:preview        # página única para a prévia no Claude

## De onde vêm os textos (PROVISÓRIO)
| Conteúdo | Origem | Situação |
|---|---|---|
| Orações tradicionais (`src/data/oracoes.ts`) | formas tradicionais rezadas no Brasil, escritas de memória | conferir com fonte em domínio público e revisor |
| Mistérios do terço (`src/data/terco.ts`) | títulos tradicionais + referência bíblica | sem texto bíblico até haver tradução católica livre |
| Santo do dia (`src/data/santos.ts`) | ~100 festas fixas, descrições próprias | lista parcial; conferir com o calendário oficial |
| Oração do dia | devoção tradicional de cada dia da semana; textos próprios | revisar |
| Calendário litúrgico (`src/core/liturgia.ts`) | calculado (Páscoa, tempos, cores, A/B/C, I/II; Epifania, Batismo e Ascensão pelas regras do Brasil) | testado em `tests/unit/liturgia.test.ts` |

## Próximos passos
1. Tradução católica (73 livros) em domínio público ou licenciada → Evangelho do dia e texto dos mistérios.
2. Revisão de todas as orações e textos por um sacerdote.
3. Calendário completo dos santos.
4. Lembretes do Ângelus e do terço (app Android), novenas e Terço da Misericórdia.
