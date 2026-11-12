/** Segundos → "m:ss". */
export const mmss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

/** Hash simples e estável de um texto (para números de exemplo e ordenações determinísticas). Não é criptográfico. */
export const hsh = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** 8200 → "8,2 mil". */
export const fmtN = (n: number): string => (n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + " mil" : String(n));
