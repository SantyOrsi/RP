// Navbar compartido por todas las paginas.
(function inicializarNavbar() {
  const paginaInicio = /(?:^|\/)index\.html$/.test(window.location.pathname) || window.location.pathname.endsWith('/');
  const enlaceSeccion = (id) => paginaInicio ? `#${id}` : `index.html#${id}`;

  function crearNavbar() {
    const header = document.createElement('header');
    header.className = 'site-header';
    header.id = 'siteHeader';
    header.innerHTML = `
      <div class="header-inner">
        <a href="${paginaInicio ? '#' : 'index.html'}" class="logo" aria-label="RPM Rosario - Inicio">
          <svg class="logo-mark" viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g>
              <path d="M0 30 L28 27 L0 24" fill="var(--accent)"/>
              <path d="M8 34 L32 30.5 L8 27" fill="var(--accent)" opacity="0.6"/>
              <path d="M16 38 L36 34 L16 30" fill="var(--accent)" opacity="0.35"/>
            </g>
            <text x="34" y="42" class="logo-text-rpm">RPM</text>
          </svg>
          <span class="logo-sub">ROSARIO</span>
        </a>
        <nav class="main-nav" id="mainNav">
          <a href="${enlaceSeccion('garage')}">GARAGE</a>
          <a href="${enlaceSeccion('comunidad')}">COMUNIDAD</a>
          <a href="${enlaceSeccion('eventos')}">EVENTOS</a>
          <a href="https://wa.me/5493417046870?text=Hola,%20quiero%20asesoramiento%20sobre%20mi%20auto%20en%20RPM%20Rosario" target="_blank" rel="noopener">ASESORAMIENTO</a>
          <a href="${enlaceSeccion('magazine')}">MAGAZINE</a>
          <a href="${enlaceSeccion('tienda')}">TIENDA</a>
        </nav>
        <div class="header-actions">
          <a href="auth.html" class="link-plain header-login" id="navLoginLink">INICIAR SESION</a>
          <a href="auth.html" class="btn btn-primary btn-sm" id="navJoinBtn">UNITE A RPM</a>
          <button class="hamburger" id="hamburgerBtn" aria-label="Abrir menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="mobile-drawer" id="mobileDrawer">
        <a href="${enlaceSeccion('garage')}">GARAGE</a>
        <a href="${enlaceSeccion('comunidad')}">COMUNIDAD</a>
        <a href="${enlaceSeccion('eventos')}">EVENTOS</a>
        <a href="https://wa.me/5493417046870?text=Hola,%20quiero%20asesoramiento%20sobre%20mi%20auto%20en%20RPM%20Rosario" target="_blank" rel="noopener">ASESORAMIENTO</a>
        <a href="${enlaceSeccion('magazine')}">MAGAZINE</a>
        <a href="${enlaceSeccion('tienda')}">TIENDA</a>
        <div class="mobile-drawer-actions">
          <a href="auth.html" class="link-plain" id="navLoginLinkMobile">INICIAR SESION</a>
          <a href="auth.html" class="btn btn-primary" id="navJoinBtnMobile">UNITE A RPM</a>
        </div>
      </div>`;
    return header;
  }

  let header = document.getElementById('siteHeader');
  if (!header) {
    document.querySelector('.auth-logo')?.remove();
    header = crearNavbar();
    document.body.prepend(header);
  }

  const hamburger = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('mobileDrawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const abierto = drawer.classList.toggle('is-open');
      hamburger.classList.toggle('is-open', abierto);
      hamburger.setAttribute('aria-expanded', String(abierto));
    });
    drawer.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      drawer.classList.remove('is-open');
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }));
  }

  if (header) {
    const actualizarSombra = () => {
      header.style.boxShadow = window.scrollY > 8 ? '0 8px 24px rgba(0,0,0,.35)' : 'none';
    };
    document.addEventListener('scroll', actualizarSombra, { passive: true });
    actualizarSombra();
  }

  if (typeof supabaseClient === 'undefined') return;
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;

    supabaseClient
      .from('profiles')
      .select('banned_until')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(async ({ data: perfil }) => {
        const baneado = perfil?.banned_until === 'infinity'
          || (perfil?.banned_until && new Date(perfil.banned_until) > new Date());
        if (!baneado) return;
        await supabaseClient.auth.signOut();
        if (!window.location.pathname.endsWith('/auth.html')) {
          window.location.href = 'auth.html?banned=1';
        }
      });

    [document.getElementById('navLoginLink'), document.getElementById('navLoginLinkMobile')].forEach(link => {
      if (!link) return;
      link.textContent = 'MI PERFIL';
      link.href = 'perfil.html';
    });
    [document.getElementById('navJoinBtn'), document.getElementById('navJoinBtnMobile')].forEach(button => {
      if (!button) return;
      button.textContent = 'CERRAR SESION';
      button.href = '#';
      button.addEventListener('click', async event => {
        event.preventDefault();
        await supabaseClient.auth.signOut();
        window.location.reload();
      });
    });
  });
})();
