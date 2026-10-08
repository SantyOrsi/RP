// public/js/admin.js
// Login del admin, chequeo de permiso (profiles.is_admin) y el CRUD
// de eventos contra Supabase. Las políticas RLS son las que realmente
// bloquean a cualquiera que no sea admin — este archivo solo hace que
// la experiencia sea prolija.

const loginGate = document.getElementById('loginGate');
const adminPanel = document.getElementById('adminPanel');
const adminUserLabel = document.getElementById('adminUserLabel');

const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginMessage = document.getElementById('adminLoginMessage');

const eventForm = document.getElementById('eventForm');
const eventFormMessage = document.getElementById('eventFormMessage');
const eventFormSubmit = document.getElementById('eventFormSubmit');
const formTitle = document.getElementById('formTitle');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const eventsList = document.getElementById('eventsList');
const workshopForm = document.getElementById('workshopForm');
const workshopFormMessage = document.getElementById('workshopFormMessage');
const workshopFormSubmit = document.getElementById('workshopFormSubmit');
const workshopFormTitle = document.getElementById('workshopFormTitle');
const cancelWorkshopBtn = document.getElementById('cancelWorkshopBtn');
const workshopsList = document.getElementById('workshopsList');
const eventImageFile = document.getElementById('eventImageFile');
const eventImageStatus = document.getElementById('eventImageStatus');
const eventIsPaid = document.getElementById('eventIsPaid');
const eventPriceField = document.getElementById('eventPriceField');
const eventPriceInput = eventForm.querySelector('input[name="price"]');
const workshopImageFile = document.getElementById('workshopImageFile');
const workshopImageStatus = document.getElementById('workshopImageStatus');
const usersList = document.getElementById('usersList');
const userPieChart = document.getElementById('userPieChart');
const userChartLegend = document.getElementById('userChartLegend');
const userStatsSummary = document.getElementById('userStatsSummary');
const refreshUsersBtn = document.getElementById('refreshUsersBtn');
const refreshCatalogBtn = document.getElementById('refreshCatalogBtn');
const vehicleModelForm = document.getElementById('vehicleModelForm');
const catalogTypeSelect = document.getElementById('catalogTypeSelect');
const catalogBrandSelect = document.getElementById('catalogBrandSelect');
const catalogModelInput = document.getElementById('catalogModelInput');
const catalogMessage = document.getElementById('catalogMessage');
const catalogModelsList = document.getElementById('catalogModelsList');
const refreshGarageBtn = document.getElementById('refreshGarageBtn');
const garagePostsList = document.getElementById('garagePostsList');
const ADMIN_EMAIL = 'rpm.rosario.km@gmail.com';
let asistentesPorEvento = {};
let tiposCatalogoAdmin = [];
let marcasCatalogoAdmin = [];

function mostrarMensaje(el, texto, esExito = false) {
  el.textContent = texto;
  el.hidden = false;
  el.classList.toggle('is-success', esExito);
}

function convertirImagenAWebp(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Seleccioná un archivo de imagen válido.'));
      return;
    }

    const imagen = new Image();
    const objectUrl = URL.createObjectURL(file);
    imagen.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = imagen.naturalWidth;
      canvas.height = imagen.naturalHeight;
      canvas.getContext('2d').drawImage(imagen, 0, 0);
      const webp = canvas.toDataURL('image/webp', 0.85);
      if (!webp.startsWith('data:image/webp')) {
        reject(new Error('Tu navegador no pudo convertir la imagen a WebP.'));
        return;
      }
      resolve(webp);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };
    imagen.src = objectUrl;
  });
}

function prepararEstadoImagen(input, estado) {
  input?.addEventListener('change', () => {
    estado.textContent = input.files?.[0] ? 'Imagen lista: se guardará como WebP.' : 'Se convertirá automáticamente a WebP.';
    estado.classList.remove('is-error');
  });
}

