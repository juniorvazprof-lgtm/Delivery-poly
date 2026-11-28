// Fase 1: o vilarejo de Vau-Cinzento. Layout e encontros como dados.
export interface EncounterDef {
  id: string;
  pos: [number, number]; // x, z no mapa
  enemies: string[]; // ids de ENEMIES
  boss?: boolean;
  intro?: string;
}

export interface PropDef {
  kind: 'house' | 'ruin' | 'deadtree' | 'pine' | 'torch' | 'grave' | 'fence' | 'rock' | 'church' | 'well' | 'barrel' | 'cart' | 'blood';
  pos: [number, number];
  rot?: number;
  radius?: number; // colisão (0 = atravessável)
}

export const VILLAGE = {
  name: 'Vau-Cinzento',
  size: 44,
  start: [-15, 15] as [number, number],
  // caminho de terra (polilinha) do portão até a igreja
  road: [[-18, 18], [-12, 12], [-6, 9], [0, 4], [4, -2], [8, -8], [12, -12]] as [number, number][],
  encounters: [
    { id: 'e1', pos: [-7, 7], enemies: ['possessed', 'possessed'], intro: 'Aldeões possuídos! Talvez ainda possam ser salvos...' },
    { id: 'e2', pos: [2, 6], enemies: ['ghost', 'possessed'] },
    { id: 'e3', pos: [-2, -4], enemies: ['ghost', 'ghost'] },
    { id: 'e4', pos: [6, -3], enemies: ['demon', 'possessed'] },
    { id: 'boss', pos: [12, -11], enemies: ['abbot', 'ghost'], boss: true,
      intro: 'O Abade Profanado: "O Mestre das Cinzas já reina. Ajoelhem-se, ou juntem-se aos mortos."' },
  ] as EncounterDef[],
  props: [
    { kind: 'house', pos: [-14, 8], rot: 0.3, radius: 1.8 },
    { kind: 'ruin', pos: [-10, 15], rot: -0.4, radius: 1.6 },
    { kind: 'house', pos: [-3, 13], rot: 0.9, radius: 1.8 },
    { kind: 'house', pos: [-10, 3], rot: 1.2, radius: 1.8 },
    { kind: 'ruin', pos: [5, 10], rot: 0.2, radius: 1.6 },
    { kind: 'house', pos: [-5, 0], rot: -0.5, radius: 1.8 },
    { kind: 'house', pos: [9, 2], rot: 0.6, radius: 1.8 },
    { kind: 'ruin', pos: [0, -9], rot: 1.4, radius: 1.6 },
    { kind: 'church', pos: [16, -16], rot: Math.PI / 4, radius: 4.5 },
    { kind: 'well', pos: [-4, 6], radius: 0.9 },
    { kind: 'cart', pos: [-9, 11], rot: 0.8, radius: 1.0 },
    { kind: 'barrel', pos: [-12.5, 6.5], radius: 0.4 },
    { kind: 'barrel', pos: [7.5, 3.5], radius: 0.4 },
    { kind: 'fence', pos: [-16, 4], rot: 0.2 },
    { kind: 'fence', pos: [3, 12], rot: -0.3 },
    { kind: 'fence', pos: [11, 5], rot: 1.1 },
    { kind: 'torch', pos: [-13, 13], radius: 0.2 },
    { kind: 'torch', pos: [-3, 8], radius: 0.2 },
    { kind: 'torch', pos: [3, 1], radius: 0.2 },
    { kind: 'torch', pos: [9, -6], radius: 0.2 },
    { kind: 'torch', pos: [13, -8], radius: 0.2 },
    { kind: 'blood', pos: [-8, 9] }, { kind: 'blood', pos: [1, 3] }, { kind: 'blood', pos: [7, -6] },
    { kind: 'grave', pos: [9, -14] }, { kind: 'grave', pos: [10.5, -15] }, { kind: 'grave', pos: [12, -16.5] },
    { kind: 'grave', pos: [7.5, -12.5] }, { kind: 'grave', pos: [14, -12] }, { kind: 'grave', pos: [15, -10] },
  ] as PropDef[],
};
