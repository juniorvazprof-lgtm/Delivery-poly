// Boneco low poly (corpo, cabeça, braços e pernas) com animações simples: andar, digitar e pensar.
// A etiqueta "IA"/"ROTEIRO" e o balão de fala são camadas HTML (ver ui/rotulos.js), nítidas de qualquer ângulo.
import * as T from '../three.module.js';
import { rota } from '../engine/nav.js';

export const AGENTES = [
  { id: 'gerente', nome: 'Gerente', tipo: 'ia', cor: '#3B82F6', roupa: '#2F5DA8', cabelo: '#3A2A1E' },
  { id: 'designer', nome: 'Designer', tipo: 'ia', cor: '#A855F7', roupa: '#7C3AED', cabelo: '#C2410C' },
  { id: 'programador', nome: 'Programador', tipo: 'ia', cor: '#22C55E', roupa: '#15803D', cabelo: '#1F2937' },
  { id: 'revisor', nome: 'Revisor', tipo: 'ia', cor: '#F97316', roupa: '#C2410C', cabelo: '#6B4423' },
  { id: 'cliente', nome: 'Cliente', tipo: 'bot', cor: '#9CA3AF', roupa: '#B45309', cabelo: '#111827' },
  { id: 'estagiario', nome: 'Estagiário', tipo: 'bot', cor: '#9CA3AF', roupa: '#0EA5E9', cabelo: '#92400E' },
  { id: 'recepcionista', nome: 'Recepcionista', tipo: 'bot', cor: '#9CA3AF', roupa: '#DB2777', cabelo: '#451A03' },
  { id: 'suporte', nome: 'Suporte', tipo: 'bot', cor: '#9CA3AF', roupa: '#475569', cabelo: '#000000' },
  { id: 'analista', nome: 'Analista', tipo: 'bot', cor: '#9CA3AF', roupa: '#0F766E', cabelo: '#78350F' },
  { id: 'faxineiro', nome: 'Copeiro', tipo: 'bot', cor: '#9CA3AF', roupa: '#65A30D', cabelo: '#374151' },
];
const PELES = ['#F2C9A0', '#D9A066', '#A86B3C', '#7A4A2A', '#F5D7B8'];

const mat = c => new T.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
function peca(geo, m, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; }

export function criarAgente(def, i) {
  const g = new T.Group(), corpo = new T.Group(); g.add(corpo);
  const pele = mat(PELES[i % PELES.length]), roupa = mat(def.roupa), calca = mat('#374151'), cabelo = mat(def.cabelo);
  // pernas com pivô no quadril
  const pernas = [-0.14, 0.14].map(x => { const p = new T.Group(); p.position.set(x, 0.72, 0); p.add(peca(new T.BoxGeometry(0.18, 0.7, 0.2), calca, 0, -0.35, 0), peca(new T.BoxGeometry(0.2, 0.1, 0.3), mat('#1F2937'), 0, -0.68, 0.05)); corpo.add(p); return p; });
  corpo.add(peca(new T.CylinderGeometry(0.28, 0.32, 0.8, 7), roupa, 0, 1.12, 0));
  const cabeca = new T.Group(); cabeca.position.set(0, 1.78, 0); corpo.add(cabeca);
  cabeca.add(peca(new T.IcosahedronGeometry(0.28, 1), pele, 0, 0, 0), peca(new T.IcosahedronGeometry(0.29, 0), cabelo, 0, 0.1, -0.06));
  cabeca.add(peca(new T.BoxGeometry(0.06, 0.06, 0.02), mat('#111827'), -0.1, 0.02, 0.26), peca(new T.BoxGeometry(0.06, 0.06, 0.02), mat('#111827'), 0.1, 0.02, 0.26));
  // braços com pivô no ombro
  const bracos = [-0.36, 0.36].map(x => { const b = new T.Group(); b.position.set(x, 1.45, 0); b.add(peca(new T.BoxGeometry(0.14, 0.6, 0.14), roupa, 0, -0.28, 0), peca(new T.BoxGeometry(0.13, 0.13, 0.13), pele, 0, -0.62, 0)); corpo.add(b); return b; });
  // anel luminoso do agente ativo
  const anel = new T.Mesh(new T.RingGeometry(0.6, 0.78, 28), new T.MeshBasicMaterial({ color: def.cor, transparent: true, opacity: 0, side: T.DoubleSide }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.03; g.add(anel);
  const a = {
    def, g, alvo: null, rota: [], acao: 'parado', ativo: false, t: Math.random() * 6, fala: null,
    /** Anda até o ponto [x, z]; chegando, faz `depois` ('parado', 'digitando', 'sentado'). */
    irPara(x, z, depois = 'parado') {
      a.rota = rota(a.g.position.x, a.g.position.z, x, z); a.depois = depois;
      if (!a.rota.length) { a.alvo = null; a.acao = depois; return; }
      a.alvo = new T.Vector3(a.rota[0][0], 0, a.rota[0][1]); a.acao = 'andando';
    },
    olharPara(x, z) { a.g.rotation.y = Math.atan2(x - a.g.position.x, z - a.g.position.z); },
    animar(dt) {
      a.t += dt;
      if (a.acao === 'andando' && a.alvo) {
        const d = a.alvo.clone().sub(a.g.position); d.y = 0; const dist = d.length(), v = 1.6;
        if (dist < 0.05) { a.g.position.copy(a.alvo); a.rota.shift(); if (a.rota.length) a.alvo.set(a.rota[0][0], 0, a.rota[0][1]); else { a.alvo = null; a.acao = a.depois; } }
        else { d.normalize(); a.g.position.addScaledVector(d, Math.min(dist, v * dt)); let ang = Math.atan2(d.x, d.z) - a.g.rotation.y; ang = Math.atan2(Math.sin(ang), Math.cos(ang)); a.g.rotation.y += ang * Math.min(1, dt * 10); }
      }
      const s = Math.sin(a.t * 8);
      if (a.acao === 'andando') { pernas[0].rotation.x = s * 0.6; pernas[1].rotation.x = -s * 0.6; bracos[0].rotation.x = -s * 0.5; bracos[1].rotation.x = s * 0.5; corpo.position.y = Math.abs(Math.cos(a.t * 8)) * 0.06; corpo.rotation.z = 0; }
      else if (a.acao === 'digitando') { pernas[0].rotation.x = pernas[1].rotation.x = 0; const k = Math.sin(a.t * 22) * 0.12; bracos[0].rotation.x = -1.2 + k; bracos[1].rotation.x = -1.2 - k; corpo.position.y = 0; cabeca.rotation.x = 0.15; }
      else { pernas[0].rotation.x *= 0.8; pernas[1].rotation.x *= 0.8; bracos[0].rotation.x *= 0.85; bracos[1].rotation.x *= 0.85; corpo.position.y = Math.sin(a.t * 2) * 0.01; cabeca.rotation.x = a.acao === 'pensando' ? -0.2 + Math.sin(a.t * 1.5) * 0.08 : 0; }
      anel.material.opacity += ((a.ativo ? 0.55 + Math.sin(a.t * 4) * 0.25 : 0) - anel.material.opacity) * Math.min(1, dt * 6);
      anel.scale.setScalar(1 + (a.ativo ? Math.sin(a.t * 4) * 0.06 : 0));
    },
  };
  return a;
}
