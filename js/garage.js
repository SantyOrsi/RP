// js/garage.js - Publicaciones del Garage (con límite gratis, marca/modelo y WhatsApp)

const garageCarCarousel = document.getElementById('carCarousel');
const publicarAutoBtn = document.getElementById('publicarAutoBtn');
const modalPublicarAuto = document.getElementById('modalPublicarAuto');
const cerrarModalGarage = document.getElementById('cerrarModalGarage');
const formPublicarAuto = document.getElementById('formPublicarAuto');
const garageMarcaInput = document.getElementById('garageMarcaInput');
const garageTituloInput = document.getElementById('garageTituloInput');
const garageAnioInput = document.getElementById('garageAnioInput');
const garageEstadoSelect = document.getElementById('garageEstadoSelect');
const garageKmInput = document.getElementById('garageKmInput');
const garageKmLabel = document.getElementById('garageKmLabel');
const garageTransmisionSelect = document.getElementById('garageTransmisionSelect');
const garageCombustibleSelect = document.getElementById('garageCombustibleSelect');
const garagePrecioInput = document.getElementById('garagePrecioInput');
const garageUbicacionInput = document.getElementById('garageUbicacionInput');
const garageDescripcionInput = document.getElementById('garageDescripcionInput');
const garageImagenInput = document.getElementById('garageImagenInput');
const garageFotosPreview = document.getElementById('garageFotosPreview');
const garageFormMessage = document.getElementById('garageFormMessage');
const garageCupoTexto = document.getElementById('garageCupoTexto');
const garageModalTitulo = document.getElementById('garageModalTitulo');
const garageFormSubmit = document.getElementById('garageFormSubmit');

// Estos solo existen en garage.html (el index solo muestra destacados)
const garageFiltroMarca = document.getElementById('garageFiltroMarca');
const garageFiltroTipo = document.getElementById('garageFiltroTipo');
const buscarModeloInput = document.getElementById('buscarModeloInput');
const talleresLista = document.getElementById('talleresLista');
const esPaginaGarageCompleta = !!garageFiltroMarca;
const LIMITE_DESTACADOS = 6;

if (garageEstadoSelect) {
  garageEstadoSelect.addEventListener('change', () => {
    const esUsado = garageEstadoSelect.value === 'usado';
    garageKmInput.style.display = esUsado ? '' : 'none';
    garageKmLabel.style.display = esUsado ? '' : 'none';
    garageKmInput.required = esUsado;
    if (!esUsado) garageKmInput.value = '';
  });
  // Estado inicial: oculto hasta elegir
  garageKmInput.style.display = 'none';
  garageKmLabel.style.display = 'none';
}

if (modalPublicarAuto) modalPublicarAuto.hidden = true;

const LIMITE_PARTICULAR = 2;
const LIMITE_CONCESIONARIA = 5;

let imagenesBase64 = [];
let todasLasPublicaciones = [];
let marcaActiva = '';
let tipoActivo = '';
let nombresCache = {};
let tiposUsuarioCache = {};
let usuarioActualId = null;
let publicacionEnEdicion = null;

// Convierte la imagen elegida a base64 en formato webp, redimensionada
// para no guardar archivos gigantes en la base (mismo criterio que el avatar).
function leerImagenComoWebp(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const lector = new FileReader();

    lector.onload = () => {
      img.onload = () => {
        const maxAncho = 900;
        const escala = Math.min(1, maxAncho / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = reject;
      img.src = lector.result;
    };
    lector.onerror = reject;
    lector.readAsDataURL(file);
  });
}

// Trae el nombre a mostrar de cada usuario (public_profiles es la vista pública, sin datos sensibles)
async function traerNombres(userIds) {
  if (userIds.length === 0) return {};

  const { data, error } = await supabaseClient
    .from('public_profiles')
    .select('id, display_name, account_type')
    .in('id', userIds);

  if (error || !data) return {};

  const mapa = {};
  data.forEach(perfil => {
    mapa[perfil.id] = perfil.display_name || 'Usuario';
    tiposUsuarioCache[perfil.id] = perfil.account_type || 'particular';
  });
  return mapa;
}

