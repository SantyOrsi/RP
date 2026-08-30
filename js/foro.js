// js/foro.js - Gestión de foros comunitarios

const noSesionForo = document.getElementById('noSesionForo');
const foroContenido = document.getElementById('foroContenido');
const crearForoBtn = document.getElementById('crearForoBtn');
const modalCrearForo = document.getElementById('modalCrearForo');
const cerrarModal = document.getElementById('cerrarModal');
const formCrearForo = document.getElementById('formCrearForo');
const categoriaSelect = document.getElementById('categoriaSelect');
const tituloInput = document.getElementById('tituloInput');
const descripcionInput = document.getElementById('descripcionInput');
const formMessage = document.getElementById('formMessage');
const listaForos = document.getElementById('listaForos');
const filtroCategoriasContainer = document.getElementById('filtroCategoriasContainer');
const modalForo = document.getElementById('modalForo');
const cerrarModalForo = document.getElementById('cerrarModalForo');
const foroTitulo = document.getElementById('foroTitulo');
const foroDescripcion = document.getElementById('foroDescripcion');
const foroCategoriaTag = document.getElementById('foroCategoriaTag');
const foroMeta = document.getElementById('foroMeta');
const listaPostsContainer = document.getElementById('listaPostsContainer');
const formAgregarPost = document.getElementById('formAgregarPost');
const contenidoPost = document.getElementById('contenidoPost');
const postMessage = document.getElementById('postMessage');

let categorias = [];
let foroSeleccionado = null;
let filtroActual = '';

// Formatear fecha
function formatearFecha(fecha) {
  const date = new Date(fecha);
  const hoy = new Date();
  const diferenciaDias = Math.floor((hoy - date) / (1000 * 60 * 60 * 24));
  
  if (diferenciaDias === 0) {
    return `hace ${Math.floor((hoy - date) / (1000 * 60))} minutos`;
  } else if (diferenciaDias === 1) {
    return 'ayer';
  } else if (diferenciaDias < 7) {
    return `hace ${diferenciaDias} días`;
  }
  
  return date.toLocaleDateString('es-AR');
}

// Calcular si un foro ha expirado
function foroExpirado(expiresAt) {
  return new Date(expiresAt) < new Date();
}

// Calcular tiempo restante
function tiempoRestante(expiresAt) {
  const ahora = new Date();
  const expira = new Date(expiresAt);
  const diferencia = expira - ahora;
  
  if (diferencia <= 0) return 'Expirado';
  
  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  if (horas > 24) {
    const dias = Math.floor(horas / 24);
    return `${dias} día${dias > 1 ? 's' : ''} restante${dias > 1 ? 's' : ''}`;
  }
  return `${horas}h restante`;
}

// Cargar categorías
async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from('forum_categories')
    .select('*')
    .order('name');

  if (!error && data) {
    categorias = data;
    
    // Llenar select
    categoriaSelect.innerHTML += data.map(cat => 
      `<option value="${cat.id}">${cat.name}</option>`
    ).join('');

    // Llenar filtros
    filtroCategoriasContainer.innerHTML = data.map(cat =>
      `<button class="filtro-btn" data-categoria="${cat.id}">${cat.name}</button>`
    ).join('');

    // Agregar listeners a botones de filtro
    document.querySelectorAll('.filtro-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        filtroActual = btn.dataset.categoria;
        cargarForos();
      });
    });
  }
}

