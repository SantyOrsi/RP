// public/js/auth.js
// Maneja las tabs (iniciar sesión / crear cuenta), el selector de tipo
// de cuenta (particular / concesionaria) y el registro/login contra
// Supabase Auth.

// ----- Tabs -----
const tabs = document.querySelectorAll('.auth-tab');
const panels = {
  login: document.getElementById('panel-login'),
  register: document.getElementById('panel-register'),
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');

    Object.values(panels).forEach(p => p.classList.remove('is-active'));
    panels[tab.dataset.tab].classList.add('is-active');
  });
});

// ----- Selector de tipo de cuenta (particular / concesionaria) -----
const accountTypeBtns = document.querySelectorAll('.account-type-btn');
const accountTypeInput = document.querySelector('#registerForm input[name="account_type"]');
const fieldRazonSocial = document.getElementById('fieldRazonSocial');
const razonSocialInput = fieldRazonSocial.querySelector('input[name="razon_social"]');
const fieldDatosPersonales = document.getElementById('fieldDatosPersonales');
const nombreInput = fieldDatosPersonales.querySelector('input[name="nombre"]');
const apellidoInput = fieldDatosPersonales.querySelector('input[name="apellido"]');
const dniInput = fieldDatosPersonales.querySelector('input[name="dni"]');

accountTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    accountTypeBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-checked', 'true');

    const tipo = btn.dataset.accountType;
    accountTypeInput.value = tipo;

    const esConcesionaria = tipo === 'concesionaria';
    fieldRazonSocial.hidden = !esConcesionaria;
    razonSocialInput.required = esConcesionaria;
    if (!esConcesionaria) razonSocialInput.value = '';

    fieldDatosPersonales.hidden = esConcesionaria;
    nombreInput.required = !esConcesionaria;
    apellidoInput.required = !esConcesionaria;
    dniInput.required = !esConcesionaria;
    if (esConcesionaria) {
      nombreInput.value = '';
      apellidoInput.value = '';
      dniInput.value = '';
    }
  });
});

// ----- Helper para mostrar mensajes -----
function mostrarMensaje(el, texto, esExito = false) {
  el.textContent = texto;
  el.hidden = false;
  el.classList.toggle('is-success', esExito);
}

// Traducciones básicas de los errores más comunes que devuelve Supabase
function traducirError(mensaje) {
  if (!mensaje) return 'Ocurrió un error. Probá de nuevo.';
  if (mensaje.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (mensaje.includes('User already registered')) return 'Ese email ya está registrado.';
  if (mensaje.includes('Email not confirmed')) return 'Todavía no confirmaste tu cuenta. Revisá tu email.';
  if (mensaje.includes('Password should be at least')) return 'La contraseña debe tener al menos 8 caracteres.';
  return mensaje;
}

// ----- Login -----
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.hidden = true;

  const datos = Object.fromEntries(new FormData(loginForm));
  const btn = loginForm.querySelector('.auth-submit');
  btn.disabled = true;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
  });

  if (error) {
    mostrarMensaje(loginMessage, traducirError(error.message));
    btn.disabled = false;
    return;
  }

  mostrarMensaje(loginMessage, '¡Listo! Iniciaste sesión.', true);
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
});

// ----- Registro -----
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMessage.hidden = true;

  const formData = new FormData(registerForm);
  const password = formData.get('password');
  const passwordConfirm = formData.get('password_confirm');
  const accountType = formData.get('account_type');
  const razonSocial = (formData.get('razon_social') || '').trim();
  const nombre = (formData.get('nombre') || '').trim();
  const apellido = (formData.get('apellido') || '').trim();
  const dni = (formData.get('dni') || '').trim();

  if (password !== passwordConfirm) {
    mostrarMensaje(registerMessage, 'Las contraseñas no coinciden.');
    return;
  }
  if (password.length < 8) {
    mostrarMensaje(registerMessage, 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (accountType === 'concesionaria' && razonSocial.length < 3) {
    mostrarMensaje(registerMessage, 'Ingresá la razón social de la concesionaria (mínimo 3 caracteres).');
    return;
  }
  if (accountType === 'particular') {
    if (nombre.length < 2 || apellido.length < 2) {
      mostrarMensaje(registerMessage, 'Ingresá tu nombre y apellido.');
      return;
    }
    if (!/^\d{7,8}$/.test(dni)) {
      mostrarMensaje(registerMessage, 'Ingresá un DNI válido (7 u 8 dígitos).');
      return;
    }
  }

  const btn = registerForm.querySelector('.auth-submit');
  btn.disabled = true;

  const { error } = await supabaseClient.auth.signUp({
    email: formData.get('email'),
    password,
    options: {
      // Esto viaja como metadata al trigger de Postgres que crea
      // la fila en la tabla profiles (ver supabase-schema.sql).
      data: {
        account_type: accountType,
        razon_social: accountType === 'concesionaria' ? razonSocial : null,
        nombre: accountType === 'particular' ? nombre : null,
        apellido: accountType === 'particular' ? apellido : null,
        dni: accountType === 'particular' ? dni : null,
      },
      emailRedirectTo: window.location.origin + '/index.html',
    },
  });

  if (error) {
    mostrarMensaje(registerMessage, traducirError(error.message));
    btn.disabled = false;
    return;
  }

  mostrarMensaje(registerMessage, 'Cuenta creada. Te enviamos un mail para confirmarla.', true);
  registerForm.reset();
  btn.disabled = false;
});
