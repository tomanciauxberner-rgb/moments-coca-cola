/* ============================================================
   Moments Atlas — Bottle fizz v2
   - Shifted right (NECK 0.82, LIQUID 0.84)
   - Bigger, more visible bubbles
   - Denser liquid spawn
   - Normal blend mode (no screen) for stronger visibility
   ============================================================ */
(function () {
  'use strict';

  if (window.__bottleFizzV2Loaded) return;
  window.__bottleFizzV2Loaded = true;

  var NECK_X = 0.82;
  var NECK_Y = 0.60;
  var LIQUID_X = 0.84;
  var LIQUID_Y_TOP = 0.65;
  var LIQUID_Y_BOTTOM = 0.92;

  var MAX_BUBBLES = 28;
  var SPAWN_NECK_INTERVAL = 180;
  var SPAWN_LIQUID_INTERVAL = 220;
  var LIFETIME_NECK = 1800;
  var LIFETIME_LIQUID = 2600;

  function init() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    // Remove previous fizz canvases
    var oldV1 = document.getElementById('pgBottleFizz');
    if (oldV1) oldV1.remove();

    var canvas = document.createElement('canvas');
    canvas.id = 'pgBottleFizzV2';
    canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:3',
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
      var spread = w * 0.014;
      bubbles.push({
        kind: 'neck',
        baseX: w * NECK_X + (Math.random() - 0.5) * spread * 2,
        y: h * NECK_Y + (Math.random() - 0.5) * 8,
        vy: -(0.6 + Math.random() * 0.9),
        r: 1.6 + Math.random() * 2.4,
        rGrowth: 0.0012 + Math.random() * 0.0018,
        phase: Math.random() * Math.PI * 2,
        freq: 1.0 + Math.random() * 0.8,
        amp: 5 + Math.random() * 10,
        opacity: 0.6 + Math.random() * 0.35,
        born: performance.now(),
        lifetime: LIFETIME_NECK + Math.random() * 500,
        wobble: 0,
      });
    }

    function spawnLiquid() {
      if (bubbles.length >= MAX_BUBBLES) return;
      var w = window.innerWidth, h = window.innerHeight;
      var spread = w * 0.022;
      var startY = h * (LIQUID_Y_TOP + Math.random() * (LIQUID_Y_BOTTOM - LIQUID_Y_TOP));
      bubbles.push({
        kind: 'liquid',
        baseX: w * LIQUID_X + (Math.random() - 0.5) * spread * 2,
        y: startY,
        vy: -(0.3 + Math.random() * 0.45),
        r: 1.2 + Math.random() * 2.0,
        rGrowth: 0.001 + Math.random() * 0.0014,
        phase: Math.random() * Math.PI * 2,
        freq: 0.7 + Math.random() * 0.7,
        amp: 4 + Math.random() * 7,
        opacity: 0.45 + Math.random() * 0.3,
        born: performance.now(),
        lifetime: LIFETIME_LIQUID + Math.random() * 600,
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

        if (b.kind === 'liquid' && b.y < b.ceiling) {
          b.lifetime = Math.min(b.lifetime, age + 250);
        }

        var xOffset = Math.sin(b.wobble + b.phase) * b.amp * 0.5;
        var drawX = b.baseX + xOffset;
        var drawY = b.y;

        var fadeIn = Math.min(1, age / 350);
        var fadeOut = age > b.lifetime * 0.75
          ? Math.max(0, 1 - (age - b.lifetime * 0.75) / (b.lifetime * 0.25))
          : 1;
        var alpha = b.opacity * fadeIn * fadeOut;

        if (alpha < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;

        var gradient = ctx.createRadialGradient(
          drawX - b.r * 0.35, drawY - b.r * 0.35, 0,
          drawX, drawY, b.r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.45, 'rgba(255, 248, 235, 0.75)');
        gradient.addColorStop(0.85, 'rgba(255, 220, 180, 0.18)');
        gradient.addColorStop(1, 'rgba(255, 200, 160, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(drawX, drawY, b.r, 0, Math.PI * 2);
        ctx.fill();

        // bright highlight
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.arc(drawX - b.r * 0.4, drawY - b.r * 0.4, b.r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // thin outer ring for visibility
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, b.r, 0, Math.PI * 2);
        ctx.stroke();

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