// Cargar foros
async function cargarForos() {
  let query = supabaseClient
    .from('forums')
    .select(`
      *,
      forum_categories(name),
      profiles(display_name)
    `)
    .order('created_at', { ascending: false });

  if (filtroActual) {
    query = query.eq('category_id', filtroActual);
  }

  const { data: foros, error } = await query;

  if (error || !foros) {
    console.error('Error cargando foros:', error);
    listaForos.innerHTML = `
      <div class="foro-empty">
        <p>Error cargando foros. Intenta de nuevo.</p>
      </div>
    `;
    return;
  }

  if (foros.length === 0) {
    listaForos.innerHTML = `
      <div class="foro-empty">
        <p>No hay foros en esta categoría.<br>¡Sé el primero en crear uno!</p>
      </div>
    `;
    return;
  }

  listaForos.innerHTML = foros.map(foro => {
    const expirado = foroExpirado(foro.expires_at);
    const tiempoRest = tiempoRestante(foro.expires_at);
    const categoria = foro.forum_categories?.name || 'General';
    const creador = foro.profiles?.display_name || 'Usuario';

    return `
      <div class="foro-item ${expirado ? 'foro-item--expirado' : ''}" onclick="abrirForo('${foro.id}')">
        <span class="foro-categoria">${categoria}</span>
        <h3>${foro.title}</h3>
        <p>${foro.description}</p>
        <div class="foro-meta">
          <span>Por <strong>${creador}</strong></span>
          <span>${formatearFecha(foro.created_at)}</span>
          <span class="foro-estado ${expirado ? '' : 'activo'}">
            ${expirado ? '⏳ Expirado' : `⏰ ${tiempoRest}`}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Abrir foro
async function abrirForo(foroId) {
  const { data: foro, error } = await supabaseClient
    .from('forums')
    .select(`
      *,
      forum_categories(name),
      profiles(display_name)
    `)
    .eq('id', foroId)
    .single();

  if (error || !foro) return;

  foroSeleccionado = foro;
  const categoria = foro.forum_categories?.name || 'General';
  const creador = foro.profiles?.display_name || 'Usuario';
  
  foroCategoriaTag.textContent = categoria;
  foroTitulo.textContent = foro.title;
  foroDescripcion.textContent = foro.description;
  foroMeta.innerHTML = `
    <span>Por <strong>${creador}</strong></span>
    <span>${formatearFecha(foro.created_at)}</span>
    <span class="foro-estado ${foroExpirado(foro.expires_at) ? '' : 'activo'}">
      ${foroExpirado(foro.expires_at) ? '⏳ Expirado' : `⏰ ${tiempoRestante(foro.expires_at)}`}
    </span>
  `;

  // Cargar posts
  await cargarPosts(foroId);

  // Mostrar modal
  modalForo.hidden = false;
  formAgregarPost.hidden = foroExpirado(foro.expires_at);
}

// Cargar posts
async function cargarPosts(foroId) {
  const { data: posts, error } = await supabaseClient
    .from('forum_posts')
    .select(`
      *,
      profiles(display_name)
    `)
    .eq('forum_id', foroId)
    .order('created_at', { ascending: true });

  if (error || !posts) return;

  if (posts.length === 0) {
    listaPostsContainer.innerHTML = '<p style="text-align: center; color: var(--text-dim);">Sé el primero en responder</p>';
    return;
  }

  listaPostsContainer.innerHTML = posts.map(post => `
    <div class="post-item">
      <div class="post-header">
        <span class="post-autor">${post.profiles?.display_name || 'Usuario'}</span>
        <span class="post-tiempo">${formatearFecha(post.created_at)}</span>
      </div>
      <p class="post-contenido">${post.content}</p>
    </div>
  `).join('');
}

// Crear foro
formCrearForo.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { error } = await supabaseClient.from('forums').insert([
    {
      title: tituloInput.value,
      description: descripcionInput.value,
      category_id: categoriaSelect.value,
      created_by: session.user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);

  if (error) {
    formMessage.textContent = 'Error al crear el foro.';
    formMessage.classList.remove('is-success');
  } else {
    formMessage.textContent = '¡Foro creado! Durará 7 días.';
    formMessage.classList.add('is-success');
    
    formCrearForo.reset();
    categoriaSelect.value = '';
    
    setTimeout(() => {
      modalCrearForo.hidden = true;
      cargarForos();
    }, 1500);
  }

  formMessage.hidden = false;
});

// Agregar post
formAgregarPost.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!foroSeleccionado) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { error } = await supabaseClient.from('forum_posts').insert([
    {
      forum_id: foroSeleccionado.id,
      content: contenidoPost.value,
      created_by: session.user.id
    }
  ]);

  if (error) {
    postMessage.textContent = 'Error al publicar.';
    postMessage.classList.remove('is-success');
  } else {
    postMessage.textContent = '¡Publicado!';
    postMessage.classList.add('is-success');
    
    contenidoPost.value = '';
    setTimeout(() => {
      postMessage.hidden = true;
      cargarPosts(foroSeleccionado.id);
    }, 1000);
  }

  postMessage.hidden = false;
});

// Event listeners modales
crearForoBtn.addEventListener('click', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    alert('Debes iniciar sesión para crear un foro.');
    window.location.href = 'auth.html';
    return;
  }
  
  modalCrearForo.hidden = false;
});

function confirmarCancelacion() {
  const tieneContenido = tituloInput.value.trim() || descripcionInput.value.trim() || categoriaSelect.value;
  
  if (!tieneContenido) {
    modalCrearForo.hidden = true;
    formMessage.hidden = true;
    return;
  }
  
  const confirmacion = confirm('¿Estás seguro que quieres cancelar la creación del foro? Se perderá todo lo que escribiste.');
  
  if (confirmacion) {
    modalCrearForo.hidden = true;
    formMessage.hidden = true;
    tituloInput.value = '';
    descripcionInput.value = '';
    categoriaSelect.value = '';
  }
}

cerrarModal.addEventListener('click', confirmarCancelacion);

cerrarModalForo.addEventListener('click', () => {
  modalForo.hidden = true;
});

// Cerrar modal al hacer click afuera
modalCrearForo.addEventListener('click', (e) => {
  if (e.target === modalCrearForo) {
    confirmarCancelacion();
  }
});

modalForo.addEventListener('click', (e) => {
  if (e.target === modalForo) modalForo.hidden = true;
});

// Iniciar
async function iniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    noSesionForo.hidden = false;
    return;
  }

  foroContenido.hidden = false;
  await cargarCategorias();
  await cargarForos();
}

iniciar();
