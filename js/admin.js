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

function mostrarMensaje(el, texto, esExito = false) {
  el.textContent = texto;
  el.hidden = false;
  el.classList.toggle('is-success', esExito);
}

// ----- Chequear sesión al cargar la página -----
async function chequearSesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    mostrarLogin();
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
}

// ----- Login -----
adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminLoginMessage.hidden = true;

  const datos = Object.fromEntries(new FormData(adminLoginForm));
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
    options: { captchaToken: datos['cf-turnstile-response'] },
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

// ----- Crear / editar evento -----
eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  eventFormMessage.hidden = true;

  const formData = new FormData(eventForm);
  const id = formData.get('id');

  const payload = {
    title: formData.get('title'),
    event_date: formData.get('event_date'),
    event_time: formData.get('event_time') || null,
    location: formData.get('location') || null,
    image_url: formData.get('image_url') || null,
    description: formData.get('description') || null,
  };

  if (!payload.title || !payload.event_date) {
    mostrarMensaje(eventFormMessage, 'Título y fecha son obligatorios.');
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
  formTitle.textContent = 'CARGAR EVENTO';
  eventFormSubmit.textContent = 'CREAR EVENTO';
  cancelEditBtn.hidden = true;
}

cancelEditBtn.addEventListener('click', resetFormulario);

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

  return `
    <div class="admin-event-row">
      <div class="admin-event-thumb"><img src="${imagen}" alt=""></div>
      <div class="admin-event-info">
        <strong>${evento.title}</strong>
        <span>${fecha}${evento.location ? ' · ' + evento.location : ''}</span>
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
