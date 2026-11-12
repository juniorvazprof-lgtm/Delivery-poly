/**
 * Chaves de funções (feature flags).
 * Para lançar uma função que hoje aparece como "Em breve", troque o valor aqui.
 * No futuro estas chaves podem vir do servidor (ex.: Firebase Remote Config), sem nova versão na loja.
 */
export const FEATURES = {
  /** Anúncios no feed. */
  ads: false,
  /** Louvores originais na aba Ouvir (hoje só a prévia com faixas de demonstração). */
  music: false,
  /** Assinatura Premium com pagamento. */
  premium: false,
  /** Pregação gerada por IA no Púlpito. */
  pulpitAI: false,
  /** Notificações de lembrete. */
  reminders: false,
  /** Ouvir versículos em voz alta. */
  tts: false,
} as const;

export const ADS_ON = FEATURES.ads;
