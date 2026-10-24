// public/js/tienda.js
// Tacómetro de la sección Tienda: dibuja el dial (marcas, números, zona roja)
// y mueve la aguja con física de resorte (inercia + rebote), como una aguja real.
// Escala 0–8 (x1000 r/min), barrido de 270°: 0 abajo a la izquierda, 8 abajo a la derecha.

(function () {
  const svg = document.getElementById('tachoSvg');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const CX = 100, CY = 100;
  const MAX = 8;            // x1000 rpm
  const RED_FROM = 6.5;     // inicio de la zona roja
  const START = -135, SWEEP = 270;

  const angleFor = (v) => START + (v / MAX) * SWEEP;                 // grados desde "arriba"
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
  };
  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  };

  // ----- Marcas y números -----
  const ticks = document.getElementById('tachoTicks');
  const nums = document.getElementById('tachoNums');
  ticks.innerHTML = '';   // el HTML ya trae un dial de respaldo; lo regeneramos acá
  nums.innerHTML = '';

  for (let i = 0; i <= MAX * 4; i++) {            // una marca cada 250 rpm
    const v = i / 4;
    const major = i % 4 === 0;
    const deg = angleFor(v);
    const [x1, y1] = pt(82, deg);
    const [x2, y2] = pt(major ? 72 : 77.5, deg);
    const cls = 'tacho-tick ' + (major ? 'tacho-tick--major' : 'tacho-tick--minor') + (v >= RED_FROM ? ' tacho-tick--red' : '');
    ticks.appendChild(el('line', { x1, y1, x2, y2, class: cls }));

    if (major) {
      const [tx, ty] = pt(60, deg);
      const t = el('text', { x: tx, y: ty, class: 'tacho-num' + (v >= RED_FROM ? ' tacho-num--red' : '') });
      t.textContent = String(v);
      nums.appendChild(t);
    }
  }

  // Arco de la zona roja
  const [rx1, ry1] = pt(85, angleFor(RED_FROM));
  const [rx2, ry2] = pt(85, angleFor(MAX));
  document.getElementById('tachoRed')
    .setAttribute('d', `M${rx1.toFixed(2)} ${ry1.toFixed(2)} A85 85 0 0 1 ${rx2.toFixed(2)} ${ry2.toFixed(2)}`);

  // ----- Aguja con física de resorte -----
  const needle = document.getElementById('tachoNeedle');
  const readout = document.getElementById('tachoReadout');

  let pos = 0, vel = 0, target = 0;
  let last = 0, raf = 0, timer = 0, running = false;

  const K = 70;   // rigidez del resorte
  const C = 9.5;  // amortiguación (algo bajo => rebota un poquito, como una aguja real)

  function render() {
    needle.setAttribute('transform', `rotate(${angleFor(Math.max(0, pos)).toFixed(2)} ${CX} ${CY})`);
    const rpm = Math.max(0, Math.round((pos * 1000) / 50) * 50);
    readout.textContent = String(rpm);
    svg.classList.toggle('is-redline', pos >= RED_FROM);
  }

  function frame(t) {
    const dt = Math.min(0.04, (t - last) / 1000 || 0.016);
    last = t;
    const acc = K * (target - pos) - C * vel;
    vel += acc * dt;
    pos += vel * dt;
    if (pos < 0) { pos = 0; vel = Math.abs(vel) * 0.25; }   // tope del ralentí
    render();
    raf = requestAnimationFrame(frame);
  }

  // Secuencia: ralentí → acelerón corto → sube hasta el corte (rebota en la zona roja) → baja a ralentí
  const sequence = [
    [0.95, 1300],
    [0.85, 350], [1.05, 350],
    [4.6, 650],
    [1.4, 700],
    [7.2, 900],
    [6.7, 130], [7.3, 130], [6.8, 130], [7.3, 130], [6.9, 130], [7.25, 150],
    [1.1, 1400],
  ];
  let step = 0;

  function next() {
    const [t, hold] = sequence[step];
    target = t;
    step = (step + 1) % sequence.length;
    timer = setTimeout(next, hold);
  }

  function start() {
    if (running) return;
    running = true;
    svg.classList.add('is-live');   // apaga la animación CSS de respaldo
    last = performance.now();
    raf = requestAnimationFrame(frame);
    next();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
  }

  // Sin animaciones (ajuste del sistema operativo): dejamos la aguja quieta en un valor "real"
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pos = 3.2; render();
    console.info('[tienda] Tacómetro quieto: tu sistema tiene activado "reducir animaciones".');
    return;
  }

  render();

  // Solo corre mientras la sección está en pantalla (ahorra batería y CPU).
  // Si el observer no avisa nunca (algunos navegadores/layouts), arrancamos igual a los 1.5 s.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach(e => (e.isIntersecting ? start() : stop()));
    }, { threshold: 0.05 }).observe(svg);
    setTimeout(() => { if (!running) { const r = svg.getBoundingClientRect(); if (r.bottom > 0 && r.top < window.innerHeight) start(); } }, 1500);
  } else {
    start();
  }
  console.info('[tienda] Tacómetro cargado.');
})();
