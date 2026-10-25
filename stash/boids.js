/* ============================================================
   ARCHIVED: boids background
   ------------------------------------------------------------
   This was the ambient background before the DLA experiment.
   It is not loaded by index.html.

   To restore:
     1. Add <canvas id="boids" aria-hidden="true"></canvas> to index.html.
     2. Add the rules from stash/boids.css to styles.css.
     3. Paste this function inside the main.js IIFE.
     4. Call initBoids() once near the end of the IIFE.

   Dependencies expected from main.js:
     - `$` query helper
     - `root` (document.documentElement)
     - `motionPaused` state
     - `motionchange` and `themechange` custom events
     - --boid CSS token holding an "r, g, b" string.

   Known issue observed in the live version: the tiny, low-alpha,
   rotated shapes shimmer/flicker. Possible future fixes include
   delta-time integration, softer/larger shapes, a higher DPR cap,
   and replacing the inverse-square separation term with a clamped
   version.
   ============================================================= */

  /* ------------------------------------------------------------
     Boids
     ------------------------------------------------------------ */

  function initBoids() {
    const canvas = $('#boids');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let boids = [];
    let frameId = 0;
    let elapsed = 0;
    let color = '63, 107, 89';
    let paused = motionPaused;
    const pointer = { x: -9999, y: -9999, active: false };

    const perception = 92;
    const separation = 36;
    const maxSpeed = 0.55;
    const minSpeed = 0.16;

    function readColor() {
      color = getComputedStyle(root).getPropertyValue('--boid').trim() || '63, 107, 89';
    }

    function makeBoid() {
      const speed = 0.18 + Math.random() * 0.24;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.82 + Math.random() * 0.68,
        phase: Math.random() * Math.PI * 2
      };
    }

    function populate() {
      const count = width < 640 ? 22 : width < 1024 ? 38 : 52;
      boids = Array.from({ length: count }, makeBoid);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!boids.length) populate();
      else {
        boids.forEach((boid) => {
          boid.x = Math.min(boid.x, width);
          boid.y = Math.min(boid.y, height);
        });
      }
      draw();
    }

    function step() {
      const count = boids.length;

      for (let i = 0; i < count; i += 1) {
        const boid = boids[i];
        let alignX = 0;
        let alignY = 0;
        let centerX = 0;
        let centerY = 0;
        let apartX = 0;
        let apartY = 0;
        let neighbours = 0;

        for (let j = 0; j < count; j += 1) {
          if (i === j) continue;
          const other = boids[j];
          const dx = other.x - boid.x;
          const dy = other.y - boid.y;
          const d2 = dx * dx + dy * dy;

          if (d2 > 0 && d2 < perception * perception) {
            alignX += other.vx;
            alignY += other.vy;
            centerX += other.x;
            centerY += other.y;
            neighbours += 1;

            if (d2 < separation * separation) {
              apartX -= dx / d2;
              apartY -= dy / d2;
            }
          }
        }

        if (neighbours > 0) {
          alignX /= neighbours;
          alignY /= neighbours;
          centerX /= neighbours;
          centerY /= neighbours;

          boid.vx += (alignX - boid.vx) * 0.018;
          boid.vy += (alignY - boid.vy) * 0.018;
          boid.vx += (centerX - boid.x) * 0.00016;
          boid.vy += (centerY - boid.y) * 0.00016;
          boid.vx += apartX * 28;
          boid.vy += apartY * 28;
        }

        if (pointer.active) {
          const dx = boid.x - pointer.x;
          const dy = boid.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          const radius = 150;

          if (d2 > 0 && d2 < radius * radius) {
            const distance = Math.sqrt(d2);
            const force = (1 - distance / radius) * 0.14;
            boid.vx += (dx / distance) * force;
            boid.vy += (dy / distance) * force;
          }
        }

        boid.vx += (Math.random() - 0.5) * 0.004;
        boid.vy += (Math.random() - 0.5) * 0.004;

        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy) || 0.0001;
        if (speed > maxSpeed) {
          boid.vx = (boid.vx / speed) * maxSpeed;
          boid.vy = (boid.vy / speed) * maxSpeed;
        } else if (speed < minSpeed) {
          boid.vx = (boid.vx / speed) * minSpeed;
          boid.vy = (boid.vy / speed) * minSpeed;
        }

        boid.x += boid.vx;
        boid.y += boid.vy;

        if (boid.x < -24) boid.x = width + 24;
        if (boid.x > width + 24) boid.x = -24;
        if (boid.y < -24) boid.y = height + 24;
        if (boid.y > height + 24) boid.y = -24;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      boids.forEach((boid, index) => {
        const alpha = 0.2 + (index % 5) * 0.018;
        const s = boid.size;
        const sway = Math.sin(elapsed * 0.045 + boid.phase) * 0.9 * s;

        ctx.save();
        ctx.translate(boid.x, boid.y);
        ctx.rotate(Math.atan2(boid.vy, boid.vx));
        ctx.fillStyle = 'rgba(' + color + ',' + alpha.toFixed(3) + ')';
        ctx.strokeStyle = 'rgba(' + color + ',' + (alpha * 1.15).toFixed(3) + ')';

        // A small angular fish: triangular body, forked tail and a dorsal fin.
        ctx.beginPath();
        ctx.moveTo(6.4 * s, 0);
        ctx.lineTo(-1.8 * s, -2.8 * s);
        ctx.lineTo(-5.2 * s, -3.7 * s + sway);
        ctx.lineTo(-3.5 * s, 0.15 * sway);
        ctx.lineTo(-5.2 * s, 3.7 * s + sway);
        ctx.lineTo(-1.8 * s, 2.8 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dorsal fin
        ctx.beginPath();
        ctx.moveTo(0.5 * s, -2.35 * s);
        ctx.lineTo(-0.8 * s, -4.15 * s);
        ctx.lineTo(-1.8 * s, -2.7 * s);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + color + ',' + (alpha * 0.72).toFixed(3) + ')';
        ctx.fill();

        ctx.restore();
      });

      elapsed += 1;
    }

    function frame() {
      if (paused || document.hidden) {
        frameId = 0;
        return;
      }
      step();
      draw();
      frameId = window.requestAnimationFrame(frame);
    }

    function start() {
      if (frameId) return;
      if (paused || document.hidden) {
        draw();
        return;
      }
      frameId = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function setPaused(value) {
      paused = value;
      if (paused) stop();
      else start();
    }

    let resizeTimer = 0;
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 160);
      },
      { passive: true }
    );

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch') return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
      },
      { passive: true }
    );

    window.addEventListener('pointerleave', () => {
      pointer.active = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!paused) start();
    });

    document.addEventListener('motionchange', (event) => setPaused(event.detail.paused));

    document.addEventListener('themechange', () => {
      readColor();
      if (paused) draw();
    });

    readColor();
    resize();
    start();
  }
