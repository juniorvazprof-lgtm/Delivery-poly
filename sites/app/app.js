document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('form-cadastro');
  const mensagem = document.getElementById('mensagem-cadastro');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const nome = document.getElementById('nome').value.trim();
    mensagem.textContent = `Demonstração: conta de ${nome} criada com sucesso (nenhum dado foi enviado).`;
    form.reset();
  });
});
