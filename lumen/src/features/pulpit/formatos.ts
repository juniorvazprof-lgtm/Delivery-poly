/* Os três formatos de mensagem (Pregação, Palestra, Estudo) e as instruções para a IA.
   Estrutura homilética clássica: texto base, tema, introdução, desenvolvimento, aplicação e conclusão.
   Função pura, sem DOM: usada pelo Púlpito e pelos testes. */

export type Formato = "pregacao" | "palestra" | "estudo";
export type TipoParte = "introducao" | "contexto" | "desenvolvimento" | "perguntas" | "aplicacao" | "conclusao" | "oracao";
export const TIPOS: TipoParte[] = ["introducao", "contexto", "desenvolvimento", "perguntas", "aplicacao", "conclusao", "oracao"];
export const ROTULO_TIPO: Record<TipoParte, string> = {
  introducao: "Introdução", contexto: "Contexto do texto", desenvolvimento: "Desenvolvimento", perguntas: "Perguntas para o grupo",
  aplicacao: "Aplicação", conclusao: "Conclusão", oracao: "Oração final",
};

export interface InfoFormato { nome: string; resumo: string; ocasioes: string[]; duracoes: number[]; acao: string }
export const FORMATOS: Record<Formato, InfoFormato> = {
  pregacao: { nome: "Pregação", resumo: "Para o culto: um texto base, exortação e apelo.", ocasioes: ["Culto de domingo", "Culto de oração", "Jovens", "Crianças"], duracoes: [15, 30, 45], acao: "Começar a pregar" },
  palestra: { nome: "Palestra", resumo: "Para eventos: um tema da vida, com ilustrações e várias passagens.", ocasioes: ["Jovens", "Casais e famílias", "Mulheres", "Homens", "Evento aberto"], duracoes: [20, 30, 45], acao: "Começar a palestra" },
  estudo: { nome: "Estudo", resumo: "Para célula, EBD ou grupo: o texto explicado, com perguntas para conversar.", ocasioes: ["Célula", "Escola Bíblica", "Grupo pequeno", "Discipulado"], duracoes: [30, 45, 60], acao: "Começar o estudo" },
};

export interface Pedido { formato: Formato; tema: string; ocasiao: string; dur: number; ref: string }

/** Partes na ordem certa para cada formato, com os minutos sugeridos (somam exatamente `dur`). */
export function roteiro(f: Formato, dur: number): { tipo: TipoParte; min: number }[] {
  const pontos = f === "estudo" ? (dur <= 30 ? 2 : 3) : dur <= 20 ? 3 : dur <= 30 ? 3 : 4;
  const base: { tipo: TipoParte; peso: number }[] =
    f === "pregacao" ? [{ tipo: "introducao", peso: 2 }, ...Array(pontos).fill({ tipo: "desenvolvimento", peso: 3.5 }), { tipo: "aplicacao", peso: 2 }, { tipo: "conclusao", peso: 2 }, { tipo: "oracao", peso: 1 }]
    : f === "palestra" ? [{ tipo: "introducao", peso: 2.5 }, ...Array(pontos).fill({ tipo: "desenvolvimento", peso: 4 }), { tipo: "aplicacao", peso: 2.5 }, { tipo: "conclusao", peso: 2 }]
    : [{ tipo: "introducao", peso: 2 }, { tipo: "contexto", peso: 3 }, ...Array(pontos).fill({ tipo: "desenvolvimento", peso: 5 }), { tipo: "perguntas", peso: 5 }, { tipo: "aplicacao", peso: 2.5 }, { tipo: "conclusao", peso: 1.5 }, { tipo: "oracao", peso: 1.5 }];
  const soma = base.reduce((s, p) => s + p.peso, 0);
  const out = base.map(p => ({ tipo: p.tipo, min: Math.max(1, Math.round((p.peso / soma) * dur)) }));
  const dif = dur - out.reduce((s, p) => s + p.min, 0); // acerta o arredondamento no maior bloco
  const maior = out.reduce((m, p, i) => (p.min > out[m].min ? i : m), 0); out[maior].min += dif;
  return out;
}

