// Estado de execução compartilhado entre módulos.
// G: variáveis que vários módulos alteram (tempo de jogo, pausa, velocidade, clima...).
// H: acesso tardio a funções/objetos de módulos carregados depois (evita importação circular).
export const G = {};
export const H = {};
