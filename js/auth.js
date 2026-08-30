// public/js/auth.js

// ----- Turnstile (captcha) -----
const TURNSTILE_SITE_KEY = '0x4AAAAAAEgO0vN3QbVTSUnS';
let turnstileLoginId = null;
let turnstileRegisterId = null;

window.onTurnstileReady = function () {
  turnstileLoginId = window.turnstile.render('#turnstileLogin', {
    sitekey: TURNSTILE_SITE_KEY,
    theme: 'dark',
  });
};

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

    if (tab.dataset.tab === 'register' && turnstileRegisterId === null && window.turnstile) {
      turnstileRegisterId = window.turnstile.render('#turnstileRegister', {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
      });
    }
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
const documentoInput = document.getElementById('documentoInput');

function actualizarCamposPorTipoDeCuenta(tipo) {
  accountTypeInput.value = tipo;
  const esConcesionaria = tipo === 'concesionaria';

  if (esConcesionaria) {
    // Si es CONCESIONARIA: muestra Razón Social y oculta Datos Personales
    fieldRazonSocial.removeAttribute('hidden');
    razonSocialInput.required = true;

    fieldDatosPersonales.setAttribute('hidden', '');
    nombreInput.required = false;
    apellidoInput.required = false;
    documentoInput.required = false;

    nombreInput.value = '';
    apellidoInput.value = '';
    documentoInput.value = '';
  } else {
    // Si es PARTICULAR: oculta Razón Social y muestra Datos Personales (Nombre, Apellido, DNI/CUIT)
    fieldRazonSocial.setAttribute('hidden', '');
    razonSocialInput.required = false;
    razonSocialInput.value = '';

    fieldDatosPersonales.removeAttribute('hidden');
    nombreInput.required = true;
    apellidoInput.required = true;
    documentoInput.required = true;
  }
}

accountTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    accountTypeBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-checked', 'true');
    actualizarCamposPorTipoDeCuenta(btn.dataset.accountType);
  });
});

// Sincroniza los campos al cargar la página segun el botón activo
const tipoInicial = document.querySelector('.account-type-btn.is-active')?.dataset.accountType || 'particular';
actualizarCamposPorTipoDeCuenta(tipoInicial);

// ----- Selector de tipo de documento (DNI / CUIT), solo para particular -----
const docTypeBtns = document.querySelectorAll('.doc-type-btn');
const docTypeInput = document.querySelector('#registerForm input[name="documento_tipo"]');
const documentoLabel = document.getElementById('documentoLabel');

docTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    docTypeBtns.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('is-active');
    btn.setAttribute('aria-checked', 'true');

    const tipo = btn.dataset.docType; // 'dni' o 'cuit'
    docTypeInput.value = tipo;
    documentoInput.value = '';

    if (tipo === 'cuit') {
      documentoLabel.textContent = 'CUIT';
      documentoInput.placeholder = 'Ej: 20345678901';
      documentoInput.maxLength = 13;
    } else {
      documentoLabel.textContent = 'DNI';
      documentoInput.placeholder = 'Ej: 30123456';
      documentoInput.maxLength = 8;
    }
  });
});

// ----- Validación de DNI -----
function validarDni(valor) {
  const limpio = valor.replace(/\D/g, '');
  return /^\d{7,8}$/.test(limpio);
}

// ----- Validación de CUIT -----
function validarCuit(valor) {
  const limpio = valor.replace(/\D/g, '');
  if (!/^\d{11}$/.test(limpio)) return false;

  const digitos = limpio.split('').map(Number);
  const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = digitos.slice(0, 10).reduce((acc, d, i) => acc + d * multiplicadores[i], 0);
  const resto = suma % 11;
  let verificador = 11 - resto;
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 9;

  return verificador === digitos[10];
}

// ----- Helper para mostrar mensajes -----
function mostrarMensaje(el, texto, esExito = false) {
  el.textContent = texto;
  el.hidden = false;
  el.classList.toggle('is-success', esExito);
}

// Traducciones básicas de errores Supabase
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
    options: { captchaToken: datos['cf-turnstile-response'] },
  });

  if (error) {
    mostrarMensaje(loginMessage, traducirError(error.message));
    if (window.turnstile) window.turnstile.reset(turnstileLoginId);
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
  const documentoTipo = formData.get('documento_tipo') || 'dni';
  const documento = (formData.get('documento') || '').trim();

  if (password !== passwordConfirm) {
    mostrarMensaje(registerMessage, 'Las contraseñas no coinciden.');
    return;
  }
  if (password.length < 8) {
    mostrarMensaje(registerMessage, 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }

  if (accountType === 'concesionaria') {
    if (razonSocial.length < 3) {
      mostrarMensaje(registerMessage, 'Ingresá la razón social de la concesionaria (mínimo 3 caracteres).');
      return;
    }
  } else {
    if (nombre.length < 2 || apellido.length < 2) {
      mostrarMensaje(registerMessage, 'Ingresá tu nombre y apellido.');
      return;
    }
    if (documentoTipo === 'cuit') {
      if (!validarCuit(documento)) {
        mostrarMensaje(registerMessage, 'El CUIT ingresado no es válido. Revisá los 11 números.');
        return;
      }
    } else {
      if (!validarDni(documento)) {
        mostrarMensaje(registerMessage, 'El DNI ingresado no es válido (debe tener 7 u 8 números).');
        return;
      }
    }
  }

  const btn = registerForm.querySelector('.auth-submit');
  btn.disabled = true;

  const { error } = await supabaseClient.auth.signUp({
    email: formData.get('email'),
    password,
    options: {
      data: {
        account_type: accountType,
        razon_social: accountType === 'concesionaria' ? razonSocial : null,
        nombre: accountType === 'particular' ? nombre : null,
        apellido: accountType === 'particular' ? apellido : null,
        documento_tipo: accountType === 'particular' ? documentoTipo : null,
        documento: accountType === 'particular' ? documento.replace(/\D/g, '') : null,
      },
      emailRedirectTo: window.location.origin + '/index.html',
      captchaToken: formData.get('cf-turnstile-response'),
    },
  });

  if (error) {
    mostrarMensaje(registerMessage, traducirError(error.message));
    if (window.turnstile) window.turnstile.reset(turnstileRegisterId);
    btn.disabled = false;
    return;
  }

  mostrarMensaje(registerMessage, 'Cuenta creada. Te enviamos un mail para confirmarla.', true);
  registerForm.reset();
  if (window.turnstile) window.turnstile.reset(turnstileRegisterId);
  btn.disabled = false;
});