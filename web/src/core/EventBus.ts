// Barramento de eventos tipado: o domínio emite, render/UI escutam.
export class EventBus<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Array<(p: E[K]) => void> } = {};
  on<K extends keyof E>(k: K, fn: (p: E[K]) => void): () => void {
    (this.handlers[k] ??= []).push(fn);
    return () => { this.handlers[k] = this.handlers[k]!.filter((f) => f !== fn); };
  }
  emit<K extends keyof E>(k: K, p: E[K]): void {
    this.handlers[k]?.forEach((f) => f(p));
  }
}