prepararEstadoImagen(eventImageFile, eventImageStatus);
prepararEstadoImagen(workshopImageFile, workshopImageStatus);

function actualizarCampoPrecioEvento() {
  const esPago = eventIsPaid.checked;
  eventPriceField.hidden = !esPago;
  eventPriceInput.disabled = !esPago;
  eventPriceInput.required = esPago;
  if (!esPago) eventPriceInput.value = '';
}

eventIsPaid.addEventListener('change', actualizarCampoPrecioEvento);
actualizarCampoPrecioEvento();

async function obtenerImagenFormulario(form, input, estado) {
  const archivo = input?.files?.[0];
  if (!archivo) return form.querySelector('input[name="image_url"]').value.trim() || null;
  estado.textContent = 'Convirtiendo imagen a WebP...';
  estado.classList.remove('is-error');
  try {
    const webp = await convertirImagenAWebp(archivo);
    estado.textContent = 'Imagen convertida a WebP.';
    return webp;
  } catch (error) {
    estado.textContent = error.message;
    estado.classList.add('is-error');
    throw error;
  }
}

// ----- Chequear sesión al cargar la página -----
async function chequearSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    mostrarLogin();
    return;
  }

  if (session.user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
    mostrarLogin('Esta cuenta no tiene permisos de administrador.');
    await supabaseClient.auth.signOut();
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from('profiles')
    .select('is_admin, email')
    .eq('id', session.user.id)
    .single();

  if (error || !perfil || !perfil.is_admin) {
    mostrarLogin('Esta cuenta no tiene permisos de administrador.');
    await supabaseClient.auth.signOut();
    return;
  }

  mostrarPanel(perfil.email);
}

function mostrarLogin(mensajeError) {
  loginGate.hidden = false;
  adminPanel.hidden = true;
  if (mensajeError) mostrarMensaje(adminLoginMessage, mensajeError);
}

function mostrarPanel(email) {
  loginGate.hidden = true;
  adminPanel.hidden = false;
  adminUserLabel.textContent = `Conectado como ${email}`;
  cargarEventos();
  cargarTalleres();
  cargarUsuarios();
  cargarCatalogoAdmin();
  cargarPublicacionesAdmin();
}

// ----- Login -----
adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminLoginMessage.hidden = true;

  const datos = Object.fromEntries(new FormData(adminLoginForm));
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
  });

  if (error) {
    mostrarMensaje(adminLoginMessage, 'Email o contraseña incorrectos.');
    if (window.turnstile) window.turnstile.reset();
    return;
  }

  chequearSesion();
});

// ----- Logout -----
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  mostrarLogin();
});

refreshUsersBtn.addEventListener('click', cargarUsuarios);
refreshCatalogBtn.addEventListener('click', cargarCatalogoAdmin);
refreshGarageBtn.addEventListener('click', cargarPublicacionesAdmin);

catalogTypeSelect.addEventListener('change', () => {
  const marcas = marcasCatalogoAdmin.filter(marca => marca.vehicle_type_id === catalogTypeSelect.value);
  catalogBrandSelect.disabled = !marcas.length;
  catalogBrandSelect.innerHTML = '<option value="">Seleccioná una marca...</option>' + marcas.map(marca => `<option value="${marca.id}">${escaparHtml(marca.name)}</option>`).join('');
});

vehicleModelForm.addEventListener('submit', async event => {
  event.preventDefault();
  catalogMessage.hidden = true;
  const nombre = catalogModelInput.value.trim();
  if (!catalogBrandSelect.value || !nombre) return;

  const { error } = await supabaseClient.from('vehicle_models').insert({
    brand_id: catalogBrandSelect.value,
    name: nombre
  });
  if (error) {
    mostrarMensaje(catalogMessage, error.code === '23505' ? 'Ese modelo ya existe para esa marca.' : error.message);
    return;
  }
  catalogModelInput.value = '';
  mostrarMensaje(catalogMessage, 'Modelo agregado correctamente.', true);
  cargarCatalogoAdmin();
});

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[caracter]));
}

