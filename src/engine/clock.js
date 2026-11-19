// Relógio da simulação: tempo virtual, velocidade e pausa.
// Nada aqui usa DOM nem setTimeout — quem avança o tempo é o loop de render.

const VELOCIDADES = [0.25, 0.5, 1, 2];
const DT_MAX = 0.1; // no máximo 100 ms reais por quadro

export function criarRelogio() {
  const estado = {
    tempo: 0, // segundos de simulação
    velocidade: 1,
    pausado: false,
  };

  let agendamentos = []; // { id, quando, ordem, fn }
  let proximoId = 1;
  let ordem = 0;
  const ouvintes = [];

  function avisar() {
    for (const fn of ouvintes.slice()) {
      try {
        fn(estado);
      } catch (e) {
        console.error('clock: erro no ouvinte', e);
      }
    }
  }

  // Dispara quem já venceu, na ordem do tempo (e da inscrição em caso de empate).
  function disparar() {
    if (!agendamentos.some((a) => a.quando <= estado.tempo)) return;
    const prontos = agendamentos.filter((a) => a.quando <= estado.tempo);
    agendamentos = agendamentos.filter((a) => a.quando > estado.tempo);
    prontos.sort((a, b) => a.quando - b.quando || a.ordem - b.ordem);
    for (const a of prontos) {
      try {
        a.fn(estado.tempo);
      } catch (e) {
        console.error('clock: erro no agendamento', e);
      }
    }
  }

  function avancar(dtReal) {
    if (estado.pausado) return 0;
    const bruto = Number(dtReal);
    if (!Number.isFinite(bruto) || bruto <= 0) return 0;
    const dt = Math.min(bruto, DT_MAX) * estado.velocidade;
    estado.tempo += dt;
    disparar();
    return dt;
  }

  function pausar() {
    if (estado.pausado) return;
    estado.pausado = true;
    avisar();
  }

  function continuar() {
    if (!estado.pausado) return;
    estado.pausado = false;
    avisar();
  }

  function alternar() {
    estado.pausado = !estado.pausado;
    avisar();
    return !estado.pausado; // true = rodando
  }

  function setVelocidade(v) {
    if (!VELOCIDADES.includes(v)) return estado.velocidade; // ignora inválidos
    if (v === estado.velocidade) return estado.velocidade;
    estado.velocidade = v;
    avisar();
    return estado.velocidade;
  }

  // Agenda fn para quando o tempo de simulação chegar a tempo + seg.
  function depois(seg, fn) {
    if (typeof fn !== 'function') return null;
    const espera = Number(seg);
    const quando = estado.tempo + (Number.isFinite(espera) && espera > 0 ? espera : 0);
    const id = proximoId++;
    agendamentos.push({ id, quando, ordem: ordem++, fn });
    return id;
  }

  function cancelar(id) {
    const antes = agendamentos.length;
    agendamentos = agendamentos.filter((a) => a.id !== id);
    return agendamentos.length !== antes;
  }

  // Avisa quando pausa ou velocidade mudam. Devolve função para cancelar.
  function aoMudar(fn) {
    if (typeof fn !== 'function') return () => {};
    ouvintes.push(fn);
    return () => {
      const i = ouvintes.indexOf(fn);
      if (i >= 0) ouvintes.splice(i, 1);
    };
  }

  return {
    estado,
    get tempo() {
      return estado.tempo;
    },
    get velocidade() {
      return estado.velocidade;
    },
    get pausado() {
      return estado.pausado;
    },
    avancar,
    pausar,
    continuar,
    alternar,
    setVelocidade,
    depois,
    cancelar,
    aoMudar,
    velocidades: VELOCIDADES.slice(),
  };
}
