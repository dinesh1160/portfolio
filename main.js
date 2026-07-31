

/* ── Hero: cursor parallax ──────────────────────────────────────── */
(function () {
  const parallax = document.getElementById('hero-parallax');
  if (!parallax) return;

  const STRENGTH = 20; // max px shift in each direction

  // Use requestAnimationFrame for silky smooth updates
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let rafId = null;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    currentX = lerp(currentX, targetX, 0.07);
    currentY = lerp(currentY, targetY, 0.07);
    parallax.style.transform = `translate(${currentX}px, ${currentY}px)`;
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('mousemove', (e) => {
    // Normalize to [-1, 1]
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetX = nx * STRENGTH;
    targetY = ny * STRENGTH;
  });

  // Stop animating when mouse leaves to save CPU
  window.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
  });

  rafId = requestAnimationFrame(tick);
})();


/* ── Nav: hamburger ─────────────────────────────────────────────── */
const hamburger = document.querySelector('.nav__hamburger');
const navLinks = document.querySelector('.nav__links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!isOpen));
    navLinks.classList.toggle('open', !isOpen);
  });

  // Close on link click
  navLinks.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
    });
  });
}

/* ── Nav: active section highlight ──────────────────────────────── */
const sections = document.querySelectorAll('section[id], main > section');
const navAnchors = document.querySelectorAll('.nav__link');

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => {
          a.classList.toggle(
            'active',
            a.getAttribute('href') === `#${entry.target.id}`
          );
        });
      }
    });
  },
  { rootMargin: `-${64}px 0px -60% 0px`, threshold: 0 }
);

document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));

/* ── Skills: expandable categories ──────────────────────────────── */
document.querySelectorAll('.skill-category__toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const body = btn.nextElementSibling;

    btn.setAttribute('aria-expanded', String(!expanded));

    if (expanded) {
      body.hidden = true;
    } else {
      body.hidden = false;
    }
  });
});

/* ── Contact form: basic validation feedback ────────────────────── */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.form__submit');
    const original = btn.textContent;
    btn.textContent = 'TRANSMITTING...';
    btn.disabled = true;

    // Simulate async — replace with real fetch() when backend is ready
    setTimeout(() => {
      btn.textContent = 'MESSAGE_SENT ✓';
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
        contactForm.reset();
      }, 2500);
    }, 1200);
  });
}

/* ── Decorative: live timestamp in footer ───────────────────────── */
const tsEl = document.querySelector('.footer__bottom span:last-child');
if (tsEl) {
  const updateTs = () => {
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').split('.')[0];
    tsEl.textContent = tsEl.textContent.replace(
      /UPTIME: [^\s]+/,
      `UPTIME: ${ts}`
    );
  };
  updateTs();
  setInterval(updateTs, 1000);
}

/* ── Theme Toggle ───────────────────────────────────────────────── */
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });
}

/* ── About: rotating work galleries ───────────────────────────── */
const aboutGalleries = document.querySelectorAll('.about__gallery');

aboutGalleries.forEach((gallery, galleryIndex) => {
  const images = gallery.querySelectorAll('.about__gallery-image');
  const counter = gallery.querySelector('.about__gallery-counter');

  if (!images.length) return;

  let activeIndex = 0;

  const updateGallery = (prevIndex) => {
    images.forEach((img, index) => {
      if (index === activeIndex) {
        img.classList.remove('is-exiting');
        img.classList.add('is-active');
      } else if (index === prevIndex) {
        img.classList.remove('is-active');
        img.classList.add('is-exiting');
      } else {
        // Snap others back to the right without transition
        img.style.transition = 'none';
        img.classList.remove('is-active', 'is-exiting');
        // Force reflow
        void img.offsetWidth;
        img.style.transition = '';
      }
    });

    if (counter) {
      counter.textContent = `${activeIndex + 1} / ${images.length}`;
    }
  };

  // Initial state setup (no slide animation on load)
  images.forEach((img, index) => {
    if (index === activeIndex) {
      img.classList.add('is-active');
    }
  });
  if (counter) counter.textContent = `${activeIndex + 1} / ${images.length}`;

  setInterval(() => {
    const prevIndex = activeIndex;
    activeIndex = (activeIndex + 1) % images.length;
    updateGallery(prevIndex);
  }, 3000);
});

/* ── Hero: Title glitch swap ────────────────────────────────────── */
const heroTitle = document.getElementById('hero-title');
if (heroTitle) {
  const titles = ['Robotics Software Engineer', 'AI Engineer'];
  let titleIndex = 0;

  // The CSS glitch animation is 5s long, glitching between 85% and 100%.
  // We offset the first swap by 4.8s to change text during the heavy visual distortion.
  setTimeout(() => {
    titleIndex = (titleIndex + 1) % titles.length;
    heroTitle.textContent = titles[titleIndex];
    heroTitle.setAttribute('data-text', titles[titleIndex]);

    setInterval(() => {
      titleIndex = (titleIndex + 1) % titles.length;
      heroTitle.textContent = titles[titleIndex];
      heroTitle.setAttribute('data-text', titles[titleIndex]);
    }, 5000);
  }, 4800);
}
