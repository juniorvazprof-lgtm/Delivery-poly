// Textos do jogo (rascunho do DeepSeek, revisado).
export const TEXTOS = {
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
  }
 ],
 "morte": [
  "Saque perdido. O mato agradece.",
  "Caiu feio. Sats ficam.",
  "Zumbi 1, mercenário 0.",
  "A noite cobrou a conta.",
  "O Pinheiro cobrou a conta.",
  "Saque no chão. Volta depois."
 ],
 "dicas": [
  "Tiro faz barulho. Barulho traz zumbi. Pense nisso.",
  "Lanterna ligada te deixa visível. Apague às vezes.",
  "Munição é limitada. Tem caixa na porta das cabanas.",
  "Longe dos zumbis, ande de lanterna apagada.",
  "Não gaste bala em alvo longe. Deixe chegar.",
  "Joystick até a metade: você anda devagar e não faz barulho.",
  "Sinalizador de mão: jogue longe e a horda vai para lá.",
  "Mariposas correm para a luz. Apague a lanterna e elas se perdem.",
  "Gritador: mate antes que ele grite, ou a área inteira vem."
 ],
 "mariposa": [
  "Mariposa na área. Luz atrai. Apaga a lanterna.",
  "Zumbi mariposa: vê luz, vem. Lanterna off.",
  "Mariposa corre pra luz. Apaga e reza baixinho."
 ],
 "gritador": [
  "Gritador perto. Se ele gritar, a festa é geral.",
  "Gritador na área. Abafa ele antes do grito.",
  "Gritador chama a turma. Não deixa gritar."
 ],
 "bateria": [
  "Bateria fraca. A noite também.",
  "Lanterna piscando. Isso é ruim.",
  "Bateria no fim. Sinto cheiro de problema."
 ]
};
export const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
