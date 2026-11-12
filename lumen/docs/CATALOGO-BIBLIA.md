# Catálogo de Bíblias para o Lumen

Levantamento feito em 11/11/2026 para escolher o texto bíblico do app. O público é majoritariamente evangélico.

## Versão escolhida: Bíblia Livre (BLIVRE)

| | |
|---|---|
| Base | Almeida 1819, Textus Receptus (a mesma linha da ACF e da ARC, muito usadas por evangélicos) |
| Português | Brasil, ortografia atual. Usa "o SENHOR" para o nome de Deus |
| Licença | Creative Commons Atribuição 4.0 Brasil: uso livre, inclusive comercial, **com crédito obrigatório** |
| Crédito a exibir | Bíblia Livre (BLIVRE), © Diego Santos, Mario Sérgio e Marco Teles, 2018. Licença CC BY 4.0 Brasil. |
| Arquivo de origem | `BLIVRE.json` da release mais recente de [damarals/biblias](https://github.com/damarals/biblias) (repositório MIT) |
| Original | sites.google.com/site/biblialivre e ebible.org (`porbr2018`) |

A BLIVRE não é domínio público. É uma licença livre que exige crédito. Isso permite usar no app, vender o Premium e alterar o texto, desde que o crédito apareça e as alterações sejam indicadas. O crédito já aparece no app (aba Você, leitura do capítulo e "BLIVRE" em cada versículo).

## Opções avaliadas

| Versão | Situação legal | Para o app | Motivo |
|---|---|---|---|
| **Bíblia Livre (BLIVRE)** | CC BY 4.0 | **Escolhida** | Almeida, Textus Receptus, português do Brasil atual |
| Almeida 1911 (ALM1911) | Domínio público | Reserva | Ortografia antiga ("aquelle", "n'elle", "Christo"). Precisaria ser modernizada inteira |
| Tradução Brasileira (TB) | Domínio público (texto de 1917) | Não usar como principal | Usa "Jeová" no Antigo Testamento, o que soa estranho para a maioria das igrejas evangélicas |
| Bíblia Portuguesa Mundial (ebible `porbrbsl`) | Domínio público | Não usar | Tradução nova, pouco conhecida no meio evangélico |
| ACF, ARA, ARC, NAA, NVI, NVT, NTLH, AS21, KJA e outras | Com direitos autorais (SBB, SBTB, Biblica, Mundo Cristão, Vida Nova…) | **Não usar** sem licença | Aparecem em vários repositórios "grátis", mas pertencem às editoras |

## Arquivos gerados

```
dados/
├── CATALOGO.md               este documento
├── versiculos-feed.json      88 versículos do feed, conferidos, com temas e cores
└── biblia/
    ├── livros.json           índice dos 66 livros, licença, crédito e lista de alterações
    └── blivre/Gn.json … Ap.json   um arquivo por livro: { livro, abrev, capitulos: [[v1, v2, …], …] }
```

- 66 livros, 31.103 versículos, cerca de 4 MB no total. Cada livro carrega separado, então "Ler capítulo" abre rápido e funciona offline.
- Abreviações dos arquivos: Gn, Ex, Lv … Mt, Mc, Lc, Jo … Ap. Os nomes de arquivo não têm acento: Êxodo é `Ex.json` e Jó é `Job.json`. O mapa nome → abreviação → arquivo está em `livros.json`.

## Correções feitas no texto de origem

Todas estão registradas em `biblia/livros.json`, no campo `alteracoes`.

1. **Salmo 46:** os versículos 2 e 3 vieram unidos na origem, o que deslocava a numeração do resto do salmo. Separados. Agora "Salmos 46:10" é "Ficai quietos, e sabei que eu sou Deus…".
2. **15 versículos vazios** no Novo Testamento (Mt 17:21, Mt 18:11, Mt 23:14, Mc 7:16, Mc 9:44, Mc 9:46, Mc 11:26, Mc 15:28, Lc 17:36, Lc 23:17, At 8:37, At 15:34, At 24:7, At 28:29, Rm 16:24). Completados a partir da Almeida 1911 (domínio público), com ortografia atualizada.
3. **Erros de digitação:** Salmos 34:18 ("sava" → "salva") e Provérbios 3:6 ("todas os teus caminhos" → "todos").
4. **Salmo 119:** removidos os nomes das letras hebraicas ("Nun:", "Álefe:"…) que vinham colados no começo dos versículos.
5. **Pontuação e espaços:** espaço antes de vírgula, vírgula sem espaço depois e pronomes separados ("dá- la" → "dá-la").

No feed, cada versículo tem também o campo `exibir`, com a primeira letra maiúscula e a pontuação final ajustada, porque o versículo aparece sozinho na tela. O campo `texto` guarda o original corrigido.

## Diferenças de numeração que são normais

2 Coríntios 13 (13 ou 14 versículos) e Apocalipse 12 (17 ou 18) variam entre edições. Não são erros.

## Antes do lançamento

- Revisão humana dos 88 versículos do feed e do exemplo do Púlpito, de preferência por um pastor ou líder.
- Se no futuro quiser ARA, NVI ou outra versão conhecida, é preciso licenciar com a editora.
