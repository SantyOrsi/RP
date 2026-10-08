// public/js/animations.js
// Animaciones de RPM Rosario:
//   1. Revelado al hacer scroll ([data-reveal] y [data-reveal-group]), también
//      para el contenido que llega después desde Supabase (garage, foro, magazine).
//   2. Header con sombra al scrollear + barra de progreso de lectura.
//   3. Parallax suave de la foto del hero.
//   4. Link del menú resaltado según la sección que se está viendo.
//   5. Luz que sigue al mouse en las tarjetas de "Mucho más que autos".
//
// Si algo falla, se le quita la clase "js" al <html> y el sitio queda sin
// animaciones pero completamente visible.

(function () {
  'use strict';

  window.__rpmAnim = true; // index.html lo chequea: si no llegó acá, quita la clase "js"
  var root = document.documentElement;

  try {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover)').matches;
    var hasIO = 'IntersectionObserver' in window;
    var forEach = Array.prototype.forEach;

    // ----- 1. Revelado al hacer scroll -----
    var seen = new WeakSet();

    // Demora base opcional: data-reveal-delay="2" = 2 pasos de 90 ms.
    function demoraBase(el) {
      var n = Number(el.getAttribute('data-reveal-delay'));
      return isNaN(n) ? 0 : n;
    }

    function mostrar(el, pasos) {
      el.style.setProperty('--d', (pasos * 90) + 'ms');
      el.classList.add('is-visible');
    }

    var revealObserver = (hasIO && !reduced)
      ? new IntersectionObserver(function (entries) {
          // Lo que ya quedó por encima de la pantalla (por ejemplo si entran
          // directo a un #ancla más abajo) se muestra sin demora.
          var enPantalla = [];
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              enPantalla.push(entry.target);
            } else if (entry.boundingClientRect.top < 0) {
              mostrar(entry.target, 0);
              revealObserver.unobserve(entry.target);
            }
          });

          // Los que entran juntos se escalonan 90 ms entre sí (máx. 5 pasos).
          // Uno que entra solo (ej. una card del carrusel) aparece sin esperar.
          enPantalla.sort(function (a, b) {
            return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
          });
          enPantalla.forEach(function (el, i) {
            mostrar(el, demoraBase(el) + Math.min(i, 5));
            revealObserver.unobserve(el);
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
      : null;

    function registrar(el) {
      if (seen.has(el)) return;
      seen.add(el);
      if (revealObserver) revealObserver.observe(el);
      else mostrar(el, 0);
    }

    function registrarGrupo(grupo) {
      forEach.call(grupo.children, registrar);

      // Los hijos que se agregan después (cards del garage, filas del foro,
      // notas del magazine) también se animan.
      new MutationObserver(function (mutaciones) {
        mutaciones.forEach(function (mutacion) {
          forEach.call(mutacion.addedNodes, function (nodo) {
            if (nodo.nodeType === 1) registrar(nodo);
          });
        });
      }).observe(grupo, { childList: true });
    }

    forEach.call(document.querySelectorAll('[data-reveal]'), registrar);
    forEach.call(document.querySelectorAll('[data-reveal-group]'), registrarGrupo);

    // ----- 2 y 3. Header, barra de progreso y parallax -----
    var header = document.getElementById('siteHeader');
    var barra = document.getElementById('scrollProgress');
    var hero = document.querySelector('.hero');
    var heroBg = document.querySelector('.hero-bg');
    var pendiente = false;

    function actualizarScroll() {
      pendiente = false;
      var y = window.pageYOffset || root.scrollTop || 0;

      if (header) header.classList.toggle('is-scrolled', y > 24);

      if (barra) {
        var max = root.scrollHeight - window.innerHeight;
        barra.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
      }

      if (heroBg && hero && !reduced && y < hero.offsetHeight * 1.1) {
        var tope = hero.offsetHeight * 0.12;
        heroBg.style.setProperty('--py', Math.min(y * 0.25, tope).toFixed(1) + 'px');
      }
    }

    function alScrollear() {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(actualizarScroll);
    }

    window.addEventListener('scroll', alScrollear, { passive: true });
    window.addEventListener('resize', alScrollear);
    actualizarScroll();

    // ----- 4. Menú: resaltar la sección que se está viendo -----
    var enlaces = document.querySelectorAll('.main-nav a[href^="#"]');
    var seccionActual = null;

    function marcarActivo(id) {
      seccionActual = id;
      forEach.call(enlaces, function (a) {
        a.classList.toggle('is-active', !!id && a.getAttribute('href') === '#' + id);
      });
    }

    if (hasIO && enlaces.length) {
      var espia = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) marcarActivo(entry.target.id);
          else if (seccionActual === entry.target.id) marcarActivo(null);
        });
      }, { rootMargin: '-45% 0px -50% 0px' });

      ['garage', 'comunidad', 'magazine'].forEach(function (id) {
        var seccion = document.getElementById(id);
        if (seccion) espia.observe(seccion);
      });
    }

    // ----- 5. Luz que sigue al mouse en las tarjetas de features -----
    if (canHover && !reduced) {
      forEach.call(document.querySelectorAll('.feature-card'), function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });
      });
    }
  } catch (error) {
    // Cualquier error: se desactivan las animaciones y se muestra todo.
    root.classList.remove('js');
    if (window.console) console.warn('[animations] desactivadas por un error:', error);
  }
})();
