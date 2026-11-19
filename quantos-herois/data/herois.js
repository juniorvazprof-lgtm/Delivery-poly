// Dados dos heróis. Unidades: vida (pv), dano por golpe, intervalo entre ataques (s),
// alcance e velocidade em "metros" da arena (90 x 140), custo em ouro.
// Para criar uma classe nova, adicione uma entrada aqui; habilidades são descritas por dados
// e interpretadas em core/efeitos.js.
export const HEROIS = {
  guerreiro: {
    nome: 'Guerreiro', familia: 'Marcial', papel: 'corpo a corpo, barato',
    pv: 120, dano: 16, intervalo: 0.9, alcance: 5, velocidade: 14, raio: 2.2, custo: 20,
    habilidades: [{ tipo: 'golpeFirme', aCada: 3, mult: 1.5, raioArea: 0 }],
  },
  guardiao: {
    nome: 'Guardião', familia: 'Marcial', papel: 'muita vida, provoca',
    pv: 365, dano: 6, intervalo: 1.2, alcance: 5, velocidade: 11, raio: 2.8, custo: 35, reducaoDano: 0.3,
    habilidades: [{ tipo: 'provocar', raio: 18, duracao: 3, recarga: 6 }],
  },
  piromante: {
    nome: 'Piromante', familia: 'Arcano', papel: 'à distância, área',
    pv: 65, dano: 25, intervalo: 1.8, alcance: 40, velocidade: 10, raio: 2.0, custo: 30,
    projetil: { velocidade: 60 },
    habilidades: [{ tipo: 'bolaDeFogo', raio: 8 }],
  },
};
