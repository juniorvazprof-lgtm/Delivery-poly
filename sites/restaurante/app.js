(function() {
  'use strict';

  // ===== Estado do carrinho =====
  const carrinho = new Map(); // chave: nome, valor: { nome, preco, quantidade }

  // ===== Elementos DOM =====
  const botoesAdicionar = document.querySelectorAll('.btn-adicionar');
  const itensCarrinhoEl = document.getElementById('itens-carrinho');
  const totalCarrinhoEl = document.getElementById('total-carrinho');
  const btnPedirWhatsApp = document.getElementById('btn-pedir-whatsapp');
  const statusHorarioEl = document.getElementById('status-horario');
  const carrinhoFixoEl = document.getElementById('carrinho');
  const bodyEl = document.body;

  // ===== Funções de atualização do carrinho =====
  function atualizarCarrinho() {
    let totalItens = 0;
    let totalPreco = 0;

    carrinho.forEach(item => {
      totalItens += item.quantidade;
      totalPreco += item.preco * item.quantidade;
    });

    itensCarrinhoEl.textContent = `${totalItens} item(ns)`;
    totalCarrinhoEl.textContent = `Total: R$ ${totalPreco.toFixed(2).replace('.', ',')}`;
  }

  function atualizarVisibilidadeCarrinho() {
    if (carrinho.size > 0) {
      carrinhoFixoEl.classList.add('visivel');
      bodyEl.classList.add('cart-aberto');
    } else {
      carrinhoFixoEl.classList.remove('visivel');
      bodyEl.classList.remove('cart-aberto');
    }
  }

  function montarMensagemPedido() {
    if (carrinho.size === 0) {
      return 'Olá, gostaria de fazer um pedido.';
    }

    let mensagem = 'Olá, gostaria de fazer um pedido:';
    let total = 0;

    carrinho.forEach(item => {
      const subtotal = item.preco * item.quantidade;
      total += subtotal;
      const precoFormatado = item.preco.toFixed(2).replace('.', ',');
      const subtotalFormatado = subtotal.toFixed(2).replace('.', ',');
      mensagem += `\n- ${item.nome} (R$ ${precoFormatado}) x${item.quantidade} = R$ ${subtotalFormatado}`;
    });

    const totalFormatado = total.toFixed(2).replace('.', ',');
    mensagem += `\nTotal: R$ ${totalFormatado}`;
    return mensagem;
  }

  function abrirWhatsApp() {
    const mensagem = montarMensagemPedido();
    const url = `https://wa.me/5500900000000?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener');
  }

  // ===== Manipuladores de eventos =====
  botoesAdicionar.forEach(botao => {
    botao.addEventListener('click', function() {
      const nome = this.dataset.nome;
      const preco = parseFloat(this.dataset.preco);

      if (carrinho.has(nome)) {
        carrinho.get(nome).quantidade += 1;
      } else {
        carrinho.set(nome, { nome, preco, quantidade: 1 });
      }

      atualizarCarrinho();
      atualizarVisibilidadeCarrinho();
    });
  });

  btnPedirWhatsApp.addEventListener('click', abrirWhatsApp);

  // ===== Horário de funcionamento =====
  function verificarStatusHorario() {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = Domingo, 1 = Segunda, ...
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    const horarioAtual = hora * 60 + minutos;

    // Horários por dia (em minutos)
    const horarios = {
      0: { abre: 11 * 60, fecha: 22 * 60 }, // Domingo
      1: null, // Segunda fechado
      2: { abre: 18 * 60, fecha: 23 * 60 }, // Terça
      3: { abre: 18 * 60, fecha: 23 * 60 }, // Quarta
      4: { abre: 18 * 60, fecha: 23 * 60 }, // Quinta
      5: { abre: 18 * 60, fecha: 23 * 60 }, // Sexta
      6: { abre: 11 * 60, fecha: 23 * 60 }  // Sábado
    };

    const horarioDia = horarios[diaSemana];
    let aberto = false;

    if (horarioDia) {
      aberto = horarioAtual >= horarioDia.abre && horarioAtual < horarioDia.fecha;
    }

    statusHorarioEl.classList.remove('aberto', 'fechado');
    if (aberto) {
      statusHorarioEl.textContent = 'Aberto agora';
      statusHorarioEl.classList.add('aberto');
    } else {
      if (horarioDia === null) {
        statusHorarioEl.textContent = 'Fechado hoje';
      } else {
        const horaAbre = Math.floor(horarioDia.abre / 60);
        const minAbre = horarioDia.abre % 60;
        const horaFecha = Math.floor(horarioDia.fecha / 60);
        const minFecha = horarioDia.fecha % 60;
        const formatarHora = (h, m) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const abreStr = formatarHora(horaAbre, minAbre);
        const fechaStr = formatarHora(horaFecha, minFecha);
        statusHorarioEl.textContent = `Fechado agora — abre às ${abreStr} e fecha às ${fechaStr}`;
      }
      statusHorarioEl.classList.add('fechado');
    }

    destacarDiaAtual(diaSemana);
  }

  function destacarDiaAtual(diaSemana) {
    // Remove aria-current de todas as linhas
    document.querySelectorAll('.horario-table tbody tr[aria-current]').forEach(tr => {
      tr.removeAttribute('aria-current');
    });

    // Adiciona na linha correspondente
    const linhaAtual = document.querySelector(`.horario-table tbody tr[data-dia="${diaSemana}"]`);
    if (linhaAtual) {
      linhaAtual.setAttribute('aria-current', 'date');
    }
  }

  // ===== Inicialização =====
  function init() {
    atualizarCarrinho();
    atualizarVisibilidadeCarrinho();
    verificarStatusHorario();
  }

  // Executa ao carregar
  init();

  // Atualiza o status do horário a cada minuto
  setInterval(verificarStatusHorario, 60000);
})();
