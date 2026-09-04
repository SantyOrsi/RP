// public/js/perfil.js
// Muestra el perfil propio (sin /?id=...) o el de otro usuario
// (con /?id=UUID). Si es de otro usuario y hay sesión iniciada,
// muestra el widget para calificarlo con estrellas.

const perfilContenido = document.getElementById('perfilContenido');
const perfilTipo = document.getElementById('perfilTipo');
const perfilNombre = document.getElementById('perfilNombre');
const perfilEstrellasPromedio = document.getElementById('perfilEstrellasPromedio');
const perfilRatingTexto = document.getElementById('perfilRatingTexto');
const calificarCard = document.getElementById('calificarCard');
const calificarSubtitulo = document.getElementById('calificarSubtitulo');
const estrellasInput = document.getElementById('estrellasInput');
const calificarMessage = document.getElementById('calificarMessage');
const autosPublicados = document.getElementById('autosPublicados');
const logoutBtn = document.getElementById('logoutBtn');
const miPerfilCard = document.getElementById('miPerfilCard');
const cargarFotoBtn = document.getElementById('cargarFotoBtn');
const fotoInput = document.getElementById('fotoInput');
const fotoMessage = document.getElementById('fotoMessage');
const perfilAvatarImg = document.getElementById('perfilAvatarImg');
const perfilAvatarSvg = document.getElementById('perfilAvatarSvg');
const cambiarFotoBtn = document.getElementById('cambiarFotoBtn');
const datosPersonalesCard = document.getElementById('datosPersonalesCard');
const datosPersonalesLista = document.getElementById('datosPersonalesLista');

function dibujarEstrellas(promedio) {
  const llenas = Math.round(promedio);
  return '★★★★★'.split('').map((_, i) => i < llenas ? '★' : '☆').join('');
}

function escaparTexto(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caracter]));
}

function mostrarDatosPersonales(perfil) {
  const datos = [
    ['Nombre', perfil.nombre],
    ['Apellido', perfil.apellido],
    ['Documento', perfil.documento ? `${(perfil.documento_tipo || '').toUpperCase()}: ${perfil.documento}` : ''],
    ['Provincia', perfil.provincia],
    ['Ciudad', perfil.ciudad],
    ['Prefijo', perfil.prefijo],
    ['Teléfono móvil', perfil.telefono_movil],
    ['Email', perfil.email]
  ].filter(([, valor]) => valor);

  if (!datos.length) return;
  datosPersonalesLista.innerHTML = datos.map(([etiqueta, valor]) => `
    <div><span>${etiqueta}</span><strong>${escaparTexto(valor)}</strong></div>
  `).join('');
  datosPersonalesCard.hidden = false;
}

async function cargarPromedio(userId) {
  const { data, error } = await supabaseClient
    .from('ratings')
    .select('stars')
    .eq('rated_user_id', userId);

  if (error || !data || data.length === 0) {
    perfilEstrellasPromedio.textContent = '☆☆☆☆☆';
    perfilRatingTexto.textContent = 'Sin calificaciones todavía';
    return;
  }

  const promedio = data.reduce((acc, r) => acc + r.stars, 0) / data.length;
  perfilEstrellasPromedio.textContent = dibujarEstrellas(promedio);
  perfilRatingTexto.textContent = `${promedio.toFixed(1)} / 5 (${data.length} ${data.length === 1 ? 'calificación' : 'calificaciones'})`;
}

async function configurarWidgetCalificar(sessionUserId, perfilUserId) {
  calificarCard.hidden = false;

  // Ver si ya lo calificaste antes, para dejar marcada esa cantidad de estrellas.
  const { data: propia } = await supabaseClient
    .from('ratings')
    .select('stars')
    .eq('rated_user_id', perfilUserId)
    .eq('rater_user_id', sessionUserId)
    .maybeSingle();

  let seleccion = propia ? propia.stars : 0;
  pintarEstrellas(seleccion);
  if (propia) {
    calificarSubtitulo.textContent = 'Ya calificaste a este usuario. Podés cambiar tu calificación.';
  }

  function pintarEstrellas(valor) {
    estrellasInput.querySelectorAll('.estrella-btn').forEach(btn => {
      btn.classList.toggle('is-filled', Number(btn.dataset.valor) <= valor);
    });
  }

  estrellasInput.querySelectorAll('.estrella-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => pintarEstrellas(Number(btn.dataset.valor)));
    btn.addEventListener('mouseleave', () => pintarEstrellas(seleccion));

    btn.addEventListener('click', async () => {
      seleccion = Number(btn.dataset.valor);
      pintarEstrellas(seleccion);

      const { error } = await supabaseClient
        .from('ratings')
        .upsert(
          { rated_user_id: perfilUserId, rater_user_id: sessionUserId, stars: seleccion, updated_at: new Date().toISOString() },
          { onConflict: 'rated_user_id,rater_user_id' }
        );

      calificarMessage.hidden = false;
      if (error) {
        calificarMessage.textContent = 'No se pudo guardar tu calificación.';
        calificarMessage.classList.remove('is-success');
      } else {
        calificarMessage.textContent = '¡Gracias por calificar!';
        calificarMessage.classList.add('is-success');
        cargarPromedio(perfilUserId);
      }
    });
  });
}

