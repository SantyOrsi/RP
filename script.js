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