function estaBaneado(fecha) {
  return fecha === 'infinity' || (fecha && new Date(fecha) > new Date());
}

function textoEstadoBaneo(fecha) {
  if (!estaBaneado(fecha)) return 'Activo';
  if (fecha === 'infinity') return 'Baneo permanente';
  return `Baneado hasta ${new Date(fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}`;
}

function actualizarGraficoUsuarios(usuarios) {
  const particulares = usuarios.filter(usuario => usuario.account_type === 'particular').length;
  const concesionarias = usuarios.filter(usuario => usuario.account_type === 'concesionaria').length;
  const total = usuarios.length;
  const anguloParticulares = total ? (particulares / total) * 360 : 360;

  userPieChart.style.background = `conic-gradient(var(--accent) 0deg ${anguloParticulares}deg, #ffb84d ${anguloParticulares}deg 360deg)`;
  userChartLegend.innerHTML = `
    <div class="admin-legend-item"><span class="admin-legend-swatch" style="background:var(--accent)"></span>Particulares: <strong>${particulares}</strong></div>
    <div class="admin-legend-item"><span class="admin-legend-swatch" style="background:#ffb84d"></span>Concesionarias: <strong>${concesionarias}</strong></div>`;
  userStatsSummary.textContent = `${total} cuenta${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'}.`;
}

async function cargarUsuarios() {
  usersList.innerHTML = '<p class="auth-subtitle">Cargando usuarios…</p>';
  const { data: usuarios, error } = await supabaseClient
    .from('profiles')
    .select('id, email, account_type, created_at, banned_until')
    .order('created_at', { ascending: false });

  if (error) {
    usersList.innerHTML = '<p class="admin-empty">No se pudieron cargar los usuarios. Ejecutá MIGRACION_USUARIOS_ADMIN_BANEOS.sql.</p>';
    return;
  }

  actualizarGraficoUsuarios(usuarios || []);
  if (!usuarios?.length) {
    usersList.innerHTML = '<p class="admin-empty">Todavía no hay cuentas registradas.</p>';
    return;
  }

  usersList.innerHTML = usuarios.map(renderFilaUsuario).join('');
  usuarios.forEach(usuario => {
    ['24h', '7d', 'permanente', 'quitar'].forEach(accion => {
      document.getElementById(`${accion}-ban-${usuario.id}`)?.addEventListener('click', () => gestionarBaneo(usuario, accion));
    });
  });
}

function renderFilaUsuario(usuario) {
  const esAdmin = usuario.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const baneado = estaBaneado(usuario.banned_until);
  const tipo = usuario.account_type === 'concesionaria' ? 'Concesionaria' : 'Particular';
  const creado = usuario.created_at
    ? new Date(usuario.created_at).toLocaleDateString('es-AR')
    : 'Sin fecha';
  const acciones = esAdmin
    ? '<span class="admin-user-meta">Cuenta administradora</span>'
    : `<div class="admin-ban-actions">
        <button class="btn btn-outline admin-ban-btn" id="24h-ban-${usuario.id}" type="button">24 HORAS</button>
        <button class="btn btn-outline admin-ban-btn" id="7d-ban-${usuario.id}" type="button">7 DÍAS</button>
        <button class="btn btn-outline admin-ban-btn" id="permanente-ban-${usuario.id}" type="button">PERMANENTE</button>
        ${baneado ? `<button class="btn btn-outline admin-ban-btn" id="quitar-ban-${usuario.id}" type="button">QUITAR BANEO</button>` : ''}
      </div>`;

  return `<div class="admin-user-row">
    <div class="admin-user-main">
      <div>
        <div class="admin-user-email">${escaparHtml(usuario.email || 'Sin email')}</div>
        <div class="admin-user-meta">${tipo} · Alta: ${creado}</div>
      </div>
      <span class="admin-user-status${baneado ? ' is-banned' : ''}">${textoEstadoBaneo(usuario.banned_until)}</span>
    </div>
    ${acciones}
  </div>`;
}

