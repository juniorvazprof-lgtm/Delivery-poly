// Fendas do mapa: cada uma usa um só bioma (data/zones) e tem perigo próprio.
// hp multiplica a vida dos inimigos; gold multiplica o ouro da partida.
export const RIFTS = {
  cidade: { name: 'Ruínas de Kanda', zone: 'cidade', danger: 1, hp: 1, gold: 1, color: '#5ff2ff', glyph: '▦',
    desc: 'Uma cidade engolida pela Fenda. Ressonas fracas, saque modesto.' },
  cristal: { name: 'Campos de Prisma', zone: 'cristal', danger: 2, hp: 1.25, gold: 1.3, color: '#c58bff', glyph: '◆',
    desc: 'Cristais de mana em toda parte. Mais minério, criaturas mais duras.' },
  cinzas: { name: 'Terra Queimada', zone: 'cinzas', danger: 2, hp: 1.35, gold: 1.4, color: '#ff8a3d', glyph: '♨',
    desc: 'Brasas que não apagam. Pouco minério, pagamento melhor.' },
  abismo: { name: 'Beira do Abismo', zone: 'abismo', danger: 3, hp: 1.6, gold: 1.8, color: '#3f8cff', glyph: '◎',
    desc: 'Onde a Fenda não tem fundo. Só para magos preparados.' },
};
