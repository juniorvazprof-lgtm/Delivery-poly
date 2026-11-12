/**
 * Armazenamento local (no aparelho).
 * Nunca lança erro: em modo anônimo, com armazenamento cheio ou bloqueado, devolve o valor padrão.
 * Todas as chaves começam com "lumen." para não colidir com outros dados.
 */
export const S = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const value = JSON.parse(raw) as unknown;
      // Validação mínima: o tipo salvo precisa bater com o tipo do padrão.
      if (fallback !== null && fallback !== undefined && typeof value !== typeof fallback) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
      return value as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem espaço ou bloqueado: segue sem salvar */ }
  },
};
