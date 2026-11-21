// Evoluções: no acampamento, converte 1 herói da classe de origem na classe evoluída pagando o preço.
// Cada evoluído herda a família e também recebe efeitos da classe de origem.
export const EVOLUCOES = {
  piromante: {
    para: 'magoTornado', preco: 90, rodadaMin: 4,
    desc: 'Mago do Tornado de Fogo: bola de fogo com tornado, mais dano e vida',
  },
  guerreiro: {
    para: 'campeao', preco: 70, rodadaMin: 3,
    desc: 'Campeão: Golpe Firme em área nativo, mais vida e dano',
  },
  guardiao: {
    para: 'paladino', preco: 100, rodadaMin: 5,
    desc: 'Paladino: provoca mais forte e protege aliados próximos (aura)',
  },
  arqueiro: {
    para: 'atirador', preco: 80, rodadaMin: 4,
    desc: 'Atirador de Elite: Tiro Certeiro perfura 3, mais alcance e dano',
  },
  clerigo: {
    para: 'sumoSacerdote', preco: 110, rodadaMin: 5,
    desc: 'Sumo Sacerdote: cura em área nativa, mais vida e cura',
  },
};

export const HEROIS_EVOLUIDOS = {
  magoTornado: {
    nome: 'Mago do Tornado de Fogo', familia: 'Arcano', papel: 'à distância, área com tornado',
    pv: 110, dano: 40, intervalo: 1.8, alcance: 42, velocidade: 10, raio: 2.2, custo: 30,
    projetil: { velocidade: 60 },
    habilidades: [{ tipo: 'bolaDeFogo', raio: 9, tornado: { dps: 8, raio: 6, duracao: 4 } }],
    evolucaoDe: 'piromante',
  },
  campeao: {
    nome: 'Campeão', familia: 'Marcial', papel: 'corpo a corpo, golpe firme em área',
    pv: 210, dano: 24, intervalo: 0.85, alcance: 5.5, velocidade: 14, raio: 2.4, custo: 20,
    habilidades: [{ tipo: 'golpeFirme', aCada: 3, mult: 1.6, raioArea: 6 }],
    evolucaoDe: 'guerreiro',
  },
  paladino: {
    nome: 'Paladino', familia: 'Marcial', papel: 'muita vida, provoca e protege aliados',
    pv: 620, dano: 10, intervalo: 1.2, alcance: 5, velocidade: 11, raio: 3.0, custo: 35, reducaoDano: 0.3,
    habilidades: [
      { tipo: 'provocar', raio: 22, duracao: 4, recarga: 5.5 },
    ],
    evolucaoDe: 'guardiao',
  },
  atirador: {
    nome: 'Atirador de Elite', familia: 'Marcial', papel: 'à distância, perfura e alcance',
    pv: 115, dano: 15, intervalo: 1.0, alcance: 42, velocidade: 12, raio: 2.0, custo: 25,
    projetil: { velocidade: 95, tipo: 'flecha' },
    habilidades: [{ tipo: 'tiroCerteiro', aCada: 3, mult: 1.8, perfura: 3 }],
    evolucaoDe: 'arqueiro',
  },
  sumoSacerdote: {
    nome: 'Sumo Sacerdote', familia: 'Divino', papel: 'cura em área',
    pv: 135, dano: 5, intervalo: 1.5, alcance: 24, velocidade: 10, raio: 2.4, custo: 35,
    projetil: { velocidade: 70, tipo: 'luz' },
    habilidades: [{ tipo: 'curar', valor: 30, alcance: 32, recarga: 2.8, area: 10 }],
    evolucaoDe: 'clerigo',
  },
};