// Arma el link de WhatsApp con el mensaje y el link directo a la publicación
function armarLinkWhatsapp(post) {
  const numero = post.whatsapp.replace(/\D/g, '');
  const link = `${window.location.origin}${window.location.pathname}#auto-${post.id}`;
  const mensaje = `Hola, me interesó tu vehículo (${post.title}) - ${link}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

async function obtenerTelefonoRegistrado(session) {
  const telefonoMetadata = session.user.user_metadata?.telefono;
  const { data: perfil } = await supabaseClient
    .from('profiles')
    .select('telefono')
    .eq('id', session.user.id)
    .maybeSingle();
  return perfil?.telefono || telefonoMetadata || '';
}

function escaparTexto(valor) {
  return String(valor || '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[caracter]));
}

function formatearPrecio(precio) {
  if (precio === null || precio === undefined) return null;
  return '$' + Number(precio).toLocaleString('es-AR');
}

function formatearKm(km) {
  if (km === null || km === undefined) return null;
  return Number(km).toLocaleString('es-AR') + ' km';
}

const ETIQUETA_TRANSMISION = { manual: 'Manual', automatica: 'Automática' };
const ETIQUETA_COMBUSTIBLE = { nafta: 'Nafta', diesel: 'Diesel', gnc: 'GNC', electrico: 'Eléctrico' };

function tarjetaAuto(post) {
  const fotos = (post.images && post.images.length) ? post.images : (post.image_data ? [post.image_data] : []);
  const fotoDefault = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70';

  const fichaTecnica = [
    post.anio,
    post.es_usado === false ? '0km' : (post.kilometraje != null ? formatearKm(post.kilometraje) : (post.es_usado ? 'Usado' : null)),
    ETIQUETA_TRANSMISION[post.transmision] || null,
    ETIQUETA_COMBUSTIBLE[post.combustible] || null,
  ].filter(Boolean).join(' · ');

  return `
    <article class="car-card" id="auto-${post.id}" data-post-id="${post.id}" tabindex="0" role="link" aria-label="Ver publicación de ${post.brand ? post.brand + ' ' : ''}${post.title}">
      <div class="car-img" data-indice="0">
        ${fotos.map((foto, i) => `<img src="${foto}" alt="${post.title}" loading="lazy" class="${i === 0 ? 'is-active' : ''}">`).join('') || `<img src="${fotoDefault}" alt="${post.title}" loading="lazy" class="is-active">`}
        ${fotos.length > 1 ? `
          <button type="button" class="car-img-nav car-img-prev" aria-label="Foto anterior">&#8249;</button>
          <button type="button" class="car-img-nav car-img-next" aria-label="Foto siguiente">&#8250;</button>
          <span class="car-img-contador">1 / ${fotos.length}</span>
        ` : ''}
      </div>
      <div class="car-info">
        <h3>${post.brand ? post.brand + ' ' : ''}${post.title}</h3>
        ${fichaTecnica ? `<span class="car-ficha">${fichaTecnica}</span>` : ''}
        ${post.precio != null ? `<span class="car-precio">${formatearPrecio(post.precio)}</span>` : ''}
        <a class="car-user" href="perfil.html?id=${encodeURIComponent(post.created_by)}" aria-label="Ver perfil de ${nombresCache[post.created_by] || 'Usuario'}">${nombresCache[post.created_by] || 'Usuario'}</a>
        <span class="car-loc"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ${post.location || 'Rosario'}</span>
        ${post.created_by === usuarioActualId ? '<button type="button" class="btn btn-outline btn-sm car-edit-btn" data-post-id="' + post.id + '">EDITAR PUBLICACIÓN</button>' : ''}
        ${post.whatsapp ? `<a href="${armarLinkWhatsapp(post)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm car-contact-btn">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12.04 2c-5.5 0-10 4.5-10 10 0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10s-4.4-9.8-9.96-9.8zm0 18.1c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-2.9-1.3-4.5 0-4.6 3.8-8.4 8.4-8.4 4.6 0 8.4 3.7 8.4 8.4 0 4.6-3.8 8.4-8.4 8.4zm4.6-6.3c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.1.2-.3.2-.6.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.2-.5.1-.2 0-.3 0-.5-.1-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.2-.2-.2-.4-.3z"/></svg>
          CONTACTAR
        </a>` : ''}
      </div>
    </article>
  `;
}

// Engancha los botones de prev/next de cada tarjeta (delegado una sola vez)
function activarNavegacionFotos() {
  garageCarCarousel.querySelectorAll('.car-card').forEach(tarjeta => {
    const abrirDetalle = (e) => {
      if (e.target.closest('a, button')) return;
      window.location.href = `garage-detalle.html?id=${encodeURIComponent(tarjeta.dataset.postId)}`;
    };
    tarjeta.addEventListener('click', abrirDetalle);
    tarjeta.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('a, button')) return;
      e.preventDefault();
      abrirDetalle(e);
    });
  });

  garageCarCarousel.querySelectorAll('.car-img').forEach(contenedor => {
    const imgs = contenedor.querySelectorAll('img');
    if (imgs.length <= 1) return;

    const contador = contenedor.querySelector('.car-img-contador');

    function mostrar(indice) {
      imgs.forEach((img, i) => img.classList.toggle('is-active', i === indice));
      contenedor.dataset.indice = indice;
      if (contador) contador.textContent = `${indice + 1} / ${imgs.length}`;
    }

    contenedor.querySelector('.car-img-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const actual = Number(contenedor.dataset.indice);
      mostrar((actual - 1 + imgs.length) % imgs.length);
    });
    contenedor.querySelector('.car-img-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const actual = Number(contenedor.dataset.indice);
      mostrar((actual + 1) % imgs.length);
    });
  });

  garageCarCarousel.querySelectorAll('.car-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const post = todasLasPublicaciones.find(publicacion => String(publicacion.id) === btn.dataset.postId);
      if (post) abrirModalEdicion(post);
    });
  });
}

// Arma los botones de filtro por marca a partir de las marcas que hay publicadas
function armarFiltrosDeMarca() {
  if (!esPaginaGarageCompleta) return;

  const marcas = [...new Set(todasLasPublicaciones.map(p => p.brand).filter(Boolean))].sort();

  const botonesExtra = marcas.map(marca =>
    `<button class="filtro-btn" data-marca="${marca}">${marca}</button>`
  ).join('');

  garageFiltroMarca.innerHTML = `<button class="filtro-btn ${marcaActiva === '' ? 'is-active' : ''}" data-marca="">Todas las marcas</button>${botonesExtra}`;

  garageFiltroMarca.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      marcaActiva = btn.dataset.marca;
      garageFiltroMarca.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderizarPublicaciones();
    });
  });
}

function activarFiltroTipo() {
  if (!garageFiltroTipo) return;

  garageFiltroTipo.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActivo = btn.dataset.tipo;
      garageFiltroTipo.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderizarPublicaciones();
    });
  });
}

// Vuelve a pintar la grilla aplicando el filtro de marca y el buscador de modelo activos
function renderizarPublicaciones() {
  const textoBusqueda = buscarModeloInput ? buscarModeloInput.value.trim().toLowerCase() : '';

  let filtradas = todasLasPublicaciones;

  if (marcaActiva) {
    filtradas = filtradas.filter(p => p.brand === marcaActiva);
  }
  if (tipoActivo) {
    filtradas = filtradas.filter(p => tiposUsuarioCache[p.created_by] === tipoActivo);
  }
  if (textoBusqueda) {
    filtradas = filtradas.filter(p => p.title.toLowerCase().includes(textoBusqueda));
  }
  if (!esPaginaGarageCompleta) {
    filtradas = filtradas.slice(0, LIMITE_DESTACADOS);
  }

  if (filtradas.length === 0) {
    garageCarCarousel.innerHTML = `<p class="garage-empty">No hay publicaciones que coincidan con la búsqueda.</p>`;
    return;
  }

  garageCarCarousel.innerHTML = filtradas.map(post => tarjetaAuto(post)).join('');
  activarNavegacionFotos();
  enfocarPublicacionDesdeHash();
}

function enfocarPublicacionDesdeHash() {
  const publicacion = document.getElementById(window.location.hash.slice(1));
  if (!publicacion) return;

  publicacion.scrollIntoView({ behavior: 'smooth', block: 'center' });
  publicacion.classList.add('is-target');
  setTimeout(() => publicacion.classList.remove('is-target'), 1800);
}

// Cargar publicaciones del garage
async function cargarPublicacionesGarage() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  usuarioActualId = session?.user?.id || null;

  const { data: posts, error } = await supabaseClient
    .from('garage_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !posts) {
    console.error('Error cargando publicaciones del garage:', error);
    return;
  }

  todasLasPublicaciones = posts;
  nombresCache = await traerNombres([...new Set(posts.map(p => p.created_by))]);

  armarFiltrosDeMarca();
  activarFiltroTipo();
  renderizarPublicaciones();
}

function tarjetaTaller(taller) {
  const contacto = taller.whatsapp || taller.phone;
  const hrefContacto = taller.whatsapp
    ? `https://wa.me/${taller.whatsapp.replace(/\D/g, '')}`
    : `tel:${taller.phone}`;

  return `
    <article class="taller-card">
      ${taller.image_url ? `<img src="${taller.image_url}" alt="${taller.name}" class="taller-foto" loading="lazy">` : '<div class="taller-foto taller-foto-vacia">RPM</div>'}
      <div class="taller-datos">
        <h3>${taller.name}</h3>
        ${taller.specialty ? `<span class="taller-especialidad">${taller.specialty}</span>` : ''}
        ${taller.location ? `<span class="taller-meta">${taller.location}</span>` : ''}
        ${taller.description ? `<p>${taller.description}</p>` : ''}
        ${contacto ? `<a class="btn btn-outline btn-sm" href="${hrefContacto}" ${taller.whatsapp ? 'target="_blank" rel="noopener"' : ''}>CONTACTAR</a>` : ''}
      </div>
    </article>
  `;
}

