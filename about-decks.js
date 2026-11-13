/* ============================================================
   Study A — cycling image decks
   Small, dependency-free carousel: auto-advance while visible,
   manual controls, pause on hover/focus, reduced-motion aware.
   ============================================================ */

(function () {
  'use strict';

  const roots = Array.from(document.querySelectorAll('[data-deck]'));
  if (!roots.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const supportsHover = window.matchMedia('(hover: hover)').matches;
  const pad = (value) => String(value).padStart(2, '0');
  const decks = [];

  /* ------------------------------------------------------------
     About media warm-up
     ------------------------------------------------------------
     The decks are far down the page. Once the page is idle, fetch
     the stills/posters in the background, three at a time, so the
     first paint of each slide is instant. Video metadata is warmed
     separately; the full MP4 is only fetched for the first clip in
     each deck when the section is close, or on pointer/focus intent.
     ------------------------------------------------------------ */

  const about = document.getElementById('about');
  const videoPreloads = new Map();
  let imagesWarmed = false;
  let videoMetadataWarmed = false;

  function networkAllowsPrefetch() {
    const connection = navigator.connection;
    if (!connection) return true;
    if (connection.saveData) return false;
    return !/(^|-)2g$/.test(connection.effectiveType || '');
  }

  function networkAllowsVideo() {
    const connection = navigator.connection;
    if (!connection) return true;
    if (connection.saveData) return false;
    return !['slow-2g', '2g', '3g'].includes(connection.effectiveType);
  }

  function aboutVideoSources() {
    if (!about) return [];
    return Array.from(new Set(
      Array.from(about.querySelectorAll('[data-deck-slide][data-type="video"]'))
        .map((slide) => slide.dataset.src)
        .filter(Boolean)
    ));
  }

  function warmAboutImages() {
    if (!about || imagesWarmed || !networkAllowsPrefetch()) return;
    imagesWarmed = true;

    const sources = Array.from(new Set(
      Array.from(about.querySelectorAll('[data-deck-slide] img'))
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean)
    ));

    let cursor = 0;
    let active = 0;
    const next = () => {
      while (active < 3 && cursor < sources.length) {
        const src = sources[cursor];
        cursor += 1;
        active += 1;

        const image = new Image();
        image.decoding = 'async';
        image.onload = image.onerror = () => {
          active -= 1;
          next();
        };
        image.src = src;
      }
    };
    next();
  }

  function warmAboutVideoMetadata() {
    if (!about || videoMetadataWarmed || !networkAllowsPrefetch()) return;
    videoMetadataWarmed = true;

    const sources = aboutVideoSources();
    let cursor = 0;
    const next = () => {
      const src = sources[cursor];
      cursor += 1;
      if (!src) return;

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      video.src = src;
      video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';

      let finished = false;
      let timer = 0;
      const done = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        video.remove();
        next();
      };

      timer = window.setTimeout(done, 8000);
      video.addEventListener('loadedmetadata', done, { once: true });
      video.addEventListener('error', done, { once: true });
      document.body.appendChild(video);
      video.load();
    };
    next();
  }

  function preloadAboutVideo(src) {
    if (!src || !networkAllowsVideo() || videoPreloads.has(src)) return;

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    video.src = src;
    video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;';

    let timer = 0;
    const cleanup = () => {
      window.clearTimeout(timer);
      video.remove();
      videoPreloads.delete(src);
    };

    timer = window.setTimeout(cleanup, 30000);
    video.addEventListener('canplaythrough', cleanup, { once: true });
    video.addEventListener('error', cleanup, { once: true });
    videoPreloads.set(src, video);
    document.body.appendChild(video);
    video.load();
  }

  function warmFirstDeckVideos() {
    if (!about || !networkAllowsVideo()) return;
    const seen = new Set();
    about.querySelectorAll('[data-deck]').forEach((deck) => {
      const slide = deck.querySelector('[data-deck-slide][data-type="video"]');
      const src = slide && slide.dataset.src;
      if (src && !seen.has(src)) {
        seen.add(src);
        preloadAboutVideo(src);
      }
    });
  }

  function warmOnIntent() {
    if (!about) return;
    about.querySelectorAll('[data-deck-slide][data-type="video"]').forEach((slide) => {
      const src = slide.dataset.src;
      if (!src) return;
      const warm = () => preloadAboutVideo(src);
      slide.addEventListener('pointerenter', warm, { once: true, passive: true });
      slide.addEventListener('focus', warm, { once: true });
      slide.addEventListener('touchstart', warm, { once: true, passive: true });
    });
  }

  function scheduleAboutWarmup() {
    if (!about) return;
    const run = () => {
      warmAboutImages();
      window.setTimeout(warmAboutVideoMetadata, 600);
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });

    if ('IntersectionObserver' in window) {
      const warmObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          warmAboutImages();
          warmAboutVideoMetadata();
          warmObserver.disconnect();
        },
        { rootMargin: '1200px 0px' }
      );
      warmObserver.observe(about);

      const videoObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          warmFirstDeckVideos();
          videoObserver.disconnect();
        },
        { rootMargin: '400px 0px' }
      );
      videoObserver.observe(about);
    } else {
      warmFirstDeckVideos();
    }
  }

  function createDeck(root, order) {
    const slides = Array.from(root.querySelectorAll('[data-deck-slide]'));
    if (!slides.length) return null;

    const label = root.dataset.deckLabel || 'this deck';
    const interval = Math.max(2800, Number(root.dataset.deckInterval) || 5200);
    const currentEl = root.querySelector('[data-deck-current]');
    const totalEl = root.querySelector('[data-deck-total]');
    const captionEl = root.querySelector('[data-deck-caption]');
    const progressEl = root.querySelector('[data-deck-progress]');
    const prevButton = root.querySelector('[data-deck-prev]');
    const nextButton = root.querySelector('[data-deck-next]');
    const toggleButton = root.querySelector('[data-deck-toggle]');

    let index = 0;
    let timer = null;
    let visible = false;
    let hovered = false;
    let focused = false;
    let userPaused = false;
    let preloaded = false;

    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function preload() {
      if (preloaded) return;
      preloaded = true;
      slides.forEach((slide) => {
        const image = slide.querySelector('img');
        if (image) image.loading = 'eager';
      });
    }

    function canAutoAdvance() {
      return (
        slides.length > 1 &&
        !userPaused &&
        !hovered &&
        (!supportsHover || !focused) &&
        visible &&
        !document.hidden &&
        !document.body.classList.contains('is-locked') &&
        !reducedMotion.matches &&
        document.documentElement.dataset.motion !== 'paused'
      );
    }

    function render() {
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        if (active) slide.removeAttribute('tabindex');
        else slide.setAttribute('tabindex', '-1');
        if (active && visible && slide.dataset.type === 'video') {
          preloadAboutVideo(slide.dataset.src);
        }
      });

      if (currentEl) currentEl.textContent = pad(index + 1);
      if (totalEl) totalEl.textContent = pad(slides.length);
      if (captionEl) captionEl.textContent = slides[index].dataset.caption || '';
      if (progressEl) {
        progressEl.style.width = (((index + 1) / slides.length) * 100).toFixed(2) + '%';
      }
    }

    function schedule(delay) {
      clearTimer();
      if (!canAutoAdvance()) return;

      timer = window.setTimeout(() => {
        timer = null;
        if (!canAutoAdvance()) {
          schedule();
          return;
        }
        step(1);
      }, typeof delay === 'number' ? delay : interval);
    }

    function step(delta) {
      index = (index + delta + slides.length) % slides.length;
      render();
      preload();
      schedule(interval);
    }

    function setPaused(paused) {
      userPaused = paused;
      if (toggleButton) {
        toggleButton.setAttribute('aria-pressed', String(paused));
        toggleButton.setAttribute(
          'aria-label',
          (paused ? 'Play' : 'Pause') + ' automatic image changes in ' + label
        );
      }
      if (paused) clearTimer();
      else {
        focused = false;
        schedule(interval);
      }
    }

    if (slides.length <= 1) {
      root.classList.add('is-single');
    } else {
      if (prevButton) prevButton.addEventListener('click', () => step(-1));
      if (nextButton) nextButton.addEventListener('click', () => step(1));
    }

    if (toggleButton) {
      toggleButton.addEventListener('click', () => setPaused(!userPaused));
    }

    if (supportsHover) {
      root.addEventListener('pointerenter', () => {
        hovered = true;
        clearTimer();
      });

      root.addEventListener('pointerleave', () => {
        hovered = false;
        schedule(interval);
      });
    }

    root.addEventListener('focusin', () => {
      focused = true;
      clearTimer();
    });

    root.addEventListener('focusout', (event) => {
      if (!root.contains(event.relatedTarget)) {
        focused = false;
        schedule(interval);
      }
    });

    root.addEventListener('keydown', (event) => {
      if (slides.length <= 1) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible = entry.isIntersecting;
            if (visible) {
              preload();
              render();
              schedule(900 + (order % 4) * 420);
            } else {
              clearTimer();
            }
          });
        },
        { threshold: 0.22, rootMargin: '300px 0px' }
      );
      observer.observe(root);
    } else {
      visible = true;
      preload();
      schedule(900 + (order % 4) * 420);
    }

    render();

    return {
      clear: clearTimer,
      schedule: () => schedule(interval)
    };
  }

  warmOnIntent();
  scheduleAboutWarmup();

  roots.forEach((root, index) => {
    const deck = createDeck(root, index);
    if (deck) decks.push(deck);
  });

  document.addEventListener('visibilitychange', () => {
    decks.forEach((deck) => {
      if (document.hidden) deck.clear();
      else deck.schedule();
    });
  });

  document.addEventListener('motionchange', () => {
    const paused = document.documentElement.dataset.motion === 'paused';
    decks.forEach((deck) => {
      if (paused) deck.clear();
      else deck.schedule();
    });
  });

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', () => {
      decks.forEach((deck) => {
        if (reducedMotion.matches) deck.clear();
        else deck.schedule();
      });
    });
  }

  const dialog = document.getElementById('lightbox');
  if (dialog) {
    const syncWithDialog = () => {
      if (dialog.open) decks.forEach((deck) => deck.clear());
      else decks.forEach((deck) => deck.schedule());
    };

    if ('MutationObserver' in window) {
      new MutationObserver(syncWithDialog).observe(dialog, {
        attributes: true,
        attributeFilter: ['open']
      });
    }

    dialog.addEventListener('close', syncWithDialog);
  }
})();