const OQUE: Record<TipoParte, Record<Formato, string>> = {
  introducao: {
    pregacao: "Prenda a atenção com uma pergunta ou situação do dia a dia, apresente o TEXTO BASE com 1 ou 2 frases de contexto, LEIA o texto base ([LEITURA]) e diga o tema em uma frase.",
    palestra: "Comece com uma história curta ou pergunta que conecte com a vida do público, diga o tema e por que ele importa. Apresente e LEIA o texto base ([LEITURA]).",
    estudo: "Dê as boas-vindas ao grupo, faça uma pergunta de abertura simples para quebrar o gelo (com resposta pessoal) e LEIA o texto base inteiro ([LEITURA]).",
  },
  contexto: { pregacao: "", palestra: "", estudo: "Explique quem escreveu, para quem, quando e o que estava acontecendo. Sem inventar fatos; se for incerto, diga \"a tradição diz que\"." },
  desenvolvimento: {
    pregacao: "Cada ponto sai do PRÓPRIO TEXTO BASE (um trecho ou versículo dele, em ordem). LEIA o trecho ([LEITURA], com ref do trecho), explique o que quer dizer e dê um exemplo da vida real. Pode citar no máximo 1 passagem de apoio por ponto, só de passagem.",
    palestra: "Cada ponto é uma ideia prática sobre o tema, apoiada numa passagem (o texto base ou outra). LEIA a passagem do ponto ([LEITURA]), explique e ilustre com uma história ou exemplo concreto.",
    estudo: "Percorra o texto base em ordem, trecho a trecho. LEIA o trecho ([LEITURA], com ref do trecho), explique as palavras-chave e o sentido, e ligue com o resto da Bíblia quando ajudar.",
  },
  perguntas: { pregacao: "", palestra: "", estudo: "Escreva de 4 a 6 perguntas para o grupo conversar, numeradas, indo da compreensão do texto (\"O que o texto diz...\") à vida (\"Como isso muda...\"). Após cada uma, a indicação (deixe o grupo responder)." },
  aplicacao: {
    pregacao: "Mostre o que muda na vida de quem ouviu: 2 ou 3 situações concretas (casa, trabalho, escola, igreja).",
    palestra: "Dê passos práticos e concretos (2 a 4), que a pessoa consiga fazer a partir de amanhã.",
    estudo: "Ajude cada um a escolher UMA coisa para viver nesta semana, a partir do texto.",
  },
  conclusao: {
    pregacao: "Retome o tema em uma frase. Faça o APELO: um convite claro e respeitoso a uma decisão diante de Deus (entregar a vida a Jesus, voltar, confiar, perdoar), sem pressão nem medo. Depois deixe o DESAFIO: uma tarefa simples para a semana.",
    palestra: "Resuma as ideias principais em poucas frases e deixe um DESAFIO prático para os próximos dias.",
    estudo: "Resuma o que o grupo aprendeu em 2 ou 3 frases e lembre o compromisso da semana.",
  },
  oracao: {
    pregacao: "Uma oração curta, em primeira pessoa do plural, que retome o tema e o apelo. Termine com \"Em nome de Jesus, amém.\"",
    palestra: "",
    estudo: "Oração curta pelo grupo e pelos pedidos, retomando o texto. Termine com \"Em nome de Jesus, amém.\"",
  },
};

/** Instruções para a IA montar a mensagem no formato escolhido. */
export function promptMensagem(p: Pedido): string {
  const f = FORMATOS[p.formato], partes = roteiro(p.formato, p.dur), wpm = p.dur <= 15 ? 120 : 105;
  let k = 0;
  const lista = partes.map(x => {
    const nome = x.tipo === "desenvolvimento" ? `Desenvolvimento ${++k}: <título curto do ponto, 2 a 5 palavras>` : ROTULO_TIPO[x.tipo];
    return `- tipo "${x.tipo}", nome "${nome}", min ${x.min}: ${OQUE[x.tipo][p.formato]}`;
  }).join("\n");
  const voz = p.formato === "estudo" ? "como quem conduz um estudo bíblico em grupo, conversando e perguntando" : p.formato === "palestra" ? "como um palestrante cristão falando com o público, em tom de conversa" : "como o próprio pregador falando com a igreja";
  return `Escreva uma ${f.nome.toLowerCase()} cristã de ${p.dur} minutos, pronta para ser LIDA em voz alta no celular, em português do Brasil. Formato: ${f.nome} (${f.resumo}). Para: ${p.ocasiao}. Tema: ${p.tema}.
${p.ref ? `TEXTO BASE escolhido: ${p.ref}. Use exatamente esta referência em "texto_base".` : `Escolha um TEXTO BASE (uma passagem de 2 a 8 versículos) que trate bem do tema e coloque a referência em "texto_base".`}

ESTRUTURA (siga exatamente estas partes, nesta ordem; "tipo", "nome" e "min" como indicados):
${lista}

COMO ESCREVER A FALA
- Escreva ${voz}, em primeira pessoa ("eu", "a gente", "você"). Tom caloroso, simples e direto.
- Frases curtas. Palavras do dia a dia. Um adolescente de 12 anos precisa entender tudo. Se aparecer uma palavra difícil, explique logo em seguida.
- Onde uma passagem deve ser lida, escreva [LEITURA] sozinho num parágrafo e ponha a referência dela em "ref" da parte. Não repita o texto bíblico na fala. No máximo uma [LEITURA] por parte.
- Indicações entre parênteses, bem curtas: (pausa), (pergunte e espere), (leia devagar), (olhe para a igreja), (deixe o grupo responder). No máximo duas por parte, exceto nas perguntas.
- Separe parágrafos com \\n\\n. Parágrafos de 1 a 3 frases.
- Tamanho: cerca de ${wpm} palavras por minuto de cada parte. A leitura e as pausas contam no tempo.
- Fiel à Bíblia, sem promessas de prosperidade, sem ataques a outras igrejas ou religiões.

PASSAGENS: liste o texto base e cada trecho ou passagem lida com [LEITURA] (sem repetir). "ref" no formato "Livro capítulo:versículo" ou "Livro capítulo:início-fim", com o nome do livro por extenso em português (ex.: "Salmos 23:1", "1 Pedro 5:7"). "texto": o versículo, fiel à Almeida; o app troca pelo texto oficial da Bíblia Livre. Não invente versículos.
Para cada passagem, explique como um professor conversando com um adolescente (1 a 3 frases em cada campo). Não invente fatos históricos; se a autoria for incerta, escreva "a tradição diz que".

Responda SOMENTE com um objeto JSON neste formato:
{"titulo":"","formato":"${p.formato}","texto_base":"Livro 1:2-5","tema":"o tema em uma frase","ideia_central":"uma frase","passagens":[{"ref":"Livro 1:2","texto":"","quem":"","para_quem":"","quando":"","explicacao":"","palavras":[{"p":"","s":""}],"lembrar":""}],"partes":[{"tipo":"introducao","nome":"Introdução","min":2,"ref":"Livro 1:2 ou vazio","fala":""}]}`;
}