async function cargarTalleres() {
  if (!talleresLista) return;

  const { data: talleres, error } = await supabaseClient
    .from('workshops')
    .select('id, name, specialty, location, phone, whatsapp, description, image_url')
    .eq('is_recommended', true)
    .order('name');

  if (error || !talleres?.length) return;
  talleresLista.innerHTML = talleres.map(tarjetaTaller).join('');
}

function prepararModalPublicacion() {
  publicacionEnEdicion = null;
  formPublicarAuto.reset();
  imagenesBase64 = [];
  garageFotosPreview.innerHTML = '';
  garageFormMessage.hidden = true;
  garageModalTitulo.textContent = 'PUBLICAR TU AUTO';
  garageFormSubmit.textContent = 'PUBLICAR';
  garageCupoTexto.hidden = false;
  garageKmInput.style.display = 'none';
  garageKmLabel.style.display = 'none';
  garageKmInput.required = false;
}

function abrirModalEdicion(post) {
  publicacionEnEdicion = post;
  garageModalTitulo.textContent = 'EDITAR PUBLICACIÓN';
  garageFormSubmit.textContent = 'GUARDAR CAMBIOS';
  garageCupoTexto.hidden = true;
  garageFormMessage.hidden = true;

  garageMarcaInput.value = post.brand || '';
  garageTituloInput.value = post.title || '';
  garageAnioInput.value = post.anio || '';
  garageEstadoSelect.value = post.es_usado === false ? '0km' : 'usado';
  garageEstadoSelect.dispatchEvent(new Event('change'));
  garageKmInput.value = post.kilometraje ?? '';
  garageTransmisionSelect.value = post.transmision || '';
  garageCombustibleSelect.value = post.combustible || '';
  garagePrecioInput.value = post.precio ?? '';
  garageUbicacionInput.value = post.location || '';
  garageDescripcionInput.value = post.description || '';
  imagenesBase64 = post.images?.length ? [...post.images] : (post.image_data ? [post.image_data] : []);
  renderizarPreviewFotos();
  modalPublicarAuto.hidden = false;
}

