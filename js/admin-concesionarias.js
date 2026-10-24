// public/js/admin-concesionarias.js
// Pantalla del admin para revisar y aprobar concesionarias.
// Es independiente de admin.js. El permiso real lo da la base: las políticas de
// concesionarias.sql solo dejan leer/editar todo a quien tiene profiles.is_admin = true.

(function () {
  const $ = (id) => document.getElementById(id);
  const sb = supabaseClient;

  const ESTADOS = [
    ['en_revision', 'En revisión'],
    ['pendiente', 'Pendientes'],
    ['verificada', 'Verificadas'],
    ['rechazada', 'Rechazadas'],
    ['suspendida', 'Suspendidas'],
    ['todas', 'Todas'],
  ];
  const CHECKLIST = [
    'El CUIT de la constancia coincide con el cargado',
    'La razón social de la constancia coincide',
    'La actividad declarada es venta de automotores (o rubro afín)',
    'El domicilio existe (lo vi en Google Maps)',
    'Lo confirmé por un canal que encontré yo (Google Maps, web, Instagram), no solo por el teléfono que cargó',
  ];

  let filas = [];
  let filtro = 'en_revision';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (s) => String(s ?? '').replace(/\D/g, '');
  const fmtCuit = (c) => (c && c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c || '');
  const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

  function estadoPantalla(texto, linkHtml) {
    $('acApp').hidden = true;
    $('acStatus').hidden = false;
    $('acStatus').innerHTML = esc(texto) + (linkHtml || '');
  }

  async function init() {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session) return estadoPantalla('Necesitás iniciar sesión como administrador. ', '<a href="admin.html" style="color:var(--accent-bright);text-decoration:underline">Ir al login del panel</a>');

    const { data: p } = await sb.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
    if (!p || !p.is_admin) return estadoPantalla('Acceso restringido a administradores.');

    $('acStatus').hidden = true;
    $('acApp').hidden = false;
    await cargar();
  }

  async function cargar() {
    const { data, error } = await sb.from('concesionarias').select('*').order('created_at', { ascending: false });
    if (error) { console.error('❌ concesionarias:', error); return estadoPantalla('No se pudieron cargar las concesionarias.'); }
    filas = data || [];
    render();
  }

  function render() {
    const cuenta = (k) => (k === 'todas' ? filas.length : filas.filter((f) => f.estado === k).length);
    $('acPills').innerHTML = ESTADOS.map(([k, label]) =>
      `<button type="button" class="ac-pill ${k === filtro ? 'is-active' : ''}" data-f="${k}" role="tab">${label}<b>${cuenta(k)}</b></button>`).join('');
    $('acPills').querySelectorAll('.ac-pill').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.f; render(); }));

    const lista = filas.filter((f) => filtro === 'todas' || f.estado === filtro);
    $('acList').innerHTML = lista.length
      ? lista.map(tarjeta).join('')
      : '<p class="ac-empty">No hay concesionarias en este estado.</p>';

    $('acList').querySelectorAll('.ac-card').forEach(conectar);
  }

  function tarjeta(f) {
    const nombre = f.nombre_comercial ? `${esc(f.razon_social)} <small>(${esc(f.nombre_comercial)})</small>` : esc(f.razon_social);
    const busqueda = encodeURIComponent(`${f.nombre_comercial || f.razon_social} Rosario`);
    const mapa = encodeURIComponent(`${f.direccion || ''} ${f.nombre_comercial || f.razon_social}`.trim());
    const wa = f.whatsapp ? `<a href="https://wa.me/${digits(f.whatsapp)}" target="_blank" rel="noopener">WhatsApp ↗</a>` : '';
    const constancia = f.constancia_path ? `<button type="button" data-act="ver">Ver constancia</button>` : '<span class="cp-hint" style="align-self:center">Sin constancia subida</span>';
    const borrarC = f.constancia_path && f.estado === 'verificada' ? `<button type="button" data-act="borrar-constancia">Borrar constancia</button>` : '';

    const plan = `
      <label class="auth-field"><span>Plan</span>
        <select data-k="plan">${['basico', 'plus', 'pro'].map((p) => `<option value="${p}" ${f.plan === p ? 'selected' : ''}>${p.toUpperCase()}</option>`).join('')}</select>
      </label>
      <label class="auth-field"><span>Vence (opcional)</span>
        <input type="date" data-k="vence" value="${esc(f.plan_vence_el || '')}">
      </label>`;

    let acciones = '';
    if (['en_revision', 'pendiente', 'rechazada'].includes(f.estado)) {
      acciones = `
        <div class="ac-check">
          ${CHECKLIST.map((t, i) => `<label><input type="checkbox" data-chk="${i}"><span>${esc(t)}</span></label>`).join('')}
        </div>
        <div class="ac-decide">
          ${plan}
          <button type="button" class="btn btn-primary" data-act="aprobar" disabled>APROBAR</button>
        </div>
        <div class="ac-reject">
          <input type="text" data-k="motivo" maxlength="200" placeholder="Motivo del rechazo (se lo mostramos a la concesionaria)">
          <button type="button" class="btn btn-danger" data-act="rechazar">RECHAZAR</button>
        </div>`;
    } else if (f.estado === 'verificada') {
      acciones = `
        <div class="ac-decide">
          ${plan}
          <button type="button" class="btn btn-outline" data-act="guardar-plan">GUARDAR PLAN</button>
          <button type="button" class="btn btn-danger" data-act="suspender">SUSPENDER</button>
        </div>`;
    } else if (f.estado === 'suspendida') {
      acciones = `<div class="ac-decide"><button type="button" class="btn btn-primary" data-act="reactivar">REACTIVAR</button></div>`;
    }

    return `
      <article class="ac-card" data-id="${esc(f.id)}">
        <div class="ac-card-head">
          <div><h3>${nombre}</h3><small>CUIT ${esc(fmtCuit(f.cuit))} · alta ${esc(fmtFecha(f.created_at))}</small></div>
          <span class="ac-badge ac-badge--${esc(f.estado)}">${esc(f.estado.replace('_', ' ').toUpperCase())}</span>
        </div>
        <div class="ac-data">
          <div><span>Dirección</span>${esc(f.direccion || '—')}</div>
          <div><span>Teléfono / WhatsApp</span>${esc(f.telefono || '—')} / ${esc(f.whatsapp || '—')}</div>
          <div><span>Horarios</span>${esc(f.horarios || '—')}</div>
          <div><span>Constancia subida</span>${esc(fmtFecha(f.constancia_subida_at))}</div>
          <div style="grid-column:1/-1"><span>Descripción</span>${esc(f.descripcion || '—')}</div>
          ${f.motivo_rechazo ? `<div style="grid-column:1/-1"><span>Último motivo de rechazo</span>${esc(f.motivo_rechazo)}</div>` : ''}
        </div>
        <div class="ac-links">
          ${constancia}
          ${wa}
          <a href="https://www.google.com/maps/search/?api=1&query=${mapa}" target="_blank" rel="noopener">Google Maps ↗</a>
          <a href="https://www.google.com/search?q=${busqueda}" target="_blank" rel="noopener">Buscar en Google ↗</a>
          ${borrarC}
        </div>
        ${acciones}
      </article>`;
  }

  function conectar(card) {
    const f = filas.find((x) => x.id === card.dataset.id);
    const get = (k) => card.querySelector(`[data-k="${k}"]`);
    const aprobar = card.querySelector('[data-act="aprobar"]');

    // Aprobar solo se habilita con el checklist completo y la constancia presente
    const chks = [...card.querySelectorAll('[data-chk]')];
    const revisar = () => { if (aprobar) aprobar.disabled = !(f.constancia_path && chks.every((c) => c.checked)); };
    chks.forEach((c) => c.addEventListener('change', revisar));
    revisar();

    const planActual = () => ({ plan: get('plan').value, plan_vence_el: get('vence').value || null });

    card.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const act = b.dataset.act;
      b.disabled = true;
      try {
        if (act === 'ver') {
          const { data, error } = await sb.storage.from('verificaciones').createSignedUrl(f.constancia_path, 300);
          if (error) throw error;
          window.open(data.signedUrl, '_blank', 'noopener');
        } else if (act === 'aprobar') {
          await actualizar(f, { estado: 'verificada', ...planActual() });
        } else if (act === 'rechazar') {
          const motivo = get('motivo').value.trim();
          if (motivo.length < 5) { alert('Escribí el motivo del rechazo (mínimo 5 caracteres).'); return; }
          await actualizar(f, { estado: 'rechazada', motivo_rechazo: motivo });
        } else if (act === 'guardar-plan') {
          await actualizar(f, planActual());
        } else if (act === 'suspender') {
          if (!confirm('¿Suspender esta concesionaria? Deja de aparecer en el sitio.')) return;
          await actualizar(f, { estado: 'suspendida' });
        } else if (act === 'reactivar') {
          await actualizar(f, { estado: 'verificada' });
        } else if (act === 'borrar-constancia') {
          if (!confirm('¿Borrar la constancia guardada? No se puede deshacer.')) return;
          const rm = await sb.storage.from('verificaciones').remove([f.constancia_path]);
          if (rm.error) throw rm.error;
          await actualizar(f, { constancia_path: null });
        }
      } catch (err) {
        console.error('❌ acción admin:', err);
        alert('No se pudo completar la acción. Probá de nuevo.');
      } finally {
        b.disabled = false;
      }
    }));
  }

  async function actualizar(f, cambios) {
    const { error } = await sb.from('concesionarias').update(cambios).eq('id', f.id);
    if (error) throw error;
    await cargar();
  }

  $('acRefresh').addEventListener('click', cargar);
  init().catch((err) => console.error('❌ init:', err));
})();
