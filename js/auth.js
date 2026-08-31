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

// ----- Permitir solo números en DNI y Teléfono -----
function validarSoloNumeros(e) {
  // Usar keydown para mejor compatibilidad cross-browser
  if (e.key && !/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    return;
  }
}

function limpiarNoNumeros(e) {
  // Limpiar cualquier carácter no numérico que se haya pegado o ingresado
  const valor = e.target.value;
  const soloNumeros = valor.replace(/\D/g, '');
  if (valor !== soloNumeros) {
    e.target.value = soloNumeros;
  }
}

function agregarValidadoresNumero(input) {
  if (!input) return;
  // Usar keydown para prevenir caracteres no numéricos
  input.addEventListener('keydown', validarSoloNumeros);
  // Limpiar paste events
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const texto = (e.clipboardData || window.clipboardData).getData('text');
    const soloNumeros = texto.replace(/\D/g, '');
    e.target.value = soloNumeros;
  });
  // Limpiar cualquier valor después de cambios
  input.addEventListener('input', limpiarNoNumeros);
}

// Agregar validadores al DNI
agregarValidadoresNumero(documentoInput);

// Agregar validadores al Teléfono
const telefonoInput = document.getElementById('telefonoInput');
agregarValidadoresNumero(telefonoInput);

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

// ----- Validación de Teléfono -----
function validarTelefono(valor) {
  const limpio = valor.replace(/\D/g, '');
  // Acepta teléfonos de 10 dígitos (formato argentino sin +54)
  // También acepta con +54 al inicio (12 dígitos)
  return /^\d{10}$/.test(limpio) || /^54\d{10}$/.test(limpio);
}

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
  console.log('📢 Mensaje:', texto, esExito ? '✅' : '❌');
  el.textContent = texto;
  el.hidden = false;
  el.classList.toggle('is-success', esExito);
}

// Traducciones básicas de errores Supabase
function traducirError(mensaje) {
  if (!mensaje) return 'Ocurrió un error. Probá de nuevo.';
  console.error('🔴 Error raw:', mensaje);
  
  const msgLower = mensaje.toLowerCase();
  
  if (msgLower.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (msgLower.includes('user already registered')) return 'Ese email ya está registrado.';
  if (msgLower.includes('email not confirmed')) return 'Todavía no confirmaste tu cuenta. Revisá tu email.';
  if (msgLower.includes('password should be at least')) return 'La contraseña debe tener al menos 8 caracteres.';
  if (msgLower.includes('invalid email')) return 'El email no es válido.';
  if (msgLower.includes('over_email_send_rate_limit')) return 'Demasiados intentos. Espera unos minutos.';
  if (msgLower.includes('network')) return 'Error de conexión. Revisá tu internet.';
  if (msgLower.includes('unauthorized')) return 'No autorizado. Probá de nuevo.';
  
  return mensaje;
}

// ----- Login -----
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.hidden = true;

  console.log('🔐 Login attempt started');
  
  const email = loginForm.querySelector('input[name="email"]').value.trim();
  const password = loginForm.querySelector('input[name="password"]').value;
  
  // Validaciones básicas
  if (!email) {
    mostrarMensaje(loginMessage, 'Ingresá tu email.');
    return;
  }
  if (!password) {
    mostrarMensaje(loginMessage, 'Ingresá tu contraseña.');
    return;
  }
  
  // Obtener token de Turnstile
  let captchaToken = null;
  if (window.turnstile && window.turnstileLoginId) {
    captchaToken = window.turnstile.getResponse(window.turnstileLoginId);
    console.log('🎯 Captcha token obtained:', !!captchaToken);
    if (!captchaToken) {
      mostrarMensaje(loginMessage, 'Por favor completa el captcha.');
      return;
    }
  } else {
    console.warn('⚠️ Turnstile not available, continuing without captcha');
  }
  
  const btn = loginForm.querySelector('.auth-submit');
  btn.disabled = true;
  btn.textContent = 'Iniciando sesión...';

  try {
    console.log('📡 Enviando solicitud de login a Supabase...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (error) {
      console.error('❌ Error en login:', error);
      mostrarMensaje(loginMessage, traducirError(error.message));
      if (window.turnstile) window.turnstile.reset(window.turnstileLoginId);
      btn.disabled = false;
      btn.textContent = 'INICIAR SESIÓN';
      return;
    }

    console.log('✅ Login exitoso', data);
    mostrarMensaje(loginMessage, '¡Listo! Iniciaste sesión.', true);
    setTimeout(() => { 
      window.location.href = 'index.html'; 
    }, 900);
  } catch (err) {
    console.error('❌ Exception en login:', err);
    mostrarMensaje(loginMessage, 'Error al iniciar sesión: ' + (err.message || err));
    if (window.turnstile) window.turnstile.reset(window.turnstileLoginId);
    btn.disabled = false;
    btn.textContent = 'INICIAR SESIÓN';
  }
});

