# Stashed boids

The previous ambient background is archived here, not loaded by the site.

- `boids.js` — the complete `initBoids()` function and its dependencies.
- `boids.css` — the `#boids` canvas styling and the `--boid` colour token.

## Restoring

1. Add this to `index.html`, next to the other background elements:

   ```html
   <canvas id="boids" aria-hidden="true"></canvas>
   ```

2. Copy the rules from `boids.css` into `styles.css`.
3. Paste the function from `boids.js` into the `main.js` IIFE.
4. Call `initBoids()` once near the end of the IIFE.

## Known issue

The live version shimmered because the shapes are tiny, low-alpha,
rotated, filled and stroked with a 0.55 px line at a capped device pixel ratio.
The flocking forces also spike because separation is inverse-square
and multiplied by 28, with a random jitter added every frame.

Things worth trying if it is restored:

- clamp separation and apply it without the 1/d² blow-up
- integrate with delta time instead of one step per frame
- use larger, simpler silhouettes and a higher DPR cap
- remove the per-frame random jitter
- consider a soft trail or offscreen layer instead of redrawing subpixel shapes
