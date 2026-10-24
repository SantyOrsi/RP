// public/js/mi-concesionaria.js
// Panel de la concesionaria: activar, completar la ficha y pedir verificación.
// La verificación REAL la hace un admin (admin-concesionarias.html). Acá el usuario
// solo puede pedir la revisión: el estado, el plan y la insignia los protege la base
// (trigger guard_concesionaria en concesionarias.sql), no este código.

(function () {
  const $ = (id) => document.getElementById(id);
  const sb = supabaseClient;
  const CONTACTO = 'Rpm.rosario.km@gmail.com';
  const BUCKET_CONSTANCIAS = 'verificaciones';
  const BUCKET_LOGOS = 'concesionarias-logos';

  let uid = null;
  let profile = {};
  let row = null;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (s) => String(s ?? '').replace(/\D/g, '');
  const vacioANull = (s) => { s = String(s ?? '').trim(); return s === '' ? null : s; };
  const fmtCuit = (c) => (c && c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c || '');
  const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

  function msg(el, texto, ok = false) {
    el.textContent = texto;
    el.hidden = false;
    el.classList.toggle('is-success', ok);
  }

  function validarCuit(valor) {
    const limpio = digits(valor);
    if (!/^\d{11}$/.test(limpio)) return false;
    const d = limpio.split('').map(Number);
    const m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = d.slice(0, 10).reduce((acc, x, i) => acc + x * m[i], 0);
    let v = 11 - (suma % 11);
    if (v === 11) v = 0;
    if (v === 10) v = 9;
    return v === d[10];
  }

  const igHandle = (s) => String(s ?? '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[\/?#].*$/, '');
  const fbHandle = (s) => String(s ?? '').trim().replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/^@/, '').replace(/[\/?#].*$/, '');
  const normWeb = (s) => {
    s = String(s ?? '').trim();
    if (!s) return null;
    return /^https?:\/\//i.test(s) ? s : 'https://' + s;
  };

  function fatal(texto) {
    $('cpApp').hidden = true;
    $('cpStatus').hidden = false;
    $('cpStatus').textContent = texto;
  }

  // Achica una imagen y la pasa a WebP (como hacés con las del admin)
  function aWebp(file, maxLado) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, maxLado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve({ blob: b, ext: 'webp', type: 'image/webp' }) : c.toBlob((j) => (j ? resolve({ blob: j, ext: 'jpg', type: 'image/jpeg' }) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85)), 'image/webp', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('La imagen no es válida')); };
      img.src = url;
    });
  }

  // ---------- carga ----------
  async function init() {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session) { window.location.href = 'auth.html'; return; }
    uid = session.user.id;

    const { data: p } = await sb.from('profiles').select('account_type,razon_social,documento_tipo,documento').eq('id', uid).maybeSingle();
    profile = p || {};

    await cargarFila();
    render();
  }

  async function cargarFila() {
    const { data, error } = await sb.from('concesionarias').select('*').eq('user_id', uid).maybeSingle();
    if (error) { console.error('❌ concesionarias:', error); fatal('No se pudo cargar tu concesionaria. Probá de nuevo en un rato.'); throw error; }
    row = data;
  }

  // ---------- render ----------
  function render() {
    $('cpStatus').hidden = true;
    $('cpApp').hidden = false;
    ['cpEstado', 'cpParticular', 'cpActivar', 'cpPanel'].forEach((id) => { $(id).hidden = true; });
    $('cpSub').textContent = '';

    if (!row) {
      if (profile.account_type !== 'concesionaria') { $('cpParticular').hidden = false; return; }
      $('cpSub').textContent = 'Un paso más para empezar.';
      const f = $('activarForm');
      f.razon_social.value = profile.razon_social || '';
      f.cuit.value = profile.documento_tipo === 'cuit' ? digits(profile.documento) : '';
      $('cpActivar').hidden = false;
      return;
    }

    $('cpSub').textContent = row.razon_social + ' · CUIT ' + fmtCuit(row.cuit);
    renderEstado();
    $('cpPanel').hidden = false;
    renderVerificacion();
    renderFicha();
    renderPlan();
  }

  function renderEstado() {
    const el = $('cpEstado');
    const textos = {
      pendiente: ['Falta verificar tu concesionaria', 'Completá tu ficha y subí la constancia de inscripción de ARCA. Hasta que la verifiquemos tu cuenta funciona como una cuenta particular y no aparecés en el listado de concesionarias.'],
      en_revision: ['Estamos revisando tu concesionaria', `Recibimos tu constancia el ${fmtFecha(row.constancia_subida_at)}. Revisamos las solicitudes una por una; cuando esté lista vas a ver el cambio acá.`],
      verificada: ['Concesionaria verificada', 'Ya aparecés en RPM con la insignia de verificada.'],
      rechazada: ['No pudimos verificar tu concesionaria', row.motivo_rechazo ? `Motivo: ${row.motivo_rechazo}. Corregí lo que haga falta y volvé a enviarla.` : 'Corregí tus datos y volvé a enviar la constancia.'],
      suspendida: ['Tu concesionaria está suspendida', `Para saber más escribinos a ${CONTACTO}.`],
    };
    const [titulo, texto] = textos[row.estado] || textos.pendiente;
    el.className = 'cp-estado cp-estado--' + row.estado;
    el.innerHTML = `<span class="cp-estado-dot" aria-hidden="true"></span><div><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></div>`;
    el.hidden = false;
  }

  const fichaCompleta = () => !!(row.direccion && (row.whatsapp || row.telefono));

  function renderVerificacion() {
    const body = $('cpVerifBody');
    const e = row.estado;

    if (e === 'verificada') {
      body.innerHTML = `<p class="cp-lead" style="margin:0">Todo en orden. Si cambiás de CUIT o de razón social tenés que volver a verificar.</p>`;
      return;
    }
    if (e === 'en_revision') {
      body.innerHTML = `<p class="cp-lead" style="margin:0">Constancia enviada el ${esc(fmtFecha(row.constancia_subida_at))}. No hace falta que hagas nada más.</p>`;
      return;
    }
    if (e === 'suspendida') {
      body.innerHTML = `<p class="cp-lead" style="margin:0">Tu cuenta está suspendida. Escribinos a <a href="mailto:${CONTACTO}" style="color:var(--accent-bright)">${CONTACTO}</a>.</p>`;
      return;
    }

    // pendiente o rechazada: se puede (re)enviar
    const okDatos = fichaCompleta();
    body.innerHTML = `
      <p class="cp-lead">Para verificarte necesitamos la <strong>constancia de inscripción de ARCA</strong> (se descarga gratis desde la web de ARCA con tu clave fiscal). Tiene que mostrar el mismo CUIT y razón social que cargaste.</p>
      <ul class="cp-req">
        <li class="${okDatos ? 'is-ok' : ''}">Dirección y teléfono o WhatsApp cargados en tu ficha</li>
        <li class="${row.constancia_path ? 'is-ok' : ''}">Constancia de ARCA (PDF, JPG o PNG, hasta 5 MB)</li>
      </ul>
      <form class="cp-form" id="verifForm" novalidate>
        <label class="auth-field">
          <span>Constancia de inscripción</span>
          <input type="file" id="constanciaFile" accept="application/pdf,image/png,image/jpeg,image/webp" ${okDatos ? '' : 'disabled'}>
        </label>
        <p class="auth-message" id="verifMsg" hidden></p>
        <div class="cp-actions"><button type="submit" class="btn btn-primary" ${okDatos ? '' : 'disabled'}>ENVIAR PARA REVISIÓN</button></div>
        ${okDatos ? '' : '<p class="cp-hint">Completá y guardá primero la dirección y un teléfono o WhatsApp en tu ficha.</p>'}
      </form>`;

    $('verifForm').addEventListener('submit', enviarConstancia);
  }

  function renderFicha() {
    const f = $('fichaForm');
    $('roRazon').value = row.razon_social;
    $('roCuit').value = fmtCuit(row.cuit);
    ['nombre_comercial', 'descripcion', 'direccion', 'horarios', 'telefono', 'whatsapp', 'instagram', 'facebook', 'web'].forEach((k) => {
      f[k].value = row[k] || '';
    });
    $('logoPreview').innerHTML = row.logo_url ? `<img src="${esc(row.logo_url)}" alt="">` : 'Sin logo';
    $('portadaPreview').innerHTML = row.portada_url ? `<img src="${esc(row.portada_url)}" alt="" style="object-fit:cover">` : 'Sin portada';

    const conRedes = row.plan === 'plus' || row.plan === 'pro';
    $('planSocialHint').textContent = conRedes
      ? 'Con tu plan se muestran tus redes, tu sitio y tu portada.'
      : 'Instagram, Facebook, sitio web y portada se muestran con los planes Plus y Pro. Podés dejarlos cargados desde ya.';
    $('portadaFile').disabled = !conRedes;

    $('cpFichaLink').innerHTML = row.estado === 'verificada'
      ? `<a href="concesionaria.html?id=${encodeURIComponent(row.id)}" style="color:var(--accent-bright);text-decoration:underline">Ver mi ficha pública</a>`
      : 'Se publica cuando tu concesionaria esté verificada.';
  }

  function renderPlan() {
    const venc = row.plan_vence_el ? new Date(row.plan_vence_el + 'T12:00:00').toLocaleDateString('es-AR') : 'Sin vencimiento';
    $('cpPlanBody').innerHTML = `
      <div><small>Plan</small><b>${esc(row.plan.toUpperCase())}</b></div>
      <div><small>Vence</small><b>${esc(venc)}</b></div>
      <div><small>Estado</small><b>${esc(row.estado.replace('_', ' ').toUpperCase())}</b></div>`;
  }

  // ---------- acciones ----------
  $('activarCuit').addEventListener('input', (e) => { e.target.value = digits(e.target.value).slice(0, 11); });

  $('activarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const m = $('activarMsg');
    m.hidden = true;
    const razon = f.razon_social.value.trim();
    const cuit = digits(f.cuit.value);

    if (razon.length < 3) return msg(m, 'Ingresá la razón social (mínimo 3 caracteres).');
    if (!validarCuit(cuit)) return msg(m, digits(f.cuit.value).length !== 11 ? 'El CUIT tiene que tener 11 números.' : 'El CUIT no es válido: el último dígito no coincide. Revisá que lo hayas copiado bien de tu constancia de ARCA.');

    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await sb.from('concesionarias').insert({ user_id: uid, razon_social: razon, cuit });
    btn.disabled = false;

    if (error) {
      console.error('❌ insert concesionaria:', error);
      if (error.code === '23505') return msg(m, `Ese CUIT ya está registrado en otra cuenta. Si es tu concesionaria, escribinos a ${CONTACTO}.`);
      return msg(m, 'No se pudo activar. Probá de nuevo.');
    }
    await cargarFila();
    render();
  });

  $('fichaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const m = $('fichaMsg');
    m.hidden = true;

    const cambios = {
      nombre_comercial: vacioANull(f.nombre_comercial.value),
      descripcion: vacioANull(f.descripcion.value),
      direccion: vacioANull(f.direccion.value),
      horarios: vacioANull(f.horarios.value),
      telefono: vacioANull(digits(f.telefono.value)),
      whatsapp: vacioANull(digits(f.whatsapp.value)),
      instagram: vacioANull(igHandle(f.instagram.value)),
      facebook: vacioANull(fbHandle(f.facebook.value)),
      web: normWeb(f.web.value),
    };

    if (cambios.telefono && !/^\d{6,15}$/.test(cambios.telefono)) return msg(m, 'El teléfono debe tener entre 6 y 15 números.');
    if (cambios.whatsapp && !/^\d{8,15}$/.test(cambios.whatsapp)) return msg(m, 'El WhatsApp debe tener entre 8 y 15 números, con código de país (ej: 5493415551234).');
    if (cambios.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(cambios.instagram)) return msg(m, 'El usuario de Instagram no es válido.');
    if (cambios.facebook && !/^[A-Za-z0-9.-]{1,50}$/.test(cambios.facebook)) return msg(m, 'El usuario de Facebook no es válido.');
    if (cambios.web && !(/^https?:\/\/\S+$/i.test(cambios.web) && cambios.web.length <= 200)) return msg(m, 'El sitio web no es válido.');

    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await sb.from('concesionarias').update(cambios).eq('user_id', uid);
    btn.disabled = false;

    if (error) { console.error('❌ update ficha:', error); return msg(m, 'No se pudo guardar. Revisá los datos e intentá de nuevo.'); }
    await cargarFila();
    render();
    msg($('fichaMsg'), 'Ficha guardada.', true);
  });

  async function subirImagen(inputId, tipo, maxLado, campo, msgEl) {
    const file = $(inputId).files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return msg(msgEl, 'Elegí una imagen PNG, JPG o WebP.');
    if (file.size > 10 * 1024 * 1024) return msg(msgEl, 'La imagen pesa demasiado (máximo 10 MB).');
    try {
      const { blob, ext, type } = await aWebp(file, maxLado);
      const path = `${uid}/${tipo}-${Date.now()}.${ext}`;
      const up = await sb.storage.from(BUCKET_LOGOS).upload(path, blob, { contentType: type, upsert: false });
      if (up.error) throw up.error;
      const url = sb.storage.from(BUCKET_LOGOS).getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from('concesionarias').update({ [campo]: url }).eq('user_id', uid);
      if (error) throw error;
      await cargarFila();
      render();
      msg($('fichaMsg'), 'Imagen actualizada.', true);
    } catch (err) {
      console.error('❌ subir imagen:', err);
      msg(msgEl, 'No se pudo subir la imagen. Probá con otra.');
    }
  }

  $('logoFile').addEventListener('change', () => subirImagen('logoFile', 'logo', 512, 'logo_url', $('fichaMsg')));
  $('portadaFile').addEventListener('change', () => subirImagen('portadaFile', 'portada', 1600, 'portada_url', $('fichaMsg')));

  async function enviarConstancia(e) {
    e.preventDefault();
    const m = $('verifMsg');
    m.hidden = true;
    const file = $('constanciaFile').files[0];
    if (!file) return msg(m, 'Elegí el archivo de la constancia.');

    const permitidos = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = permitidos[file.type];
    if (!ext) return msg(m, 'El archivo tiene que ser PDF, JPG o PNG.');
    if (file.size > 5 * 1024 * 1024) return msg(m, 'El archivo pesa más de 5 MB.');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'ENVIANDO…';
    try {
      const path = `${uid}/constancia-${Date.now()}.${ext}`;
      const up = await sb.storage.from(BUCKET_CONSTANCIAS).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await sb.from('concesionarias').update({ constancia_path: path, estado: 'en_revision' }).eq('user_id', uid);
      if (error) throw error;
      await cargarFila();
      render();
    } catch (err) {
      console.error('❌ enviar constancia:', err);
      msg(m, 'No se pudo enviar la constancia. Probá de nuevo.');
      btn.disabled = false;
      btn.textContent = 'ENVIAR PARA REVISIÓN';
    }
  }

  init().catch((err) => console.error('❌ init:', err));
})();
