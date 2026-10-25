/* ============================================================
   Boids background
   ------------------------------------------------------------
   Classic separation / alignment / cohesion flocking with
   pointer avoidance, edge steering and smooth headings.

   Neighbour lookup uses a uniform spatial grid (95 px cells,
   matching the perception radius) with linked-list buckets.
   Only the 3 × 3 cells around each boid are visited, so the
   simulation never performs the old O(n²) all-pairs scan.

   Resource notes:
   - neighbour/force pass runs every second frame, using cached
     accelerations on the in-between frames
   - each boid is one static Path2D fill (no per-frame path build)
   - DPR is capped at 1.5
   ============================================================= */

(function () {
  'use strict';

  const canvas = document.getElementById('boids');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const PERCEPTION = 95;
  const SEPARATION = 34;
  const CELL = PERCEPTION;
  const MAX_SPEED = 50;
  const MIN_SPEED = 16;
  const FORCE_EVERY = 2;
  const EDGE_MARGIN = 92;
  const POINTER_RADIUS = 145;

  const root = document.documentElement;
  let boids = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let color = '63, 107, 89';
  let paused = root.dataset.motion === 'paused';
  let frameId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let forceTick = 0;
  let resizeTimer = 0;

  let cols = 0;
  let rows = 0;
  let grid = null;
  let next = null;

  const pointer = { x: -9999, y: -9999, active: false };

  // Static unit-size silhouette, reused by every boid. The transform
  // (translate/rotate/scale) is the only per-frame geometry work.
  const FISH = new Path2D();
  FISH.moveTo(6.4, 0);
  FISH.lineTo(-1.8, -2.8);
  FISH.lineTo(-5.2, -3.7);
  FISH.lineTo(-3.5, 0);
  FISH.lineTo(-5.2, 3.7);
  FISH.lineTo(-1.8, 2.8);
  FISH.closePath();

  function readColor() {
    color = getComputedStyle(root).getPropertyValue('--ambient').trim() || '63, 107, 89';
  }

  function countFor(w) {
    if (w < 640) return 26;
    if (w < 1024) return 38;
    return 52;
  }

  function makeBoid(anywhere) {
    const angle = Math.random() * TAU;
    const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    const x = anywhere ? Math.random() * width : 40 + Math.random() * Math.max(1, width - 80);
    const y = anywhere ? Math.random() * height : 40 + Math.random() * Math.max(1, height - 80);

    return {
      x: Math.min(width - 2, Math.max(2, x)),
      y: Math.min(height - 2, Math.max(2, y)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      size: 0.88 + Math.random() * 0.62,
      phase: Math.random() * TAU,
      ax: 0,
      ay: 0
    };
  }

  function fitPopulation() {
    const target = countFor(width);
    while (boids.length < target) boids.push(makeBoid(true));
    if (boids.length > target) boids.length = target;
  }

  function ensureGrid() {
    const nextCols = Math.max(1, Math.ceil(width / CELL) + 1);
    const nextRows = Math.max(1, Math.ceil(height / CELL) + 1);

    if (nextCols !== cols || nextRows !== rows) {
      cols = nextCols;
      rows = nextRows;
      grid = new Int32Array(cols * rows);
    }

    if (!next || next.length !== boids.length) {
      next = new Int32Array(boids.length);
    }
  }

  function buildGrid() {
    ensureGrid();
    grid.fill(-1);

    for (let i = 0; i < boids.length; i += 1) {
      const boid = boids[i];
      const cx = Math.max(0, Math.min(cols - 1, Math.floor(boid.x / CELL)));
      const cy = Math.max(0, Math.min(rows - 1, Math.floor(boid.y / CELL)));
      const key = cy * cols + cx;

      next[i] = grid[key];
      grid[key] = i;
    }
  }

  function update(dt) {
    elapsed += dt;
    forceTick += 1;
    const computeForces = forceTick % FORCE_EVERY === 1;

    if (computeForces) buildGrid();

    for (let i = 0; i < boids.length; i += 1) {
      const boid = boids[i];
      let ax = boid.ax;
      let ay = boid.ay;

      if (computeForces) {
        const cx = Math.max(0, Math.min(cols - 1, Math.floor(boid.x / CELL)));
        const cy = Math.max(0, Math.min(rows - 1, Math.floor(boid.y / CELL)));

        let alignX = 0;
        let alignY = 0;
        let centerX = 0;
        let centerY = 0;
        let separateX = 0;
        let separateY = 0;
        let neighbours = 0;

        for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
          if (gy < 0 || gy >= rows) continue;

          for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
            if (gx < 0 || gx >= cols) continue;

            const key = gy * cols + gx;
            for (let j = grid[key]; j !== -1; j = next[j]) {
              if (j === i) continue;

              const other = boids[j];
              const dx = other.x - boid.x;
              const dy = other.y - boid.y;
              const d2 = dx * dx + dy * dy;

              if (d2 > 0 && d2 < PERCEPTION * PERCEPTION) {
                alignX += other.vx;
                alignY += other.vy;
                centerX += other.x;
                centerY += other.y;
                neighbours += 1;

                if (d2 < SEPARATION * SEPARATION) {
                  const distance = Math.sqrt(d2);
                  separateX -= dx / distance;
                  separateY -= dy / distance;
                }
              }
            }
          }
        }

        ax = 0;
        ay = 0;

        if (neighbours > 0) {
          alignX /= neighbours;
          alignY /= neighbours;
          centerX /= neighbours;
          centerY /= neighbours;

          ax += (alignX - boid.vx) * 1.15;
          ay += (alignY - boid.vy) * 1.15;
          ax += (centerX - boid.x) * 0.36;
          ay += (centerY - boid.y) * 0.36;
        }

        const separateLength = Math.sqrt(separateX * separateX + separateY * separateY);
        if (separateLength > 0) {
          ax += (separateX / separateLength) * 78;
          ay += (separateY / separateLength) * 78;
        }

        if (pointer.active) {
          const dx = boid.x - pointer.x;
          const dy = boid.y - pointer.y;
          const d2 = dx * dx + dy * dy;

          if (d2 > 0 && d2 < POINTER_RADIUS * POINTER_RADIUS) {
            const distance = Math.sqrt(d2);
            const strength = (1 - distance / POINTER_RADIUS) * 95;
            ax += (dx / distance) * strength;
            ay += (dy / distance) * strength;
          }
        }

        if (boid.x < EDGE_MARGIN) ax += (1 - boid.x / EDGE_MARGIN) * 130;
        if (boid.x > width - EDGE_MARGIN) ax -= (1 - (width - boid.x) / EDGE_MARGIN) * 130;
        if (boid.y < EDGE_MARGIN) ay += (1 - boid.y / EDGE_MARGIN) * 130;
        if (boid.y > height - EDGE_MARGIN) ay -= (1 - (height - boid.y) / EDGE_MARGIN) * 130;

        ax += Math.cos(elapsed * 0.85 + boid.phase) * 2.4;
        ay += Math.sin(elapsed * 0.7 + boid.phase * 1.31) * 2.4;

        boid.ax = ax;
        boid.ay = ay;
      }

      boid.vx += ax * dt;
      boid.vy += ay * dt;

      const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy) || 0.0001;
      if (speed > MAX_SPEED) {
        boid.vx = (boid.vx / speed) * MAX_SPEED;
        boid.vy = (boid.vy / speed) * MAX_SPEED;
      } else if (speed < MIN_SPEED) {
        boid.vx = (boid.vx / speed) * MIN_SPEED;
        boid.vy = (boid.vy / speed) * MIN_SPEED;
      }

      boid.x += boid.vx * dt;
      boid.y += boid.vy * dt;

      if (boid.x < 0) {
        boid.x = 0;
        boid.vx = Math.abs(boid.vx);
      } else if (boid.x > width) {
        boid.x = width;
        boid.vx = -Math.abs(boid.vx);
      }

      if (boid.y < 0) {
        boid.y = 0;
        boid.vy = Math.abs(boid.vy);
      } else if (boid.y > height) {
        boid.y = height;
        boid.vy = -Math.abs(boid.vy);
      }

      const targetAngle = Math.atan2(boid.vy, boid.vx);
      let angleDelta = targetAngle - boid.angle;
      while (angleDelta > Math.PI) angleDelta -= TAU;
      while (angleDelta < -Math.PI) angleDelta += TAU;
      boid.angle += angleDelta * Math.min(1, dt * 8);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgb(' + color + ')';

    for (let i = 0; i < boids.length; i += 1) {
      const boid = boids[i];
      const alpha = 0.3 + (i % 4) * 0.026;

      ctx.save();
      ctx.translate(boid.x, boid.y);
      ctx.rotate(boid.angle);
      ctx.scale(boid.size, boid.size);
      ctx.globalAlpha = alpha;
      ctx.fill(FISH);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (paused || document.hidden) {
      frameId = 0;
      return;
    }

    if (!lastTime) lastTime = now;
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    if (dt > 0.05) dt = 0.05;
    if (dt > 0) {
      update(dt);
      draw();
    }

    frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (frameId) return;
    forceTick = 0;
    if (paused || document.hidden) {
      draw();
      return;
    }
    lastTime = 0;
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

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fitPopulation();
    for (let i = 0; i < boids.length; i += 1) {
      const boid = boids[i];
      boid.x = Math.max(2, Math.min(width - 2, boid.x));
      boid.y = Math.max(2, Math.min(height - 2, boid.y));
    }

    cols = 0;
    rows = 0;
    grid = null;
    next = null;
    forceTick = 0;
    draw();
  }

  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
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
})();
