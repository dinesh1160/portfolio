/* ── Nav: mobile menu ───────────────────────────────────────────── */
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.getElementById('nav-links');

function setMenu(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navLinks.classList.toggle('is-open', open);
}

navToggle.addEventListener('click', () => {
  setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ── Nav: highlight the section in view ─────────────────────────── */
const sectionLinks = new Map(
  [...document.querySelectorAll('.nav__link')].map(a => [a.getAttribute('href').slice(1), a])
);

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    sectionLinks.forEach((link, id) => link.classList.toggle('is-active', id === entry.target.id));
  });
}, { rootMargin: '-40% 0px -55% 0px' });

document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));

/* ── Theme toggle ───────────────────────────────────────────────── */
const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkQuery.matches);
const announceTheme = () => document.dispatchEvent(new Event('themechange'));

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
  announceTheme();
});
darkQuery.addEventListener('change', announceTheme);

/* ── Hero: simulated 2D lidar mapping ───────────────────────────── */
(function () {
  const canvas = document.getElementById('scan-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // World is the unit square: outer walls plus box obstacles, as [x1, y1, x2, y2] segments.
  const boxes = [
    [0.10, 0.12, 0.24, 0.22], [0.76, 0.12, 0.90, 0.30], [0.10, 0.72, 0.20, 0.90],
    [0.70, 0.80, 0.90, 0.88], [0.46, 0.46, 0.54, 0.54], [0.36, 0.08, 0.40, 0.18],
  ];
  const segments = [
    [0.04, 0.04, 0.96, 0.04], [0.96, 0.04, 0.96, 0.96], [0.96, 0.96, 0.04, 0.96], [0.04, 0.96, 0.04, 0.04],
  ];
  for (const [x1, y1, x2, y2] of boxes) {
    segments.push([x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]);
  }

  const RANGE = 0.55;         // sensor range, world units
  const LIFE = 9000;          // ms a hit stays on the map
  const MAX_HITS = 2600;
  const SWEEP_RATE = 0.0055;  // rad per ms
  const RAY_STEP = 0.018;     // rad between rays
  const ORBIT_R = 0.22;
  const ORBIT_RATE = 0.00012; // rad per ms

  const hits = [];
  let colors = {};
  let size = 0;
  let sweep = 0;
  let last = 0;
  let running = false;

  function readColors() {
    const css = getComputedStyle(root);
    colors = {
      hit: css.getPropertyValue('--text').trim(),
      grid: css.getPropertyValue('--border').trim(),
      accent: css.getPropertyValue('--accent').trim(),
    };
  }

  function cast(ox, oy, angle) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let best = RANGE;
    for (const [x1, y1, x2, y2] of segments) {
      const sx = x2 - x1, sy = y2 - y1;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - ox) * sy - (y1 - oy) * sx) / den;
      const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    return best;
  }

  function robotPose(time) {
    const a = time * ORBIT_RATE;
    return { x: 0.5 + ORBIT_R * Math.cos(a), y: 0.5 + ORBIT_R * Math.sin(a), heading: a + Math.PI / 2 };
  }

  function scan(pose, from, to, time) {
    for (let a = from; a < to; a += RAY_STEP) {
      const r = cast(pose.x, pose.y, a);
      if (r >= RANGE) continue;
      const noisy = r + (Math.random() - 0.5) * 0.006;
      hits.push({ x: pose.x + noisy * Math.cos(a), y: pose.y + noisy * Math.sin(a), t: time });
    }
    while (hits.length && (hits.length > MAX_HITS || time - hits[0].t > LIFE)) hits.shift();
  }

  function draw(pose, time) {
    const pad = size * 0.09;
    const scale = size - pad * 2;
    const px = v => pad + v * scale;

    ctx.clearRect(0, 0, size, size);

    // Grid, 0.1 world units
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const p = Math.round(px(i / 10)) + 0.5;
      ctx.moveTo(p, pad); ctx.lineTo(p, size - pad);
      ctx.moveTo(pad, p); ctx.lineTo(size - pad, p);
    }
    ctx.stroke();

    // Range ring
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(px(pose.x), px(pose.y), RANGE * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sweep wedge
    const wedge = 0.55;
    const grad = ctx.createRadialGradient(px(pose.x), px(pose.y), 0, px(pose.x), px(pose.y), RANGE * scale);
    grad.addColorStop(0, colors.accent);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.moveTo(px(pose.x), px(pose.y));
    ctx.arc(px(pose.x), px(pose.y), RANGE * scale, sweep - wedge, sweep);
    ctx.closePath();
    ctx.fill();

    // Map hits
    const dot = Math.max(1.6, size / 260);
    ctx.fillStyle = colors.hit;
    for (const h of hits) {
      ctx.globalAlpha = Math.max(0, 1 - (time - h.t) / LIFE) * 0.85;
      ctx.fillRect(px(h.x) - dot / 2, px(h.y) - dot / 2, dot, dot);
    }

    // Leading ray
    const r = cast(pose.x, pose.y, sweep);
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px(pose.x), px(pose.y));
    ctx.lineTo(px(pose.x + r * Math.cos(sweep)), px(pose.y + r * Math.sin(sweep)));
    ctx.stroke();

    // Robot
    const body = Math.max(8, size / 40);
    ctx.save();
    ctx.translate(px(pose.x), px(pose.y));
    ctx.rotate(pose.heading);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(-body / 2, -body / 2, body, body);
    ctx.strokeStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(body * 1.4, 0);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(now - last, 50);
    last = now;
    const pose = robotPose(now);
    const next = sweep + dt * SWEEP_RATE;
    scan(pose, sweep, next, now);
    sweep = next % (Math.PI * 2);
    draw(pose, now);
    requestAnimationFrame(frame);
  }

  function drawStatic() {
    // One frame with a few full scans, for reduced motion.
    hits.length = 0;
    const now = performance.now();
    for (let i = 0; i < 5; i++) scan(robotPose(i * 2500), 0, Math.PI * 2, now);
    sweep = -Math.PI / 4;
    draw(robotPose(4 * 2500), now);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduceMotion) drawStatic();
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  readColors();
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('themechange', () => {
    readColors();
    if (reduceMotion) drawStatic();
  });

  // Only animate while the hero is on screen and the tab is visible.
  let onScreen = false;
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen && !document.hidden) start(); else running = false;
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && onScreen) start(); else running = false;
  });
})();

/* ── Projects: play demo videos only while on screen ────────────── */
(function () {
  const videos = document.querySelectorAll('.demo-video');
  if (!videos.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => { /* autoplay blocked; controls remain */ });
      else target.pause();
    });
  }, { threshold: 0.5 });

  videos.forEach(video => videoObserver.observe(video));
})();
