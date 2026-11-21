// Número ideal de heróis por rodada (gerado por tools/balance.mjs; relatório: design/balance/relatorio-rodadas-novas.md).
// n = opção segura; perigosa = "Atalho perigoso" medido.
export const IDEAIS = {
  "1": {
    "n": 1,
    "comp": {
      "guerreiro": 0,
      "guardiao": 0,
      "piromante": 1,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 2
  },
  "2": {
    "n": 2,
    "comp": {
      "guerreiro": 1,
      "guardiao": 1,
      "piromante": 0,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 3
  },
  "3": {
    "n": 3,
    "comp": {
      "guerreiro": 1,
      "guardiao": 0,
      "piromante": 2,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 4
  },
  "4": {
    "n": 3,
    "comp": {
      "guerreiro": 0,
      "guardiao": 1,
      "piromante": 2,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 5
  },
  "5": {
    "n": 4,
    "comp": {
      "guerreiro": 2,
      "guardiao": 0,
      "piromante": 1,
      "arqueiro": 0,
      "clerigo": 1
    },
    "perigosa": 5
  },
  "6": {
    "n": 5,
    "comp": {
      "guerreiro": 3,
      "guardiao": 1,
      "piromante": 0,
      "arqueiro": 0,
      "clerigo": 1
    },
    "perigosa": 7
  },
  "7": {
    "n": 6,
    "comp": {
      "guerreiro": 0,
      "guardiao": 1,
      "piromante": 2,
      "arqueiro": 1,
      "clerigo": 2
    },
    "perigosa": 8
  },
  "8": {
    "n": 6,
    "comp": {
      "guerreiro": 2,
      "guardiao": 2,
      "piromante": 2,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 8
  },
  "9": {
    "n": 6,
    "comp": {
      "guerreiro": 0,
      "guardiao": 1,
      "piromante": 5,
      "arqueiro": 0,
      "clerigo": 0
    },
    "perigosa": 10
  },
  "10": {
    "n": 10,
    "comp": {
      "guerreiro": 3,
      "guardiao": 3,
      "piromante": 3,
      "arqueiro": 1,
      "clerigo": 0
    }
  }
};
