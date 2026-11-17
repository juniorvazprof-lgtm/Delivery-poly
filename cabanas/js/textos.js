// Textos do jogo (rascunho do DeepSeek, revisado).
export const TEXTOS = {
 "briefing": [
  "Dona Ivone, Posto 9. Pinheiro tá cheio de zumbi e cliente reclamando. Mate 35 e volte vivo. Pago em sats, na hora.",
  "Contrato novo: Limpar o Acampamento Pinheiro. São 35 cabeças. Traga seu couro de volta, mercenário. Satoshis não servem pra defunto.",
  "O Posto 9 paga em satoshi, não em promessa. Limpe o Pinheiro e saia vivo. Se morrer, o saque fica e eu fico no prejuízo."
 ],
 "radio": [
  {
   "quando": "objetivo",
   "t": "Sinalizador aceso. Bonito de ver."
  },
  {
   "quando": "objetivo",
   "t": "Meta batida. Já estou descendo."
  },
  {
   "quando": "objetivo",
   "t": "35 no chão? Acende e não sai daí."
  },
  {
   "quando": "objetivo",
   "t": "Vi seu sinal. Segura, tô indo."
  },
  {
   "quando": "espera",
   "t": "Horda vindo pelo norte. Aguenta firme."
  },
  {
   "quando": "espera",
   "t": "Barulho ali. Apaga a lanterna."
  },
  {
   "quando": "espera",
   "t": "Trinta segundos. Não morre agora."
  },
  {
   "quando": "espera",
   "t": "Tá cheio aí. Fica no círculo e atira curto."
  },
  {
   "quando": "espera",
   "t": "Munição contada. Tiro curto."
  },
  {
   "quando": "espera",
   "t": "Segura o ponto. Não sai correndo."
  },
  {
   "quando": "chegada",
   "t": "Encostei. Sobe, rápido."
  },
  {
   "quando": "chegada",
   "t": "Porta aberta. Senta e segura firme."
  },
  {
   "quando": "chegada",
   "t": "Decolando. Segura o saque."
  },
  {
   "quando": "chegada",
   "t": "Bem-vindo a bordo. Cheiro horrível."
  }
 ],
 "morte": [
  "Saque perdido. O mato agradece.",
  "Caiu feio. Sats ficam.",
  "Zumbi 1, mercenário 0.",
  "Sem extração, sem pagamento.",
  "O Pinheiro cobrou a conta.",
  "Saque no chão. Volta depois."
 ],
 "pagamento": [
  "Sats na carteira. Prazer.",
  "35 baixas. Pagamento limpo.",
  "Contrato fechado. Sem choro.",
  "Transferência feita. Próximo.",
  "Dinheiro é dinheiro. Valeu.",
  "Saiu vivo. Recebeu. Simples."
 ],
 "dicas": [
  "Tiro faz barulho. Barulho traz zumbi. Pense nisso.",
  "Lanterna ligada te deixa visível. Apague às vezes.",
  "Munição é limitada. Tem caixa na porta das cabanas.",
  "Saque só vale se você extrair. Morto não saca.",
  "Segure o ponto de extração. Sair correndo mata.",
  "Longe dos zumbis, ande de lanterna apagada.",
  "Não gaste bala em alvo longe. Deixe chegar.",
  "Extrair vale mais que matar. Priorize o resgate."
 ]
};
export const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