// ----- Registro -----
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMessage.hidden = true;

  console.log('📝 Register attempt started');

  // Validar que el formulario sea válido según los validadores HTML
  if (!registerForm.checkValidity()) {
    mostrarMensaje(registerMessage, 'Completá todos los campos requeridos.');
    return;
  }

  const formData = new FormData(registerForm);
  const email = (formData.get('email') || '').trim();
  const password = formData.get('password');
  const passwordConfirm = formData.get('password_confirm');
  const accountType = formData.get('account_type');
  const razonSocial = (formData.get('razon_social') || '').trim();
  const nombre = (formData.get('nombre') || '').trim();
  const apellido = (formData.get('apellido') || '').trim();
  const documentoTipo = formData.get('documento_tipo') || 'dni';
  const documento = (formData.get('documento') || '').trim();
  const telefono = (formData.get('telefono') || '').trim();

  console.log('📋 Datos del formulario:', { email, accountType, nombre, apellido, telefono });

  // Validar teléfono obligatoriamente
  if (!email) {
    mostrarMensaje(registerMessage, 'El email es obligatorio.');
    return;
  }
  if (!telefono || telefono.length === 0) {
    mostrarMensaje(registerMessage, 'El teléfono es obligatorio y no puede estar vacío.');
    return;
  }
  if (!validarTelefono(telefono)) {
    mostrarMensaje(registerMessage, 'El teléfono debe tener 10 dígitos (ej: 0341 1234567).');
    return;
  }

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

  // Obtener token de Turnstile para registro
  let captchaToken = null;
  if (window.turnstile && window.turnstileRegisterId) {
    captchaToken = window.turnstile.getResponse(window.turnstileRegisterId);
    console.log('🎯 Captcha token para registro:', !!captchaToken);
    if (!captchaToken) {
      mostrarMensaje(registerMessage, 'Por favor completa el captcha.');
      return;
    }
  } else {
    console.warn('⚠️ Turnstile no disponible para registro, continuando sin captcha');
  }

  const btn = registerForm.querySelector('.auth-submit');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  try {
    console.log('📡 Enviando solicitud de registro a Supabase...');
    const redirectUrl = window.location.origin + '/index.html';
    console.log('📍 Email redirect URL:', redirectUrl);
    
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: accountType,
          razon_social: accountType === 'concesionaria' ? razonSocial : null,
          nombre: accountType === 'particular' ? nombre : null,
          apellido: accountType === 'particular' ? apellido : null,
          documento_tipo: accountType === 'particular' ? documentoTipo : null,
          documento: accountType === 'particular' ? documento.replace(/\D/g, '') : null,
          telefono: telefono.replace(/\D/g, ''),
        },
        emailRedirectTo: redirectUrl,
        captchaToken: captchaToken,
      },
    });

    if (error) {
      console.error('❌ Error en signup:', error);
      mostrarMensaje(registerMessage, traducirError(error.message));
      if (window.turnstile) window.turnstile.reset(window.turnstileRegisterId);
      btn.disabled = false;
      btn.textContent = 'CREAR CUENTA';
      return;
    }

    console.log('✅ Registro exitoso', data);
    console.log('📧 Revisa tu email para confirmar la cuenta');
    
    mostrarMensaje(registerMessage, 'Cuenta creada. Te enviamos un mail para confirmarla.', true);
    registerForm.reset();
    if (window.turnstile) window.turnstile.reset(window.turnstileRegisterId);
    btn.disabled = false;
    btn.textContent = 'CREAR CUENTA';
  } catch (err) {
    console.error('❌ Exception en signup:', err);
    mostrarMensaje(registerMessage, 'Error al crear cuenta: ' + (err.message || err));
    if (window.turnstile) window.turnstile.reset(window.turnstileRegisterId);
    btn.disabled = false;
    btn.textContent = 'CREAR CUENTA';
  }
});