async function gestionarBaneo(usuario, accion) {
  let bannedUntil = null;
  if (accion === '24h') bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  if (accion === '7d') bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (accion === 'permanente') bannedUntil = 'infinity';

  const { error } = await supabaseClient
    .from('profiles')
    .update({ banned_until: bannedUntil })
    .eq('id', usuario.id);

  if (error) {
    alert('No se pudo actualizar el baneo: ' + error.message);
    return;
  }
  cargarUsuarios();
}

async function cargarCatalogoAdmin() {
  catalogModelsList.innerHTML = '<p class="auth-subtitle">Cargando catálogo…</p>';
  const [{ data: tipos, error: tiposError }, { data: marcas, error: marcasError }, { data: modelos, error: modelosError }] = await Promise.all([
    supabaseClient.from('vehicle_types').select('id, name').order('name'),
    supabaseClient.from('vehicle_brands').select('id, name, vehicle_type_id').order('name'),
    supabaseClient.from('vehicle_models').select('id, name, brand_id').order('name')
  ]);

  if (tiposError || marcasError || modelosError) {
    catalogModelsList.innerHTML = '<p class="admin-empty">Ejecutá MIGRACION_CATALOGO_VEHICULOS_ARGENTINA.sql para habilitar el catálogo.</p>';
    return;
  }

  tiposCatalogoAdmin = tipos || [];
  marcasCatalogoAdmin = marcas || [];
  catalogTypeSelect.innerHTML = '<option value="">Seleccioná...</option>' + tiposCatalogoAdmin.map(tipo => `<option value="${tipo.id}">${escaparHtml(tipo.name)}</option>`).join('');
  catalogBrandSelect.disabled = true;
  catalogBrandSelect.innerHTML = '<option value="">Elegí primero el tipo...</option>';

  const nombresMarcas = Object.fromEntries(marcasCatalogoAdmin.map(marca => [marca.id, marca.name]));
  const nombresTipos = Object.fromEntries(tiposCatalogoAdmin.map(tipo => [tipo.id, tipo.name]));
  catalogModelsList.innerHTML = (modelos || []).map(modelo => {
    const marca = marcasCatalogoAdmin.find(item => item.id === modelo.brand_id);
    const tipo = marca ? tiposCatalogoAdmin.find(item => item.id === marca.vehicle_type_id) : null;
    return `<div class="admin-catalog-item"><span>${escaparHtml(modelo.name)} <small>${escaparHtml(nombresMarcas[modelo.brand_id] || 'Sin marca')} · ${escaparHtml(nombresTipos[marca?.vehicle_type_id] || 'Sin tipo')}</small></span><button class="admin-catalog-delete" type="button" data-model-id="${modelo.id}" aria-label="Eliminar modelo">×</button></div>`;
  }).join('') || '<p class="admin-empty">Todavía no hay modelos cargados.</p>';

  catalogModelsList.querySelectorAll('[data-model-id]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este modelo del catálogo?')) return;
      const { error } = await supabaseClient.from('vehicle_models').delete().eq('id', button.dataset.modelId);
      if (error) {
        mostrarMensaje(catalogMessage, 'No se pudo eliminar el modelo: ' + error.message);
        return;
      }
      cargarCatalogoAdmin();
    });
  });
}

