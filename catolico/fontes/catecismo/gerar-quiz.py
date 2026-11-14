import json, sys, urllib.request
REG = """Você escreve conteúdo catequético para um app católico brasileiro (público geral; linguagem que um jovem de 14 anos entenda; tom acolhedor e fiel ao ensino da Igreja).
Tema: OS SETE SACRAMENTOS (sacramentos em geral, Batismo, Crisma, Eucaristia/Missa, Confissão, Unção dos Enfermos, Ordem, Matrimônio).
Produza:
A) 32 perguntas de QUIZ, cerca de 4 por sacramento + 4 sobre sacramentos em geral. Cada uma: pergunta curta; 3 opções (só UMA correta; as erradas plausíveis mas claramente erradas, sem pegadinha, sem ridicularizar outras religiões); explicação de 1 a 3 frases que ensina o porquê.
B) 8 cartões EXPLICATIVOS (um por sacramento + sacramentos em geral): título em forma de pergunta e texto de até 300 caracteres.
REGRAS DE DIREITO AUTORAL (obrigatórias):
- Escreva TUDO com palavras próprias, explicando com exemplos simples. NÃO reproduza nem parafraseie de perto frases do Catecismo da Igreja Católica ou de outro livro; não imite a estrutura das frases dele.
- Termos técnicos da fé (graça, pecado original, matéria e forma, caráter, transubstanciação, absolvição) podem ser usados, explicados com simplicidade.
- Para cada item, indique em "cic" 1 a 3 números de parágrafo do Catecismo da Igreja Católica onde o assunto é tratado. Só números de que você tem certeza; prefira poucos e certos.
- Disciplina atual (Código de 1983): jejum eucarístico de 1 hora; Unção dos Enfermos não é só para quem está morrendo; diácono pode batizar e assistir casamentos.
Responda SOMENTE JSON: {"quiz":[{"sac":"geral|batismo|crisma|eucaristia|confissao|uncao|ordem|matrimonio","p":"...","op":["...","...","..."],"certa":0,"exp":"...","cic":[1213]}],"explica":[{"sac":"...","titulo":"...","texto":"...","cic":[1213]}]}"""
body = json.dumps({"model": "deepseek-flash", "messages": [{"role": "user", "content": REG}], "response_format": {"type": "json_object"}, "max_tokens": 16000, "temperature": 0.4}).encode()
r = json.load(urllib.request.urlopen(urllib.request.Request("https://api.deepseek.com/chat/completions", body, {"Content-Type": "application/json", "Authorization": "Bearer proxy-injected"}), timeout=600))
out = json.loads(r["choices"][0]["message"]["content"]); json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print("ok", len(out["quiz"]), len(out["explica"]), "tokens", r["usage"]["total_tokens"])