if (buscarModeloInput) {
  buscarModeloInput.addEventListener('input', renderizarPublicaciones);
}

// Cuenta cuántas publicaciones tiene el usuario y cuál es su tope
async function calcularCupo(userId) {
  const { data: perfil } = await supabaseClient
    .from('profiles')
    .select('account_type')
    .eq('id', userId)
    .single();

  const tope = perfil?.account_type === 'concesionaria' ? LIMITE_CONCESIONARIA : LIMITE_PARTICULAR;

  const { count } = await supabaseClient
    .from('garage_posts')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId);

  return { usadas: count || 0, tope };
}

// Abrir modal de publicar auto
if (publicarAutoBtn) {
  publicarAutoBtn.addEventListener('click', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
      alert('Debes iniciar sesión para publicar tu auto.');
      window.location.href = 'auth.html';
      return;
    }

    const telefonoRegistrado = await obtenerTelefonoRegistrado(session);
    if (!telefonoRegistrado) {
      alert('Tu cuenta no tiene un teléfono registrado. Completá tus datos de contacto antes de publicar.');
      return;
    }

    const { usadas, tope } = await calcularCupo(session.user.id);

    if (usadas >= tope) {
      alert(`Llegaste al límite de ${tope} publicaciones gratis en el Garage.`);
      return;
    }

    garageCupoTexto.textContent = `Te quedan ${tope - usadas} publicación${(tope - usadas) === 1 ? '' : 'es'} gratis.`;

    prepararModalPublicacion();
    modalPublicarAuto.hidden = false;
  });
}

