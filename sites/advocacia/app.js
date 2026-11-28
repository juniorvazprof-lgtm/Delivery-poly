document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('form-contato');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      status.textContent = 'Demonstração: esta mensagem não foi enviada. Em um site real, você receberia uma confirmação.';
      form.reset();
    });
  }
});
