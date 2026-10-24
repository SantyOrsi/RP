// public/js/concesionaria.js
// Ficha pública de una concesionaria.
//  - Con ?id=...  → carga la concesionaria real desde Supabase (vista `concesionarias_publicas`).
//  - Sin ?id      → modo DEMO con datos de ejemplo y selector de plan (Básico / Plus / Pro).
//
// Qué muestra cada plan:
//   basico → logo, contacto, descripción, stock
//   plus   → + portada, redes, próximos eventos
//   pro    → + banner propio e insignia "Destacada"

(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const soloDigitos = (s) => String(s ?? '').replace(/\D/g, '');

  const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.8 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.1.1.6-.1 1.2z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    fb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14 8V6.5c0-.7.2-1 1.1-1H17V2h-2.6C11.6 2 10 3.7 10 6.2V8H8v3.4h2V22h4V11.4h2.7L17 8z"/></svg>',
    web: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  };

  // ---------------------------------------------------------------------------
  // DATOS DE EJEMPLO (modo demo)
  // ---------------------------------------------------------------------------
  const DEMO = {
    plan: 'pro',
    nombre: 'Automotores del Litoral',
    razon_social: 'Automotores del Litoral S.A.',
    verificada: true,
    descripcion: 'Más de 15 años vendiendo usados seleccionados y 0km en Rosario. Todos nuestros autos pasan por revisión mecánica y tienen documentación al día. Aceptamos tu usado como parte de pago y te asesoramos con el financiamiento.',
    direccion: 'Bv. Oroño 1234, Rosario, Santa Fe',
    horarios: 'Lun a Vie 9 a 19 hs · Sáb 9 a 13 hs',
    telefono: '3415551234',
    whatsapp: '5493415551234',
    instagram: 'automotoresdellitoral',
    facebook: 'automotoresdellitoral',
    web: 'https://www.ejemplo.com',
    logo_url: '',
    portada_url: '',
    banner: { titulo: 'Semana del usado seleccionado', texto: 'Financiación en cuotas fijas y tasación de tu usado en el día.', cta: 'Consultar por WhatsApp' },
    eventos: [
      { titulo: 'Jornada de puertas abiertas', fecha: '2026-11-07', lugar: 'Showroom Oroño' },
      { titulo: 'Presentación SUV 2027', fecha: '2026-11-21', lugar: 'Showroom Oroño' },
    ],
    autos: [
      { marca: 'Volkswagen', modelo: 'Golf GTI', anio: 2019, km: 54000, precio: 28500, img: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=700&q=70', tag: 'Destacado' },
      { marca: 'Toyota', modelo: 'Hilux SRV 4x4', anio: 2021, km: 62000, precio: 41900, img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=700&q=70', tag: 'Destacado' },
      { marca: 'Ford', modelo: 'Focus Titanium', anio: 2017, km: 88000, precio: 13200, img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=700&q=70' },
      { marca: 'Chevrolet', modelo: 'Cruze LTZ', anio: 2018, km: 71000, precio: 15800, img: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=700&q=70' },
      { marca: 'Volkswagen', modelo: 'Amarok V6', anio: 2020, km: 49000, precio: 39500, img: '' },
      { marca: 'Renault', modelo: 'Sandero Stepway', anio: 2022, km: 28000, precio: 14900, img: '' },
    ],
  };

  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------
  let data = null;

  const fmtUSD = (n) => 'U$S ' + new Intl.NumberFormat('es-AR').format(n);
  const fmtKm = (n) => new Intl.NumberFormat('es-AR').format(n) + ' km';

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  function render() {
    const d = data;
    const plan = ['basico', 'plus', 'pro'].includes(d.plan) ? d.plan : 'basico';
    const esPlus = plan === 'plus' || plan === 'pro';
    const esPro = plan === 'pro';

    document.title = `${d.nombre} · RPM Rosario`;

    // Portada (solo Plus/Pro)
    const hero = document.querySelector('.conc-hero');
    const cover = $('concCover');
    hero.classList.toggle('conc-hero--sin-portada', !esPlus);
    if (esPlus && d.portada_url) {
      cover.style.backgroundImage = `url("${String(d.portada_url).replace(/"/g, '%22')}")`;
      cover.classList.add('has-img');
    } else {
      cover.style.backgroundImage = '';
      cover.classList.remove('has-img');
    }

    // Logo (o iniciales si no subió)
    const iniciales = d.nombre.split(/\s+/).filter((w) => w.length > 3).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    $('concLogo').innerHTML = d.logo_url
      ? `<img src="${esc(d.logo_url)}" alt="">`
      : `<div class="conc-logo-fallback">${esc(iniciales)}</div>`;

    // Insignias
    const badges = [];
    if (d.verificada) badges.push(`<span class="conc-badge">${ICON.check}VERIFICADA</span>`);
    if (esPro) badges.push(`<span class="conc-badge conc-badge--pro">${ICON.star}DESTACADA</span>`);
    $('concBadges').innerHTML = badges.join('');

    $('concName').textContent = d.nombre;
    $('concMeta').textContent = [d.ciudad || (d.direccion ? 'Rosario, Santa Fe' : ''), `${d.autos.length} ${d.autos.length === 1 ? 'auto' : 'autos'} en stock`].filter(Boolean).join(' · ');

    // Acciones
    const acciones = [];
    if (d.whatsapp) acciones.push(`<a class="btn btn-primary conc-btn-wa" target="_blank" rel="noopener" href="https://wa.me/${soloDigitos(d.whatsapp)}?text=${encodeURIComponent('Hola, vi tu concesionaria en RPM Rosario y quiero consultar por un auto.')}">${ICON.wa} WHATSAPP</a>`);
    if (d.telefono) acciones.push(`<a class="btn btn-outline" href="tel:+${soloDigitos(d.telefono)}">LLAMAR</a>`);
    if (d.direccion) acciones.push(`<a class="btn btn-outline" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.direccion)}">CÓMO LLEGAR</a>`);
    $('concActions').innerHTML = acciones.join('');

    // Banner propio (Pro)
    const banner = $('concBanner');
    if (esPro && d.banner && d.banner.titulo) {
      banner.hidden = false;
      banner.innerHTML = `<div><strong>${esc(d.banner.titulo)}</strong><span>${esc(d.banner.texto || '')}</span></div>` +
        (d.whatsapp ? `<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="https://wa.me/${soloDigitos(d.whatsapp)}">${esc(d.banner.cta || 'CONSULTAR')} <span aria-hidden="true">→</span></a>` : '');
    } else {
      banner.hidden = true;
      banner.innerHTML = '';
    }

    // Sobre nosotros + datos
    $('concAbout').textContent = d.descripcion || 'Esta concesionaria todavía no cargó su descripción.';

    const info = [];
    if (d.direccion) info.push(`<li>${ICON.pin}<div>${esc(d.direccion)}</div></li>`);
    if (d.horarios) info.push(`<li>${ICON.clock}<div>${esc(d.horarios)}</div></li>`);
    if (d.telefono) info.push(`<li>${ICON.phone}<div><a href="tel:+${soloDigitos(d.telefono)}">${esc(d.telefono)}</a></div></li>`);
    $('concInfo').innerHTML = info.join('');

    // Redes (Plus/Pro)
    const social = $('concSocial');
    const redes = [];
    if (esPlus) {
      if (d.instagram) redes.push(`<a href="https://instagram.com/${encodeURIComponent(d.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>`);
      if (d.facebook) redes.push(`<a href="https://facebook.com/${encodeURIComponent(d.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>`);
      if (d.web && /^https?:\/\//i.test(d.web)) redes.push(`<a href="${esc(d.web)}" target="_blank" rel="noopener" aria-label="Sitio web">${ICON.web}</a>`);
    }
    social.hidden = redes.length === 0;
    social.innerHTML = redes.join('');

    // Eventos (Plus/Pro)
    const evCard = $('concEventsCard');
    const evs = esPlus ? (d.eventos || []) : [];
    evCard.hidden = evs.length === 0;
    $('concEvents').innerHTML = evs.map((e) => {
      const f = new Date(e.fecha + 'T12:00:00');
      return `<li class="conc-event">
        <div class="conc-event-date"><b>${f.getDate()}</b><span>${MESES[f.getMonth()]}</span></div>
        <div><strong>${esc(e.titulo)}</strong><small>${esc(e.lugar || '')}</small></div>
      </li>`;
    }).join('');

    // Filtro de marcas
    const marcas = [...new Set(d.autos.map((a) => a.marca))].sort();
    const sel = $('fMarca');
    const actual = sel.value;
    sel.innerHTML = '<option value="">Todas las marcas</option>' + marcas.map((m) => `<option>${esc(m)}</option>`).join('');
    if (marcas.includes(actual)) sel.value = actual;

    renderStock();

    $('concStatus').hidden = true;
    $('concContent').hidden = false;
  }

  function renderStock() {
    const marca = $('fMarca').value;
    const orden = $('fOrden').value;
    let lista = data.autos.filter((a) => !marca || a.marca === marca);

    if (orden === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
    else if (orden === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);

    $('stockCount').textContent = `(${lista.length})`;
    $('concEmpty').hidden = lista.length > 0;
    $('concGrid').innerHTML = lista.map((a) => `
      <article class="conc-car">
        <div class="conc-car-img">
          ${a.img ? `<img src="${esc(a.img)}" alt="${esc(a.marca + ' ' + a.modelo)}" loading="lazy" onerror="this.remove()">` : ''}
          ${a.tag ? `<span class="conc-car-tag">${esc(a.tag.toUpperCase())}</span>` : ''}
        </div>
        <div class="conc-car-body">
          <h3 class="conc-car-name">${esc(a.marca)} ${esc(a.modelo)}</h3>
          <span class="conc-car-meta">${esc(a.anio)} · ${fmtKm(a.km)}</span>
          <span class="conc-car-price">${fmtUSD(a.precio)}</span>
        </div>
      </article>`).join('');
  }

  // ---------------------------------------------------------------------------
  // CARGA
  // ---------------------------------------------------------------------------
  function mostrarError(texto) {
    $('concContent').hidden = true;
    $('concStatus').hidden = false;
    $('concStatus').textContent = texto;
  }

  async function cargarReal(id) {
    if (typeof supabaseClient === 'undefined') return mostrarError('No se pudo conectar. Probá de nuevo.');

    // Se lee la VISTA pública: solo trae concesionarias verificadas y nunca expone CUIT ni datos internos.
    // El plan (portada, redes) ya viene aplicado desde la base.
    const { data: c, error } = await supabaseClient.from('concesionarias_publicas').select('*').eq('id', id).maybeSingle();
    if (error) { console.error('❌ concesionarias_publicas:', error); return mostrarError('No se pudo cargar la concesionaria.'); }
    if (!c) return mostrarError('No encontramos esa concesionaria.');

    // ⚠️ Ajustá el nombre de la tabla y de las columnas a como guardás los autos.
    // (Hoy la ficha asume una tabla `autos` con concesionaria_id; si tu garage usa otra, cambiá solo este bloque.)
    const { data: autos, error: errAutos } = await supabaseClient
      .from('autos').select('*').eq('concesionaria_id', id).eq('estado', 'activo').order('created_at', { ascending: false });
    if (errAutos) console.error('❌ autos:', errAutos);

    data = {
      ...c,
      nombre: c.nombre || c.razon_social,
      verificada: true,
      eventos: [],
      autos: (autos || []).map((a) => ({
        marca: a.marca, modelo: a.modelo, anio: a.anio, km: a.km, precio: a.precio,
        img: (a.fotos && a.fotos[0]) || a.foto_principal || '', tag: a.destacado ? 'Destacado' : '',
      })),
    };
    render();
  }

  function iniciarDemo() {
    data = JSON.parse(JSON.stringify(DEMO));
    const bar = $('demoBar');
    bar.hidden = false;
    const marcar = () => bar.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.plan === data.plan));
    bar.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      data.plan = b.dataset.plan;
      marcar();
      render();
    }));
    marcar();
    render();
  }

  $('fMarca').addEventListener('change', renderStock);
  $('fOrden').addEventListener('change', renderStock);

  const id = params.get('id');
  if (id) cargarReal(id);
  else iniciarDemo();
})();
