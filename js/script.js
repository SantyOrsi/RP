// ===== Mobile menu =====
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileDrawer = document.getElementById('mobileDrawer');

if (hamburgerBtn && mobileDrawer) {
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.toggle('is-open');
    hamburgerBtn.classList.toggle('is-open', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });

  mobileDrawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer.classList.remove('is-open');
      hamburgerBtn.classList.remove('is-open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// ===== Car carousel arrows =====
const carCarousel = document.getElementById('carCarousel');
const carPrev = document.getElementById('carPrev');
const carNext = document.getElementById('carNext');

if (carCarousel && carPrev && carNext) {
  const scrollAmount = () => {
    const card = carCarousel.querySelector('.car-card');
    return card ? card.offsetWidth + 20 : 320;
  };
  carPrev.addEventListener('click', () => {
    carCarousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });
  carNext.addEventListener('click', () => {
    carCarousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });
}

// ===== Header shadow on scroll =====
const siteHeader = document.getElementById('siteHeader');
if (siteHeader) {
  const toggleShadow = () => {
    siteHeader.style.boxShadow = window.scrollY > 8
      ? '0 8px 24px rgba(0,0,0,.35)'
      : 'none';
  };
  document.addEventListener('scroll', toggleShadow, { passive: true });
  toggleShadow();
}

// ===== Próximo evento (desde Supabase) =====
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatearFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

function formatearHora(horaSQL) {
  if (!horaSQL) return null;
  return horaSQL.slice(0, 5) + ' hs';
}

async function cargarProximoEvento() {
  const contenedor = document.getElementById('eventContainer');
  if (!contenedor || typeof supabaseClient === 'undefined') return;

  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .gte('event_date', hoy)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error cargando el evento:', error.message);
    contenedor.innerHTML = '<div class="event-body event-empty"><p>No pudimos cargar el próximo evento.</p></div>';
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = '<div class="event-body event-empty"><p>Todavía no hay próximos eventos anunciados.</p></div>';
    return;
  }

  const evento = data[0];
  const imagen = evento.image_url || 'https://images.unsplash.com/photo-1541348263662-e068662d82af?auto=format&fit=crop&w=900&q=70';
  const hora = formatearHora(evento.event_time);

  contenedor.innerHTML = `
    <div class="event-img">
      <img src="${imagen}" alt="${evento.title}" loading="lazy">
      <span class="event-tag">PRÓXIMO EVENTO</span>
    </div>
    <div class="event-body">
      <h3>${evento.title}</h3>
      <ul class="event-meta">
        <li><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> ${formatearFecha(evento.event_date)}</li>
        ${hora ? `<li><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> ${hora}</li>` : ''}
        ${evento.location ? `<li><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg> ${evento.location}</li>` : ''}
      </ul>
    </div>
  `;
}

cargarProximoEvento();

// ===== Foros destacados en Comunidad =====
function escaparForo(valor) {
  return String(valor || '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[caracter]));
}

function tiempoDesdeForo(fecha) {
  const minutos = Math.max(1, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} hs`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias === 1 ? '' : 's'}`;
}

function iconoForo(indice) {
  if (indice === 0) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a3 3 0 006 0c1 1 2 2.5 2 4.5A6.5 6.5 0 0111.5 20 6.5 6.5 0 015 13.5C5 9 8 6 12 2z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 11-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/></svg>';
}

function renderForosInicio(foros, nombres) {
  const tarjeta = document.getElementById('homeForumCard');
  if (!tarjeta) return;
  const filas = foros.slice(0, 3).map((foro, indice) => {
    const categoria = foro.forum_categories?.name || 'General';
    const creador = nombres[foro.created_by] || 'Usuario';
    const respuestas = foro.forum_posts?.[0]?.count || 0;
    return `
      <a href="foro.html?foro=${escaparForo(foro.id)}" class="forum-row">
        <span class="forum-flag ${indice === 0 ? 'forum-flag--hot' : ''}" aria-hidden="true">${iconoForo(indice)}</span>
        <span class="forum-text">
          <strong>${escaparForo(foro.title)}</strong>
          <em>Por ${escaparForo(creador)} · ${escaparForo(tiempoDesdeForo(foro.created_at))}</em>
        </span>
        <span class="forum-replies"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14z"/></svg> ${respuestas} respuestas</span>
      </a>`;
  });
  while (filas.length < 3) {
    filas.push('<div class="forum-row forum-row--empty"><span class="forum-text"><em>Todavía no hay otra conversación publicada.</em></span></div>');
  }
  tarjeta.innerHTML = filas.join('');
}

async function cargarForosInicio() {
  const tarjeta = document.getElementById('homeForumCard');
  if (!tarjeta || typeof supabaseClient === 'undefined') return;
  const { data: foros, error } = await supabaseClient
    .from('forums')
    .select('id, title, created_by, created_at, forum_categories(name), forum_posts(count)')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !foros) {
    renderForosInicio([], {});
    return;
  }

  const ids = [...new Set(foros.map(foro => foro.created_by))];
  const { data: perfiles } = await supabaseClient
    .from('public_profiles')
    .select('id, display_name')
    .in('id', ids);
  const nombres = Object.fromEntries((perfiles || []).map(perfil => [perfil.id, perfil.display_name || 'Usuario']));
  renderForosInicio(foros, nombres);
}

