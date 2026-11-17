// Abrigos: lugares seguros com uma vela num pequeno altar. Ali você salva (acendendo a vela), mexe no baú e dorme até o amanhecer.
// Criaturas não entram no raio do abrigo. Nesta etapa os abrigos ficam na porta de três cabanas do lago (a cidade chega na etapa 2).
import * as T from './lib/three.module.js';
import { brilho, caixa } from './mundo.js';

export const ABRIGOS = [
  { id: 'barracao', nome: 'abrigo.barracao', cabana: 0 },
  { id: 'cabana_norte', nome: 'abrigo.cabana_norte', cabana: 2 },
  { id: 'cabana_sul', nome: 'abrigo.cabana_sul', cabana: 4 },
];
export const RAIO_SEGURO = 3.2, RAIO_USO = 1.7;

export function criarAbrigos(mundo) {
  const lista = ABRIGOS.map(a => {
    const cx = mundo.caixas[a.cabana % mundo.caixas.length].g.position;
    // altar: mesinha, vela e uma chama que pulsa quando acesa
    const g = new T.Group();
    g.add(caixa(0.6, 0.5, 0.4, '#4a2c2a', 0, 0.25, 0), caixa(0.66, 0.06, 0.46, '#2b1d2a', 0, 0.52, 0), caixa(0.1, 0.24, 0.1, '#f8e6a0', 0, 0.67, 0));
    const chama = caixa(0.07, 0.1, 0.07, brilho('#e8a850'), 0, 0.84, 0); g.add(chama);
    const luz = new T.PointLight('#e8a850', 0, 5, 1.4); luz.position.y = 1.0; g.add(luz);
    // marca no chão do raio seguro (círculo de sal)
    const sal = new T.Mesh(new T.RingGeometry(RAIO_SEGURO - 0.08, RAIO_SEGURO, 48), new T.MeshBasicMaterial({ color: '#c5d3e8', transparent: true, opacity: 0.35, side: T.DoubleSide }));
    sal.rotation.x = -Math.PI / 2; sal.position.y = 0.04; g.add(sal);
    g.position.set(cx.x + 1.1, 0, cx.z); mundo.scene.add(g);
    return { ...a, g, chama, luz, acesa: false };
  });
  return {
    lista,
    /** Abrigo ao alcance do jogador (para o botão "Descansar"), ou null. */
    perto(p) { return lista.find(a => a.g.position.distanceTo(p) < RAIO_USO) || null; },
    /** O jogador está dentro do raio seguro de algum abrigo? */
    dentro(p) { return lista.some(a => Math.hypot(a.g.position.x - p.x, a.g.position.z - p.z) < RAIO_SEGURO); },
    acender(id) { for (const a of lista) a.acesa = a.id === id || a.acesa; },
    porId: id => lista.find(a => a.id === id),
    /** Empurra uma criatura para fora dos raios seguros. */
    repelir(x, z) {
      for (const a of lista) { const dx = x - a.g.position.x, dz = z - a.g.position.z, d = Math.hypot(dx, dz);
        if (d < RAIO_SEGURO && d > 0) { x = a.g.position.x + dx / d * RAIO_SEGURO; z = a.g.position.z + dz / d * RAIO_SEGURO; } }
      return [x, z];
    },
    animar(t) { for (const a of lista) { a.chama.visible = a.acesa; a.luz.intensity = a.acesa ? 9 + Math.sin(t * 13 + a.cabana) * 1.5 : 0; a.chama.scale.y = 1 + Math.sin(t * 17) * 0.2; } },
  };
}
