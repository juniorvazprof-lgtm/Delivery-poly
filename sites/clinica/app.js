// Movimento Pleno - Fisioterapia - Scripts
(function () {
  'use strict';

  // ====== Menu mobile ======
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const navLinks = mainNav.querySelectorAll('a');

  if (navToggle && mainNav) {
    const toggleMenu = (open) => {
      const expanded = open ? 'true' : 'false';
      navToggle.setAttribute('aria-expanded', expanded);
      mainNav.classList.toggle('open', open);
    };

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      toggleMenu(!isOpen);
    });

    // Fecha o menu ao clicar em um link
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        toggleMenu(false);
      });
    });

    // Fecha com tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        toggleMenu(false);
        navToggle.focus();
      }
    });
  }

  // ====== Animação da linha do movimento ======
  const movementPath = document.querySelector('.movement-line path');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (movementPath && !prefersReducedMotion) {
    const pathLength = movementPath.getTotalLength();

    movementPath.style.strokeDasharray = pathLength;
    movementPath.style.strokeDashoffset = pathLength;
    movementPath.style.transition = 'stroke-dashoffset 2.5s ease-out 0.2s';

    // Força reflow para iniciar a transição
    void movementPath.getBoundingClientRect();

    // Define o offset para 0 para desenhar
    movementPath.style.strokeDashoffset = '0';
  } else if (movementPath && prefersReducedMotion) {
    // Sem animação, apenas exibe a linha
    movementPath.style.strokeDasharray = 'none';
    movementPath.style.strokeDashoffset = '0';
  }

  // ====== Formulário de agendamento ======
  const form = document.getElementById('scheduling-form');
  const messageContainer = document.getElementById('form-message');
  const whatsappLink = document.getElementById('whatsapp-link');

  if (form && messageContainer && whatsappLink) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Limpa mensagem anterior e esconde o botão do WhatsApp
      messageContainer.textContent = '';
      whatsappLink.hidden = true;

      // Campos
      const nomeInput = document.getElementById('nome');
      const telefoneInput = document.getElementById('telefone');
      const servicoSelect = document.getElementById('servico');
      const periodoRadios = document.querySelectorAll('input[name="periodo"]');

      // Validação simples
      let isValid = true;
      let errorMessage = '';

      if (nomeInput.value.trim() === '') {
        isValid = false;
        errorMessage = 'Por favor, informe seu nome.';
        nomeInput.focus();
      } else if (telefoneInput.value.trim() === '') {
        isValid = false;
        errorMessage = 'Por favor, informe seu telefone.';
        telefoneInput.focus();
      } else if (servicoSelect.value === '') {
        isValid = false;
        errorMessage = 'Por favor, selecione um serviço.';
        servicoSelect.focus();
      }

      if (!isValid) {
        messageContainer.textContent = errorMessage;
        messageContainer.setAttribute('role', 'status'); // já está definido no HTML
        return;
      }

      // Coleta período selecionado (se houver)
      let periodo = '';
      periodoRadios.forEach((radio) => {
        if (radio.checked) {
          periodo = radio.value;
        }
      });

      // Monta mensagem para WhatsApp
      const nome = nomeInput.value.trim();
      const telefone = telefoneInput.value.trim();
      const servico = servicoSelect.value;
      const msg = `Olá! Me chamo ${nome}. Gostaria de agendar uma sessão de ${servico}.${periodo ? ` Prefiro o período da ${periodo.toLowerCase()}.` : ''} Meu telefone para contato: ${telefone}.`;

      const encodedMsg = encodeURIComponent(msg);
      const waBase = 'https://wa.me/5500900000001?text=';
      whatsappLink.href = waBase + encodedMsg;
      whatsappLink.hidden = false;

      messageContainer.textContent = 'Mensagem montada! Clique no botão abaixo para abrir o WhatsApp com sua solicitação.';
      whatsappLink.focus();
    });
  }
})();