// Funciones para la carga y conversión de fotos
function convertirAWebP(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            // Convertir blob a base64
            const readerBase64 = new FileReader();
            readerBase64.onload = () => {
              resolve(readerBase64.result); // data:image/webp;base64,...
            };
            readerBase64.readAsDataURL(blob);
          } else {
            reject(new Error('No se pudo convertir la imagen a webP'));
          }
        }, 'image/webp', 0.8);
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function mostrarFotoGuardada(userId) {
  const { data, error } = await supabaseClient
    .from('public_profiles')
    .select('avatar_data')
    .eq('id', userId)
    .single();

  if (!error && data?.avatar_data) {
    perfilAvatarImg.src = data.avatar_data;
    perfilAvatarImg.style.display = 'block';
    perfilAvatarSvg.style.display = 'none';
  }
}

async function configurarCargaFoto(userId) {
  miPerfilCard.hidden = false;
  cambiarFotoBtn.hidden = false;

  // Mostrar foto guardada si existe
  await mostrarFotoGuardada(userId);

  const manejarCarga = async (file) => {
    if (!file.type.startsWith('image/')) {
      fotoMessage.textContent = 'Por favor selecciona una imagen válida.';
      fotoMessage.classList.remove('is-success');
      fotoMessage.hidden = false;
      return;
    }

    fotoMessage.textContent = 'Convirtiendo imagen a webP...';
    fotoMessage.classList.remove('is-success');
    fotoMessage.hidden = false;

    try {
      const webpBase64 = await convertirAWebP(file);
      
      // Mostrar vista previa
      perfilAvatarImg.src = webpBase64;
      perfilAvatarImg.style.display = 'block';
      perfilAvatarSvg.style.display = 'none';

      fotoMessage.textContent = 'Guardando foto en la base de datos...';

      // Guardar directamente en la BD
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_data: webpBase64 })
        .eq('id', userId);

      if (updateError) {
        fotoMessage.textContent = 'Error al guardar la foto. Intenta de nuevo.';
        fotoMessage.classList.remove('is-success');
        throw updateError;
      }

      fotoMessage.textContent = '¡Foto actualizada correctamente!';
      fotoMessage.classList.add('is-success');
    } catch (error) {
      console.error('Error:', error);
      if (!fotoMessage.textContent.includes('Error')) {
        fotoMessage.textContent = 'Error al procesar la foto. Intenta de nuevo.';
        fotoMessage.classList.remove('is-success');
      }
    }
  };

  // Botón para cargar foto
  cargarFotoBtn.addEventListener('click', () => {
    fotoInput.click();
  });

  // Manejar selección de archivo
  fotoInput.addEventListener('change', (e) => {
    if (e.target.files?.length > 0) {
      manejarCarga(e.target.files[0]);
    }
  });

  // Botón de cambiar foto en el avatar
  cambiarFotoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fotoInput.click();
  });
}

function tarjetaAutoPublicada(auto) {
  const foto = auto.images?.[0] || auto.image_data;
  const fotoMarkup = foto
    ? `<img src="${foto}" alt="${auto.brand ? auto.brand + ' ' : ''}${auto.title}" loading="lazy" onerror="this.onerror=null;this.src='assets/rpm.png'">`
    : `<img src="assets/rpm.png" alt="RPM Rosario" loading="lazy">`;
  const ficha = [auto.anio, auto.es_usado === false ? '0km' : 'Usado']
    .filter(Boolean)
    .join(' · ');
  const precio = auto.precio != null
    ? `<strong>$${Number(auto.precio).toLocaleString('es-AR')}</strong>`
    : '';

  return `
    <a class="perfil-auto-card" href="garage.html#auto-${auto.id}" aria-label="Ver publicación de ${auto.brand ? auto.brand + ' ' : ''}${auto.title} en el Garage">
      <div class="perfil-auto-foto">
        ${fotoMarkup}
      </div>
      <div class="perfil-auto-datos">
        <h3>${auto.brand ? auto.brand + ' ' : ''}${auto.title}</h3>
        ${ficha ? `<span>${ficha}</span>` : ''}
        ${precio}
        ${auto.location ? `<span>${auto.location}</span>` : ''}
      </div>
    </a>
  `;
}

async function cargarAutosPublicados(userId) {
  const { data: autos, error } = await supabaseClient
    .from('garage_posts')
    .select('id, brand, title, anio, es_usado, precio, location, image_data, images')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('No se pudieron cargar los autos publicados:', error);
    return;
  }

  if (!autos?.length) return;

  autosPublicados.classList.remove('perfil-empty');
  autosPublicados.classList.add('perfil-autos-lista');
  autosPublicados.innerHTML = autos.map(tarjetaAutoPublicada).join('');
}

async function iniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const params = new URLSearchParams(window.location.search);
  const perfilUserId = params.get('id') || session?.user?.id;

  if (!perfilUserId) {
    console.log('No se indicó un perfil y no hay sesión iniciada');
    return;
  }

  const esPropio = perfilUserId === session?.user?.id;

  const { data: perfil, error } = await supabaseClient
    .from('public_profiles')
    .select('*')
    .eq('id', perfilUserId)
    .single();

  if (error || !perfil) {
    console.error('No se encontró el perfil:', error);
    return;
  }

  perfilContenido.hidden = false;
  perfilTipo.textContent = perfil.account_type === 'concesionaria' ? 'CONCESIONARIA' : 'PARTICULAR';
  perfilNombre.textContent = perfil.display_name?.trim() || 'Usuario de RPM Rosario';

  cargarPromedio(perfilUserId);
  mostrarDatosPersonales(perfil);

  if (esPropio) {
    logoutBtn.hidden = false;
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
    
    // Configurar carga de foto para el propio perfil
    await configurarCargaFoto(perfilUserId);
  } else if (session) {
    configurarWidgetCalificar(session.user.id, perfilUserId);
  }

  await cargarAutosPublicados(perfilUserId);
}

iniciar();