// ----- Publicaciones del Garage: destacar / quitar destacado -----
async function cargarPublicacionesAdmin() {
  garagePostsList.innerHTML = '<p class="auth-subtitle">Cargando publicaciones…</p>';

  const { data: posts, error } = await supabaseClient
    .from('garage_posts')
    .select('id, title, brand, created_by, is_featured, created_at')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    garagePostsList.innerHTML = '<p class="admin-empty">No se pudieron cargar las publicaciones.</p>';
    return;
  }
  if (!posts?.length) {
    garagePostsList.innerHTML = '<p class="admin-empty">Todavía no hay publicaciones en el Garage.</p>';
    return;
  }

  const idsUsuarios = [...new Set(posts.map(post => post.created_by))];
  const { data: perfiles } = await supabaseClient
    .from('profiles')
    .select('id, account_type')
    .in('id', idsUsuarios);
  const tipoPorUsuario = Object.fromEntries((perfiles || []).map(perfil => [perfil.id, perfil.account_type]));

  garagePostsList.innerHTML = posts.map(post => renderFilaPublicacion(post, tipoPorUsuario[post.created_by])).join('');

  posts.forEach(post => {
    document.getElementById(`toggle-featured-${post.id}`)?.addEventListener('click', () => toggleDestacado(post));
  });
}

function renderFilaPublicacion(post, tipoUsuario) {
  const tipo = tipoUsuario === 'concesionaria' ? 'Concesionaria' : 'Particular';
  return `<div class="admin-event-row">
    <div class="admin-event-info">
      <strong>${escaparHtml(post.brand ? post.brand + ' ' : '')}${escaparHtml(post.title)}${post.is_featured ? ' · <span class="admin-user-status">DESTACADA</span>' : ''}</strong>
      <span>${tipo}</span>
    </div>
    <div class="admin-event-actions">
      <button class="btn btn-outline btn-sm" id="toggle-featured-${post.id}" type="button">${post.is_featured ? 'QUITAR DESTACADO' : 'DESTACAR'}</button>
    </div>
  </div>`;
}

async function toggleDestacado(post) {
  const { error } = await supabaseClient
    .from('garage_posts')
    .update({ is_featured: !post.is_featured })
    .eq('id', post.id);

  if (error) {
    alert('No se pudo actualizar la publicación: ' + error.message);
    return;
  }
  cargarPublicacionesAdmin();
}

// ----- Crear / editar evento -----
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  eventFormMessage.hidden = true;

  const formData = new FormData(eventForm);
  const id = formData.get('id');
  let imagenEvento;

  try {
    imagenEvento = await obtenerImagenFormulario(eventForm, eventImageFile, eventImageStatus);
  } catch (error) {
    mostrarMensaje(eventFormMessage, error.message);
    return;
  }

  const payload = {
    title: formData.get('title'),
    event_date: formData.get('event_date'),
    event_time: formData.get('event_time') || null,
    location: formData.get('location') || null,
    image_url: imagenEvento,
    description: formData.get('description') || null,
    is_paid: formData.get('is_paid') === 'on',
    price: formData.get('is_paid') === 'on' && formData.get('price') !== '' ? Number(formData.get('price')) : null,
  };

  if (!payload.title || !payload.event_date) {
    mostrarMensaje(eventFormMessage, 'Título y fecha son obligatorios.');
    return;
  }
  if (payload.is_paid && (!Number.isFinite(payload.price) || payload.price < 0)) {
    mostrarMensaje(eventFormMessage, 'Indicá un precio válido para el evento pago.');
    return;
  }

  eventFormSubmit.disabled = true;

  const query = id
    ? supabaseClient.from('events').update(payload).eq('id', id)
    : supabaseClient.from('events').insert(payload);

  const { error } = await query;

  eventFormSubmit.disabled = false;

  if (error) {
    mostrarMensaje(eventFormMessage, 'No se pudo guardar el evento: ' + error.message);
    return;
  }

  mostrarMensaje(eventFormMessage, id ? 'Evento actualizado.' : 'Evento creado.', true);
  resetFormulario();
  cargarEventos();
});

