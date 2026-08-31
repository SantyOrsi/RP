// js/garage.js - Publicaciones del Garage (con límite gratis, marca/modelo y WhatsApp)

const carCarousel = document.getElementById('carCarousel');
const publicarAutoBtn = document.getElementById('publicarAutoBtn');
const modalPublicarAuto = document.getElementById('modalPublicarAuto');
const cerrarModalGarage = document.getElementById('cerrarModalGarage');
const formPublicarAuto = document.getElementById('formPublicarAuto');
const garageMarcaInput = document.getElementById('garageMarcaInput');
const garageTituloInput = document.getElementById('garageTituloInput');
const garageUbicacionInput = document.getElementById('garageUbicacionInput');
const garageDescripcionInput = document.getElementById('garageDescripcionInput');
const garageWhatsappInput = document.getElementById('garageWhatsappInput');
const garageImagenInput = document.getElementById('garageImagenInput');
const garageFormMessage = document.getElementById('garageFormMessage');
const garageCupoTexto = document.getElementById('garageCupoTexto');

// Estos solo existen en garage.html (el index solo muestra destacados)
const garageFiltroMarca = document.getElementById('garageFiltroMarca');
const buscarModeloInput = document.getElementById('buscarModeloInput');
const esPaginaGarageCompleta = !!garageFiltroMarca;
const LIMITE_DESTACADOS = 6;

if (modalPublicarAuto) modalPublicarAuto.hidden = true;

const LIMITE_PARTICULAR = 2;
const LIMITE_CONCESIONARIA = 5;

let imagenBase64 = null;
let todasLasPublicaciones = [];
let marcaActiva = '';
let nombresCache = {};

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
    .select('id, display_name')
    .in('id', userIds);

  if (error || !data) return {};

  const mapa = {};
  data.forEach(perfil => { mapa[perfil.id] = perfil.display_name || 'Usuario'; });
  return mapa;
}

// Arma el link de WhatsApp con el mensaje y el link directo a la publicación
function armarLinkWhatsapp(post) {
  const numero = post.whatsapp.replace(/\D/g, '');
  const link = `${window.location.origin}${window.location.pathname}#auto-${post.id}`;
  const mensaje = `Hola, me interesó tu vehículo (${post.title}) - ${link}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function tarjetaAuto(post) {
  return `
    <article class="car-card" id="auto-${post.id}">
      <div class="car-img">
        <img src="${post.image_data || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'}" alt="${post.title}" loading="lazy">
      </div>
      <div class="car-info">
        <h3>${post.brand ? post.brand + ' ' : ''}${post.title}</h3>
        <span class="car-user">${nombresCache[post.created_by] || 'Usuario'}</span>
        <span class="car-loc"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ${post.location || 'Rosario'}</span>
        ${post.whatsapp ? `<a href="${armarLinkWhatsapp(post)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm car-contact-btn">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12.04 2c-5.5 0-10 4.5-10 10 0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10s-4.4-9.8-9.96-9.8zm0 18.1c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3c-.9-1.4-1.3-2.9-1.3-4.5 0-4.6 3.8-8.4 8.4-8.4 4.6 0 8.4 3.7 8.4 8.4 0 4.6-3.8 8.4-8.4 8.4zm4.6-6.3c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.1.2-.3.2-.6.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.2-.5.1-.2 0-.3 0-.5-.1-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.2-.2-.2-.4-.3z"/></svg>
          CONTACTAR
        </a>` : ''}
      </div>
    </article>
  `;
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

// Vuelve a pintar la grilla aplicando el filtro de marca y el buscador de modelo activos
function renderizarPublicaciones() {
  const textoBusqueda = buscarModeloInput ? buscarModeloInput.value.trim().toLowerCase() : '';

  let filtradas = todasLasPublicaciones;

  if (marcaActiva) {
    filtradas = filtradas.filter(p => p.brand === marcaActiva);
  }
  if (textoBusqueda) {
    filtradas = filtradas.filter(p => p.title.toLowerCase().includes(textoBusqueda));
  }
  if (!esPaginaGarageCompleta) {
    filtradas = filtradas.slice(0, LIMITE_DESTACADOS);
  }

  if (filtradas.length === 0) {
    carCarousel.innerHTML = `<p class="garage-empty">No hay publicaciones que coincidan con la búsqueda.</p>`;
    return;
  }

  carCarousel.innerHTML = filtradas.map(post => tarjetaAuto(post)).join('');
}

// Cargar publicaciones del garage
async function cargarPublicacionesGarage() {
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
  renderizarPublicaciones();
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

    const { usadas, tope } = await calcularCupo(session.user.id);

    if (usadas >= tope) {
      alert(`Llegaste al límite de ${tope} publicaciones gratis en el Garage.`);
      return;
    }

    garageCupoTexto.textContent = `Te quedan ${tope - usadas} publicación${(tope - usadas) === 1 ? '' : 'es'} gratis.`;

    formPublicarAuto.reset();
    imagenBase64 = null;
    garageFormMessage.hidden = true;
    modalPublicarAuto.hidden = false;
  });
}

if (garageImagenInput) {
  garageImagenInput.addEventListener('change', async () => {
    const file = garageImagenInput.files[0];
    if (!file) { imagenBase64 = null; return; }
    try {
      const resultado = await leerImagenComoWebp(file);

      if (!resultado.startsWith('data:image/webp')) {
        alert('Tu navegador no puede convertir la imagen a webP. Probá con Chrome, Firefox o Edge actualizado.');
        imagenBase64 = null;
        garageImagenInput.value = '';
        return;
      }

      imagenBase64 = resultado;
    } catch (err) {
      console.error('Error procesando la imagen:', err);
      imagenBase64 = null;
    }
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

    const { error } = await supabaseClient.from('garage_posts').insert([
      {
        created_by: session.user.id,
        brand: garageMarcaInput.value,
        title: garageTituloInput.value,
        location: garageUbicacionInput.value,
        description: garageDescripcionInput.value,
        whatsapp: garageWhatsappInput.value.replace(/\D/g, ''),
        image_data: imagenBase64
      }
    ]);

    if (error) {
      garageFormMessage.textContent = error.message.includes('límite')
        ? error.message
        : 'Error al publicar tu auto.';
      garageFormMessage.classList.remove('is-success');
    } else {
      garageFormMessage.textContent = '¡Tu auto ya está publicado!';
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