cargarForosInicio();

// ===== RPM Magazine (noticias renovadas cada 24 horas) =====
const magazineCacheKey = 'rpm-magazine-news-ar-v2';
const magazineCacheDurationMs = 6 * 60 * 60 * 1000;
const magazineSources = [
  { name: 'AUTOS ARG', url: 'https://news.google.com/rss/search?q=autos+Argentina&hl=es-419&gl=AR&ceid=AR:es-419' },
  { name: 'F1 ARG', url: 'https://news.google.com/rss/search?q=Formula+1+Argentina&hl=es-419&gl=AR&ceid=AR:es-419' },
  { name: 'CAMPEONES', url: 'https://campeones.com.ar/feed/' }
];
const magazineFallbackImage = 'assets/rpm.png';
const magazineFallbackImages = {
  'AUTOS ARG': magazineFallbackImage,
  'F1 ARG': magazineFallbackImage,
  CAMPEONES: magazineFallbackImage
};

function escaparTexto(texto) {
  return String(texto || '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[caracter]));
}

function fechaRelativa(fecha) {
  const dias = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000));
  return dias === 0 ? 'Hoy' : dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

function renderMagazine(noticias) {
  const grid = document.getElementById('magazineGrid');
  if (!grid || !noticias.length) return;
  grid.innerHTML = noticias.slice(0, 6).map(noticia => `
    <a class="mag-card" href="${escaparTexto(noticia.link)}" target="_blank" rel="noopener noreferrer">
      <div class="mag-img">
        <img src="${escaparTexto(noticia.image)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escaparTexto(magazineFallbackImages[noticia.category])}'">
        <span class="mag-badge">${escaparTexto(noticia.category)}</span>
      </div>
      <h3>${escaparTexto(noticia.title)}</h3>
      <span class="mag-date">${escaparTexto(fechaRelativa(noticia.date))}</span>
    </a>
  `).join('');
}

function obtenerImagenNoticia(item, fuente) {
  const html = item.content || item.description || '';
  const imagenEnDescripcion = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  return item.thumbnail || item.enclosure?.link || imagenEnDescripcion || magazineFallbackImages[fuente.name];
}

async function cargarFuenteMagazine(fuente) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(fuente.url)}`;
  const respuesta = await fetch(endpoint);
  if (!respuesta.ok) throw new Error(`Fuente ${fuente.name} no disponible`);
  const resultado = await respuesta.json();
  if (resultado.status !== 'ok') throw new Error(`Fuente ${fuente.name} no disponible`);
  return (resultado.items || []).slice(0, 4).map(item => ({
    title: item.title,
    link: item.link,
    date: item.pubDate || new Date().toISOString(),
    category: fuente.name,
    image: obtenerImagenNoticia(item, fuente)
  }));
}

async function cargarMagazine() {
  const estado = document.getElementById('magazineStatus');
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(magazineCacheKey)); } catch (_) { /* cache corrupta */ }

  const cacheVigente = cache?.cachedAt && (Date.now() - cache.cachedAt) < magazineCacheDurationMs;
  if (cacheVigente && cache.items?.length) {
    renderMagazine(cache.items);
    estado.textContent = 'Noticias actualizadas hoy';
    return;
  }

  try {
    const respuestas = await Promise.allSettled(magazineSources.map(cargarFuenteMagazine));
    const noticias = respuestas
      .filter(respuesta => respuesta.status === 'fulfilled')
      .flatMap(respuesta => respuesta.value)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!noticias.length) throw new Error('Sin noticias');
    localStorage.setItem(magazineCacheKey, JSON.stringify({ cachedAt: Date.now(), items: noticias }));
    renderMagazine(noticias);
    estado.textContent = 'Noticias actualizadas hoy';
  } catch (error) {
    console.warn('No se pudieron actualizar las noticias del magazine:', error.message);
    estado.textContent = cache?.items?.length ? 'Mostrando la última actualización disponible' : 'Mostrando contenido editorial';
    if (cache?.items?.length) renderMagazine(cache.items);
  }
}

cargarMagazine();
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input[type="email"]');
    const btn = newsletterForm.querySelector('button');
    const original = btn.textContent;
    btn.textContent = '¡LISTO! ✓';
    input.value = '';
    setTimeout(() => { btn.textContent = original; }, 2200);
  });
}
