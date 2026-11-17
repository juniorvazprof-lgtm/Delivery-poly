// Satoshis: 1 bitcoin = 100.000.000 sats. A moeda é só ambientação do jogo.
export const satsFmt = n => `${Math.round(n).toLocaleString('pt-BR')} sats`;
export const btcFmt = n => `₿ ${(n / 1e8).toFixed(8).replace('.', ',')}`;