function resetFormulario() {
  eventForm.reset();
  eventForm.querySelector('input[name="id"]').value = '';
  actualizarCampoPrecioEvento();
  eventImageStatus.textContent = 'Se convertirá automáticamente a WebP.';
  eventImageStatus.classList.remove('is-error');
  formTitle.textContent = 'CARGAR EVENTO';
  eventFormSubmit.textContent = 'CREAR EVENTO';
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener('click', resetFormulario);

workshopForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  workshopFormMessage.hidden = true;
  const formData = new FormData(workshopForm);
  const id = formData.get('id');
  let imagenTaller;

  try {
    imagenTaller = await obtenerImagenFormulario(workshopForm, workshopImageFile, workshopImageStatus);
  } catch (error) {
    mostrarMensaje(workshopFormMessage, error.message);
    return;
  }

  const payload = {
    name: formData.get('name'), specialty: formData.get('specialty') || null,
    location: formData.get('location') || null, phone: formData.get('phone') || null,
    whatsapp: formData.get('whatsapp') || null, image_url: imagenTaller,
    description: formData.get('description') || null, is_recommended: formData.get('is_recommended') === 'on'
  };
  if (!payload.name) { mostrarMensaje(workshopFormMessage, 'El nombre es obligatorio.'); return; }
  workshopFormSubmit.disabled = true;
  const query = id ? supabaseClient.from('workshops').update(payload).eq('id', id) : supabaseClient.from('workshops').insert(payload);
  const { error } = await query;
  workshopFormSubmit.disabled = false;
  if (error) { mostrarMensaje(workshopFormMessage, 'No se pudo guardar el taller: ' + error.message); return; }
  mostrarMensaje(workshopFormMessage, id ? 'Taller actualizado.' : 'Taller creado.', true);
  resetWorkshopForm();
  cargarTalleres();
});

function resetWorkshopForm() {
  workshopForm.reset();
  workshopForm.querySelector('input[name="id"]').value = '';
  workshopForm.querySelector('input[name="is_recommended"]').checked = true;
  workshopImageStatus.textContent = 'Se convertirá automáticamente a WebP.';
  workshopImageStatus.classList.remove('is-error');
  workshopFormTitle.textContent = 'CARGAR TALLER';
  workshopFormSubmit.textContent = 'CREAR TALLER';
  cancelWorkshopBtn.hidden = true;
}

cancelWorkshopBtn.addEventListener('click', resetWorkshopForm);

async function cargarTalleres() {
  const { data, error } = await supabaseClient.from('workshops').select('*').order('name');
  if (error) { workshopsList.innerHTML = '<p class="admin-empty">Ejecutá MIGRACION_TALLERES.sql para habilitar esta sección.</p>'; return; }
  if (!data?.length) { workshopsList.innerHTML = '<p class="admin-empty">Todavía no cargaste ningún taller.</p>'; return; }
  workshopsList.innerHTML = data.map(taller => `<div class="admin-event-row"><div class="admin-event-info"><strong>${taller.name}</strong><span>${taller.specialty || 'Sin especialidad'}${taller.is_recommended ? ' · Recomendado' : ''}</span></div><div class="admin-event-actions"><button class="admin-icon-btn" id="edit-workshop-${taller.id}" aria-label="Editar" type="button">EDIT</button><button class="admin-icon-btn is-danger" id="delete-workshop-${taller.id}" aria-label="Borrar" type="button">X</button></div></div>`).join('');
  data.forEach(taller => {
    document.getElementById(`edit-workshop-${taller.id}`)?.addEventListener('click', () => cargarTallerEnFormulario(taller));
    document.getElementById(`delete-workshop-${taller.id}`)?.addEventListener('click', () => borrarTaller(taller.id));
  });
}

function cargarTallerEnFormulario(taller) {
  Object.entries(taller).forEach(([campo, valor]) => {
    const input = workshopForm.querySelector(`[name="${campo}"]`);
    if (!input || campo === 'created_at') return;
    if (input.type === 'checkbox') input.checked = Boolean(valor);
    else input.value = valor || '';
  });
  workshopFormTitle.textContent = 'EDITAR TALLER';
  workshopFormSubmit.textContent = 'GUARDAR CAMBIOS';
  cancelWorkshopBtn.hidden = false;
  window.scrollTo({ top: document.getElementById('adminPanel').offsetTop, behavior: 'smooth' });
}

