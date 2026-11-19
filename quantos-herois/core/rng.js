// Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma batalha.
export function criarRng(semente = 1) {
  let a = semente >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.entre = (min, max) => min + (max - min) * rng();
  return rng;
}
