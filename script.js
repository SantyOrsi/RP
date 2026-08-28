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

// ===== Newsletter form (demo submit) =====
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
