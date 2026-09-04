const detalle = document.getElementById('garageDetail');
const estadoDetalle = document.getElementById('garageDetailStatus');
const fotoFallback = 'assets/rpm.png';
const postId = new URLSearchParams(window.location.search).get('id');

const etiquetasTransmision = { manual: 'Manual', automatica: 'Automática' };
const etiquetasCombustible = { nafta: 'Nafta', diesel: 'Diesel', gnc: 'GNC', electrico: 'Eléctrico' };

function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caracter]));
}

function precio(valor) {
  return valor === null || valor === undefined ? '' : '$' + Number(valor).toLocaleString('es-AR');
}

function kilometraje(valor) {
  return valor === null || valor === undefined ? '' : Number(valor).toLocaleString('es-AR') + ' km';
}

function armarWhatsapp(post) {
  const numero = String(post.whatsapp || '').replace(/\D/g, '');
  const mensaje = `Hola, me interesó tu vehículo (${post.title})`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function renderDetalle(post, perfil) {
  const fotos = post.images?.length ? post.images : (post.image_data ? [post.image_data] : [fotoFallback]);
  const nombre = perfil?.display_name || 'Usuario';
  const ficha = [
    post.anio ? `Año: ${post.anio}` : '',
    post.es_usado === false ? '0 km' : (post.es_usado ? 'Usado' : ''),
    post.kilometraje !== null && post.kilometraje !== undefined ? kilometraje(post.kilometraje) : '',
    etiquetasTransmision[post.transmision] || '',
    etiquetasCombustible[post.combustible] || ''
  ].filter(Boolean);

  detalle.innerHTML = `
    <div class="garage-detail-gallery">
      <div class="garage-detail-main-image">
        <img id="garageDetailMainImage" src="${escapar(fotos[0])}" alt="${escapar(post.title)}" onerror="this.onerror=null;this.src='${fotoFallback}'">
      </div>
      ${fotos.length > 1 ? `<div class="garage-detail-thumbs" role="list">
        ${fotos.map((foto, indice) => `<button type="button" class="garage-detail-thumb ${indice === 0 ? 'is-active' : ''}" data-image="${escapar(foto)}" aria-label="Ver foto ${indice + 1}"><img src="${escapar(foto)}" alt="" onerror="this.onerror=null;this.src='${fotoFallback}'"></button>`).join('')}
      </div>` : ''}
    </div>
    <div class="garage-detail-info">
      <p class="garage-kicker">PUBLICACIÓN DEL GARAGE</p>
      <h1>${escapar(post.brand ? post.brand + ' ' : '')}${escapar(post.title)}</h1>
      ${precio(post.precio) ? `<strong class="garage-detail-price">${precio(post.precio)}</strong>` : ''}
      ${ficha.length ? `<div class="garage-detail-specs">${ficha.map(dato => `<span>${escapar(dato)}</span>`).join('')}</div>` : ''}
      ${post.location ? `<p class="garage-detail-location">${escapar(post.location)}</p>` : ''}
      ${post.description ? `<div class="garage-detail-description"><h2>Sobre este auto</h2><p>${escapar(post.description).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div class="garage-detail-publisher"><span>Publicado por</span><a href="perfil.html?id=${encodeURIComponent(post.created_by)}">${escapar(nombre)}</a></div>
      ${post.whatsapp ? `<a class="btn btn-primary garage-detail-contact" href="${armarWhatsapp(post)}" target="_blank" rel="noopener">CONTACTAR POR WHATSAPP</a>` : ''}
    </div>
  `;

  detalle.querySelectorAll('.garage-detail-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      detalle.querySelector('#garageDetailMainImage').src = thumb.dataset.image;
      detalle.querySelectorAll('.garage-detail-thumb').forEach(item => item.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });
  detalle.hidden = false;
  estadoDetalle.hidden = true;
}

async function cargarDetalle() {
  if (!postId) {
    estadoDetalle.textContent = 'No se encontró la publicación solicitada.';
    return;
  }

  const { data: post, error } = await supabaseClient
    .from('garage_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error || !post) {
    estadoDetalle.textContent = 'No se pudo encontrar esta publicación.';
    return;
  }

  const { data: perfil } = await supabaseClient
    .from('public_profiles')
    .select('display_name')
    .eq('id', post.created_by)
    .maybeSingle();

  renderDetalle(post, perfil);
}

cargarDetalle();
