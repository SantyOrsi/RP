// public/js/password-reset.js
// Flujo "¿Olvidaste tu contraseña?" dentro de auth.html.
// Se carga DESPUÉS de auth.js (usa mostrarMensaje, esProbablementeBot y
// traducirError que están definidas ahí) y de supabase-client.js.

(function () {
  const COOLDOWN_SEG = 60; // evita mandar mails en ráfaga desde el mismo navegador

  const tabsBar = document.querySelector('.auth-tabs');
  const panelLogin = document.getElementById('panel-login');
  const panelForgot = document.getElementById('panel-forgot');
  const forgotLink = document.getElementById('forgotLink');
  const forgotBack = document.getElementById('forgotBack');
  const forgotForm = document.getElementById('forgotForm');
  const forgotMessage = document.getElementById('forgotMessage');
  const loginForm = document.getElementById('loginForm');

  function abrirForgot() {
    // Pasamos el email que ya escribió en el login, para ahorrarle un paso
    const emailLogin = loginForm.querySelector('input[name="email"]').value.trim();
    if (emailLogin) forgotForm.querySelector('input[name="email"]').value = emailLogin;

    panelLogin.classList.remove('is-active');
    panelForgot.classList.add('is-active');
    tabsBar.hidden = true;
    forgotMessage.hidden = true;
    forgotForm.querySelector('input[name="email"]').focus();
  }

  function cerrarForgot() {
    panelForgot.classList.remove('is-active');
    panelLogin.classList.add('is-active');
    tabsBar.hidden = false;
    forgotMessage.hidden = true;
  }

  forgotLink.addEventListener('click', abrirForgot);
  forgotBack.addEventListener('click', cerrarForgot);

  // Si toca una tab mientras el panel está abierto, lo cerramos
  // (auth.js ya activa el panel que corresponde).
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panelForgot.classList.remove('is-active');
      tabsBar.hidden = false;
    });
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotMessage.hidden = true;

    if (esProbablementeBot(forgotForm)) {
      mostrarMensaje(forgotMessage, 'No se pudo enviar el mail. Probá de nuevo.');
      return;
    }

    const email = forgotForm.querySelector('input[name="email"]').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      mostrarMensaje(forgotMessage, 'Ingresá un email válido.');
      return;
    }

    const btn = forgotForm.querySelector('.auth-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      // Link absoluto a la página de restablecimiento (funciona en localhost y en producción).
      // Tiene que estar en Supabase > Authentication > URL Configuration > Redirect URLs.
      const redirectTo = new URL('reset-password.html', window.location.href).href;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        console.error('❌ Error en resetPasswordForEmail:', error);
        mostrarMensaje(forgotMessage, traducirError(error.message));
        btn.disabled = false;
        btn.textContent = 'ENVIAR LINK';
        return;
      }

      // Mensaje genérico a propósito: no revelamos si el email existe o no.
      mostrarMensaje(
        forgotMessage,
        'Si ese email tiene una cuenta, te enviamos un link para restablecer la contraseña. Revisá también spam.',
        true
      );
    } catch (err) {
      console.error('❌ Exception en reset:', err);
      mostrarMensaje(forgotMessage, 'Error de conexión. Probá de nuevo.');
      btn.disabled = false;
      btn.textContent = 'ENVIAR LINK';
      return;
    }

    // Cooldown del botón
    let restante = COOLDOWN_SEG;
    btn.textContent = `REENVIAR EN ${restante}s`;
    const timer = setInterval(() => {
      restante -= 1;
      if (restante <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'ENVIAR LINK';
      } else {
        btn.textContent = `REENVIAR EN ${restante}s`;
      }
    }, 1000);
  });
})();