async function borrarTaller(id) {
  if (!confirm('¿Seguro que querés borrar este taller?')) return;
  const { error } = await supabaseClient.from('workshops').delete().eq('id', id);
  if (error) { alert('No se pudo borrar: ' + error.message); return; }
  cargarTalleres();
}

// ----- Listar eventos -----
async function cargarEventos() {
  eventsList.innerHTML = '<p class="auth-subtitle">Cargando eventos…</p>';

  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    eventsList.innerHTML = `<p class="admin-empty">No se pudieron cargar los eventos.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    eventsList.innerHTML = `<p class="admin-empty">Todavía no cargaste ningún evento.</p>`;
    return;
  }

  const { data: inscripciones } = await supabaseClient
    .from('event_attendees')
    .select('event_id');
  asistentesPorEvento = (inscripciones || []).reduce((conteos, inscripcion) => {
    conteos[inscripcion.event_id] = (conteos[inscripcion.event_id] || 0) + 1;
    return conteos;
  }, {});

  eventsList.innerHTML = data.map(renderFilaEvento).join('');

  // Conectar botones de editar / borrar de cada fila
  data.forEach(evento => {
    document.getElementById(`edit-${evento.id}`)?.addEventListener('click', () => cargarEnFormulario(evento));
    document.getElementById(`delete-${evento.id}`)?.addEventListener('click', () => borrarEvento(evento.id));
  });
}

function renderFilaEvento(evento) {
  const imagen = evento.image_url || 'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=200&q=60';
  const fecha = new Date(evento.event_date + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  const precio = evento.is_paid
    ? (evento.price === null || evento.price === undefined ? 'Precio a confirmar' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(evento.price)))
    : 'Gratis';

  return `
    <div class="admin-event-row">
      <div class="admin-event-thumb"><img src="${imagen}" alt=""></div>
      <div class="admin-event-info">
        <strong>${evento.title}</strong>
        <span>${fecha}${evento.location ? ' · ' + evento.location : ''}</span>
        <span>${precio}</span>
        <span class="admin-attendee-count">${asistentesPorEvento[evento.id] || 0} persona${asistentesPorEvento[evento.id] === 1 ? '' : 's'} inscripta${asistentesPorEvento[evento.id] === 1 ? '' : 's'}</span>
      </div>
      <div class="admin-event-actions">
        <button class="admin-icon-btn" id="edit-${evento.id}" aria-label="Editar" type="button">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
        </button>
        <button class="admin-icon-btn is-danger" id="delete-${evento.id}" aria-label="Borrar" type="button">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

function cargarEnFormulario(evento) {
  eventForm.querySelector('input[name="id"]').value = evento.id;
  eventForm.querySelector('input[name="title"]').value = evento.title;
  eventForm.querySelector('input[name="event_date"]').value = evento.event_date;
  eventForm.querySelector('input[name="event_time"]').value = evento.event_time ? evento.event_time.slice(0, 5) : '';
  eventIsPaid.checked = Boolean(evento.is_paid);
  eventPriceInput.value = evento.price ?? '';
  actualizarCampoPrecioEvento();
  eventForm.querySelector('input[name="location"]').value = evento.location || '';
  eventForm.querySelector('input[name="image_url"]').value = evento.image_url || '';
  eventForm.querySelector('textarea[name="description"]').value = evento.description || '';

  formTitle.textContent = 'EDITAR EVENTO';
  eventFormSubmit.textContent = 'GUARDAR CAMBIOS';
  cancelEditBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function borrarEvento(id) {
  if (!confirm('¿Seguro que querés borrar este evento?')) return;

  const { error } = await supabaseClient.from('events').delete().eq('id', id);
  if (error) {
    alert('No se pudo borrar: ' + error.message);
    return;
  }
  cargarEventos();
}

chequearSesion();