const MAX_FOTOS = 5;

function renderizarPreviewFotos() {
  if (!garageFotosPreview) return;
  garageFotosPreview.innerHTML = imagenesBase64.map((img, i) => `
    <div class="garage-foto-mini">
      <img src="${img}" alt="Foto ${i + 1}">
      <button type="button" class="garage-foto-mini-quitar" data-index="${i}">&times;</button>
    </div>
  `).join('');

  garageFotosPreview.querySelectorAll('.garage-foto-mini-quitar').forEach(btn => {
    btn.addEventListener('click', () => {
      imagenesBase64.splice(Number(btn.dataset.index), 1);
      renderizarPreviewFotos();
    });
  });
}

if (garageImagenInput) {
  garageImagenInput.addEventListener('change', async () => {
    const archivos = Array.from(garageImagenInput.files);
    garageImagenInput.value = ''; // permite volver a elegir el mismo archivo después

    for (const file of archivos) {
      if (imagenesBase64.length >= MAX_FOTOS) {
        alert(`Máximo ${MAX_FOTOS} fotos por publicación.`);
        break;
      }
      try {
        const resultado = await leerImagenComoWebp(file);

        if (!resultado.startsWith('data:image/webp')) {
          alert('Tu navegador no puede convertir la imagen a webP. Probá con Chrome, Firefox o Edge actualizado.');
          continue;
        }

        imagenesBase64.push(resultado);
      } catch (err) {
        console.error('Error procesando la imagen:', err);
      }
    }

    renderizarPreviewFotos();
  });
}

if (formPublicarAuto) {
  formPublicarAuto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
      alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      window.location.href = 'auth.html';
      return;
    }

    const telefonoRegistrado = await obtenerTelefonoRegistrado(session);
    if (!telefonoRegistrado) {
      garageFormMessage.textContent = 'Tu cuenta no tiene un teléfono registrado.';
      garageFormMessage.classList.remove('is-success');
      garageFormMessage.hidden = false;
      return;
    }

    const esUsado = garageEstadoSelect.value === 'usado';

    const datosAuto = {
      brand: garageMarcaInput.value,
      title: garageTituloInput.value,
      anio: garageAnioInput.value ? Number(garageAnioInput.value) : null,
      es_usado: esUsado,
      kilometraje: esUsado && garageKmInput.value ? Number(garageKmInput.value) : null,
      transmision: garageTransmisionSelect.value || null,
      combustible: garageCombustibleSelect.value || null,
      precio: garagePrecioInput.value ? Number(garagePrecioInput.value) : null,
      location: garageUbicacionInput.value,
      description: garageDescripcionInput.value,
      whatsapp: telefonoRegistrado.replace(/\D/g, ''),
      image_data: imagenesBase64[0] || null,
      images: imagenesBase64.length ? imagenesBase64 : null
    };

    const consulta = publicacionEnEdicion
      ? supabaseClient.from('garage_posts').update(datosAuto).eq('id', publicacionEnEdicion.id).eq('created_by', session.user.id)
      : supabaseClient.from('garage_posts').insert([{ ...datosAuto, created_by: session.user.id }]);
    const { error } = await consulta;

    if (error) {
      garageFormMessage.textContent = error.message.includes('límite')
        ? error.message
        : 'Error al publicar tu auto.';
      garageFormMessage.classList.remove('is-success');
    } else {
      garageFormMessage.textContent = publicacionEnEdicion ? '¡Cambios guardados!' : '¡Tu auto ya está publicado!';
      garageFormMessage.classList.add('is-success');

      setTimeout(() => {
        modalPublicarAuto.hidden = true;
        cargarPublicacionesGarage();
      }, 1200);
    }

    garageFormMessage.hidden = false;
  });
}

if (cerrarModalGarage) {
  cerrarModalGarage.addEventListener('click', () => {
    modalPublicarAuto.hidden = true;
  });
}

if (modalPublicarAuto) {
  modalPublicarAuto.addEventListener('click', (e) => {
    if (e.target === modalPublicarAuto) modalPublicarAuto.hidden = true;
  });
}

cargarPublicacionesGarage();
cargarTalleres();
