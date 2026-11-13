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
              schedule(900 + (order % 4) * 420);
            } else {
              clearTimer();
            }
          });
        },
        { threshold: 0.22 }
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
