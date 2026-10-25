/* ============================================================
   Samanth Martis — portfolio behaviour
   Vanilla JS. No build step, no dependencies.
   ============================================================= */

(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const getStored = (key) => {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  };
  const setStored = (key, value) => {
    try { localStorage.setItem(key, value); } catch (err) { /* private mode */ }
  };

  let motionPaused = root.dataset.motion === 'paused';
  let lightboxOpen = false;

  /* ------------------------------------------------------------
     Theme
     ------------------------------------------------------------ */

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;
    if (persist) setStored('theme', theme);

    $$('[data-theme-toggle], [data-theme-toggle-text]').forEach((button) => {
      const next = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    });

    const label = $('[data-theme-label]');
    if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';

    $$('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', theme === 'dark' ? '#0d1210' : '#f1eee6');
    });

    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function toggleTheme() {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
  }

  $$('[data-theme-toggle], [data-theme-toggle-text]').forEach((button) => {
    button.addEventListener('click', toggleTheme);
  });

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemTheme = (event) => {
    if (!getStored('theme')) applyTheme(event.matches ? 'dark' : 'light', false);
  };
  if (systemTheme.addEventListener) systemTheme.addEventListener('change', onSystemTheme);
  else if (systemTheme.addListener) systemTheme.addListener(onSystemTheme);

  applyTheme(root.dataset.theme || 'light', false);

  /* ------------------------------------------------------------
     Ambient videos
     ------------------------------------------------------------ */

  const ambientVideos = $$('video[data-ambient]');
  const videoVisible = new WeakMap();

  function playVideo(video) {
    if (!video || motionPaused || document.hidden || lightboxOpen) return;
    const promise = video.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  function pauseAllVideos() {
    ambientVideos.forEach((video) => video.pause());
  }

  function playVisibleVideos() {
    if (motionPaused || document.hidden || lightboxOpen) return;
    ambientVideos.forEach((video) => {
      if (videoVisible.get(video)) playVideo(video);
    });
  }

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          videoVisible.set(entry.target, entry.isIntersecting);
          if (entry.isIntersecting) playVideo(entry.target);
          else entry.target.pause();
        });
      },
      { threshold: 0.22 }
    );
    ambientVideos.forEach((video) => videoObserver.observe(video));
  } else {
    ambientVideos.forEach((video) => playVideo(video));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAllVideos();
    else playVisibleVideos();
  });

  /* ------------------------------------------------------------
     Motion toggle
     ------------------------------------------------------------ */

  function updateMotionUI() {
    root.dataset.motion = motionPaused ? 'paused' : 'running';
    $$('[data-motion-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(motionPaused));
      const label = $('[data-motion-label]', button);
      if (label) label.textContent = motionPaused ? 'Play motion' : 'Pause motion';
    });
  }

  function setMotion(paused, persist) {
    motionPaused = paused;
    if (persist) setStored('motion', paused ? 'paused' : 'running');
    updateMotionUI();
    if (paused) pauseAllVideos();
    else playVisibleVideos();
    document.dispatchEvent(new CustomEvent('motionchange', { detail: { paused } }));
  }

  $$('[data-motion-toggle]').forEach((button) => {
    button.addEventListener('click', () => setMotion(!motionPaused, true));
  });

  updateMotionUI();

  /* ------------------------------------------------------------
     Header, scroll progress and active nav
     ------------------------------------------------------------ */

  const header = $('[data-header]');
  const navLinks = $$('[data-nav-link]');
  const navSections = navLinks
    .map((link) => {
      const id = link.getAttribute('href');
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  let scrollQueued = false;

  function updateScrollUI() {
    scrollQueued = false;
    const y = window.scrollY || window.pageYOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

    root.style.setProperty('--scroll', progress.toFixed(4));
    if (header) header.classList.toggle('is-scrolled', y > 16);

    const mark = y + window.innerHeight * 0.38;
    let current = '';

    navSections.forEach((section) => {
      if (section.offsetTop <= mark) current = '#' + section.id;
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateScrollUI();

  /* ------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------ */

  const revealElements = $$('.reveal');

  if ('IntersectionObserver' in window && !prefersReduced.matches) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------ */

  const dialog = $('#lightbox');
  const lightboxMedia = $('[data-lightbox-media]');
  const lightboxCaption = $('[data-lightbox-caption]');
  let lastTrigger = null;

  function closeLightbox() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else {
      dialog.removeAttribute('open');
      document.body.classList.remove('is-locked');
      lightboxOpen = false;
      if (lightboxMedia) lightboxMedia.innerHTML = '';
      playVisibleVideos();
      if (lastTrigger) lastTrigger.focus();
    }
  }

  function openLightbox(trigger) {
    if (!dialog || !lightboxMedia) return;

    const type = trigger.dataset.type || 'image';
    const src = trigger.dataset.src;
    const caption = trigger.dataset.caption || '';
    if (!src) return;

    lightboxMedia.innerHTML = '';
    lastTrigger = trigger;

    if (type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('aria-label', caption);
      lightboxMedia.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = caption;
      lightboxMedia.appendChild(img);
    }

    if (lightboxCaption) lightboxCaption.textContent = caption;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    lightboxOpen = true;
    document.body.classList.add('is-locked');
    pauseAllVideos();

    const closeButton = $('[data-lightbox-close]');
    if (closeButton) closeButton.focus();
  }

  $$('[data-lightbox]').forEach((trigger) => {
    trigger.addEventListener('click', () => openLightbox(trigger));
  });

  if (dialog) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeLightbox();
    });

    dialog.addEventListener('close', () => {
      lightboxOpen = false;
      document.body.classList.remove('is-locked');
      if (lightboxMedia) lightboxMedia.innerHTML = '';
      playVisibleVideos();
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    });

    const closeButton = $('[data-lightbox-close]');
    if (closeButton) closeButton.addEventListener('click', closeLightbox);
  }

})();
