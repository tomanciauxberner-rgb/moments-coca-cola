/* ============================================================
   Moments Atlas — Bottle fizz
   - Small dense bubbles at bottle neck + inside coca liquid
   - Anchored relative to viewport (parallax bottle is bottom-right)
   - Active only on pg-result
   - Subtle, premium, RAF-driven
   ============================================================ */
(function () {
  'use strict';

  if (window.__bottleFizzLoaded) return;
  window.__bottleFizzLoaded = true;

  /* Tuned positions relative to viewport.
     The parallax bottle visually fills bottom-right.
     Neck exit at about x=78% y=60%
     Liquid body center at about x=80% y=80%  */
  var NECK_X = 0.78;
  var NECK_Y = 0.60;
  var LIQUID_X = 0.80;
  var LIQUID_Y_TOP = 0.65;
  var LIQUID_Y_BOTTOM = 0.92;

  var MAX_BUBBLES = 22;
  var SPAWN_NECK_INTERVAL = 220;
  var SPAWN_LIQUID_INTERVAL = 380;
  var LIFETIME_NECK = 1600;
  var LIFETIME_LIQUID = 2400;

  function init() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var old = document.getElementById('pgBottleFizz');
    if (old) old.remove();

    var canvas = document.createElement('canvas');
    canvas.id = 'pgBottleFizz';
    canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:2',
      'mix-blend-mode:screen',
    ].join(';');
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function sizeCanvas() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();

    var resizeRaf = null;
    window.addEventListener('resize', function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(function () {
        sizeCanvas();
        resizeRaf = null;
      });
    }, { passive: true });

    var bubbles = [];
    var lastNeckSpawn = 0;
    var lastLiquidSpawn = 0;
    var rafId = null;
    var paused = false;

    function isResultActive() {
      var pg = document.getElementById('pg-result');
      return pg && pg.classList.contains('active');
    }

    function spawnNeck() {
      if (bubbles.length >= MAX_BUBBLES) return;
      var w = window.innerWidth, h = window.innerHeight;
      var spread = w * 0.012;
      bubbles.push({
        kind: 'neck',
        baseX: w * NECK_X + (Math.random() - 0.5) * spread * 2,
        y: h * NECK_Y + (Math.random() - 0.5) * 6,
        vy: -(0.5 + Math.random() * 0.8),
        r: 0.8 + Math.random() * 1.6,
        rGrowth: 0.0008 + Math.random() * 0.0015,
        phase: Math.random() * Math.PI * 2,
        freq: 1.2 + Math.random() * 0.8,
        amp: 4 + Math.random() * 8,
        opacity: 0.4 + Math.random() * 0.4,
        born: performance.now(),
        lifetime: LIFETIME_NECK + Math.random() * 400,
        wobble: 0,
      });
    }

    function spawnLiquid() {
      if (bubbles.length >= MAX_BUBBLES) return;
      var w = window.innerWidth, h = window.innerHeight;
      var spread = w * 0.018;
      var startY = h * (LIQUID_Y_TOP + Math.random() * (LIQUID_Y_BOTTOM - LIQUID_Y_TOP));
      bubbles.push({
        kind: 'liquid',
        baseX: w * LIQUID_X + (Math.random() - 0.5) * spread * 2,
        y: startY,
        vy: -(0.25 + Math.random() * 0.35),
        r: 0.6 + Math.random() * 1.2,
        rGrowth: 0.0006 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        freq: 0.8 + Math.random() * 0.6,
        amp: 3 + Math.random() * 5,
        opacity: 0.22 + Math.random() * 0.25,
        born: performance.now(),
        lifetime: LIFETIME_LIQUID + Math.random() * 500,
        wobble: 0,
        ceiling: h * LIQUID_Y_TOP,
      });
    }

    function step(now) {
      if (paused) { rafId = null; return; }

      var active = isResultActive();

      if (active) {
        if (now - lastNeckSpawn > SPAWN_NECK_INTERVAL) {
          spawnNeck();
          lastNeckSpawn = now;
        }
        if (now - lastLiquidSpawn > SPAWN_LIQUID_INTERVAL) {
          spawnLiquid();
          lastLiquidSpawn = now;
        }
      }

      var cssW = window.innerWidth;
      var cssH = window.innerHeight;
      ctx.clearRect(0, 0, cssW, cssH);

      if (!active && bubbles.length === 0) {
        rafId = requestAnimationFrame(step);
        return;
      }

      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i];
        var age = now - b.born;

        if (age > b.lifetime) {
          bubbles.splice(i, 1);
          continue;
        }

        b.y += b.vy;
        b.r += b.rGrowth;
        b.wobble += 0.022 * b.freq;

        // liquid bubbles stop at their ceiling and burst
        if (b.kind === 'liquid' && b.y < b.ceiling) {
          b.lifetime = Math.min(b.lifetime, age + 200);
        }

        var xOffset = Math.sin(b.wobble + b.phase) * b.amp * 0.5;
        var drawX = b.baseX + xOffset;
        var drawY = b.y;

        var fadeIn = Math.min(1, age / 300);
        var fadeOut = age > b.lifetime * 0.7
          ? Math.max(0, 1 - (age - b.lifetime * 0.7) / (b.lifetime * 0.3))
          : 1;
        var alpha = b.opacity * fadeIn * fadeOut;

        if (alpha < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;

        var gradient = ctx.createRadialGradient(
          drawX - b.r * 0.3, drawY - b.r * 0.3, 0,
          drawX, drawY, b.r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.55, 'rgba(255, 240, 220, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 220, 180, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(drawX, drawY, b.r, 0, Math.PI * 2);
        ctx.fill();

        if (b.r > 1.3) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.arc(drawX - b.r * 0.35, drawY - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      rafId = requestAnimationFrame(step);
    }

    function start() {
      if (rafId) return;
      lastNeckSpawn = performance.now();
      lastLiquidSpawn = performance.now();
      rafId = requestAnimationFrame(step);
    }

    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (!paused && !rafId) start();
    });

    start();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
