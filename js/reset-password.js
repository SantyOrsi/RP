// public/js/reset-password.js
// Página a la que llega el usuario desde el mail de "restablecer contraseña".
// Como supabase-client.js usa flowType 'implicit', el link trae el token en el
// hash (#access_token=...&type=recovery) y supabase-js lo procesa solo,
// disparando el evento PASSWORD_RECOVERY.

(function () {
  const panels = {
    checking: document.getElementById('panel-checking'),
    invalid: document.getElementById('panel-invalid'),
    reset: document.getElementById('panel-reset'),
  };
  const resetForm = document.getElementById('resetForm');
  const resetMessage = document.getElementById('resetMessage');

  let recuperacionValida = false;

  function mostrarPanel(nombre) {
    Object.values(panels).forEach(p => p.classList.remove('is-active'));
    panels[nombre].classList.add('is-active');
  }

  function mostrarMensaje(texto, esExito = false) {
    resetMessage.textContent = texto;
    resetMessage.hidden = false;
    resetMessage.classList.toggle('is-success', esExito);
  }

  function traducirError(mensaje) {
    const m = (mensaje || '').toLowerCase();
    if (m.includes('different from the old password') || m.includes('same password'))
      return 'La contraseña nueva tiene que ser distinta a la anterior.';
    if (m.includes('at least')) return 'La contraseña debe tener al menos 8 caracteres.';
    if (m.includes('weak') || m.includes('pwned')) return 'Esa contraseña es muy débil o está filtrada. Elegí otra.';
    if (m.includes('session') || m.includes('jwt') || m.includes('expired'))
      return 'El link venció. Pedí uno nuevo desde iniciar sesión.';
    if (m.includes('network')) return 'Error de conexión. Revisá tu internet.';
    return mensaje || 'Ocurrió un error. Probá de nuevo.';
  }

  // Supabase avisa cuando el link del mail es válido
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recuperacionValida = true;
      mostrarPanel('reset');
      // Sacamos el token de la barra de direcciones
      history.replaceState(null, '', window.location.pathname);
    }
  });

  // Si en unos segundos no llegó el evento, el link es inválido/vencido
  // (o entraron a la página directo sin pasar por el mail).
  setTimeout(() => {
    if (!recuperacionValida) mostrarPanel('invalid');
  }, 3500);

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMessage.hidden = true;

    const password = resetForm.querySelector('input[name="password"]').value;
    const confirm = resetForm.querySelector('input[name="password_confirm"]').value;

    if (password.length < 8) {
      mostrarMensaje('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      mostrarMensaje('Las contraseñas no coinciden.');
      return;
    }

    const btn = resetForm.querySelector('.auth-submit');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const { error } = await supabaseClient.auth.updateUser({ password });

      if (error) {
        console.error('❌ Error en updateUser:', error);
        mostrarMensaje(traducirError(error.message));
        btn.disabled = false;
        btn.textContent = 'GUARDAR CONTRASEÑA';
        return;
      }

      mostrarMensaje('¡Listo! Cambiaste tu contraseña. Te llevamos a iniciar sesión...', true);
      resetForm.querySelectorAll('input').forEach(i => { i.disabled = true; });

      // Cerramos la sesión de recuperación para que entre con la contraseña nueva
      await supabaseClient.auth.signOut();
      setTimeout(() => { window.location.href = 'auth.html'; }, 2200);
    } catch (err) {
      console.error('❌ Exception en updateUser:', err);
      mostrarMensaje('Error de conexión. Probá de nuevo.');
      btn.disabled = false;
      btn.textContent = 'GUARDAR CONTRASEÑA';
    }
  });
})();
