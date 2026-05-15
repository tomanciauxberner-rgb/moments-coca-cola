/* ============================================================
   Moments Atlas — Bottle bubbles v2
   - Canvas positioned ABSOLUTE inside #pg-result (no fixed)
   - Anchored directly above the parallax bottle
   - Subtle, slow, premium
   ============================================================ */
(function () {
  'use strict';

  if (window.__bubblesV2Loaded) return;
  window.__bubblesV2Loaded = true;

  var MAX_BUBBLES = 16;
  var SPAWN_INTERVAL = 550;
  var SPAWN_JITTER = 450;
  var BUBBLE_LIFETIME = 7500;

  /* Where the bottle neck sits, in viewport ratios.
     Tuned from the screenshot: neck around 78% from left, 60% from top. */
  var NECK_X_RATIO = 0.78;
  var NECK_Y_RATIO = 0.60;

  function init() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var pgResult = document.getElementById('pg-result');
    if (!pgResult) return;

    /* Remove any previous canvas from v1 */
    var oldCanvas = document.getElementById('pgBgBubbles');
    if (oldCanvas) oldCanvas.remove();

    var canvas = document.createElement('canvas');
    canvas.id = 'pgBgBubblesV2';
    canvas.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:2',
      'mix-blend-mode:screen',
    ].join(';');

    /* Ensure pg-result is positioned for absolute children */
    var pos = getComputedStyle(pgResult).position;
    if (pos === 'static') {
      pgResult.style.position = 'relative';
    }

    /* Insert before any other content (will be behind text/polaroid via z-index) */
    pgResult.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var rect = pgResult.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    var resizeRaf = null;
    window.addEventListener('resize', function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(function () {
        resize();
        resizeRaf = null;
      });
    }, { passive: true });

    var bubbles = [];
    var lastSpawn = 0;
    var rafId = null;
    var paused = false;

    function getNeckOrigin() {
      var rect = pgResult.getBoundingClientRect();
      return {
        x: rect.width * NECK_X_RATIO,
        y: rect.height * NECK_Y_RATIO,
        width: rect.width,
      };
    }

    function spawn() {
      if (bubbles.length >= MAX_BUBBLES) return;
      var origin = getNeckOrigin();
      var spread = origin.width * 0.025;
      bubbles.push({
        baseX: origin.x + (Math.random() - 0.5) * spread * 2,
        y: origin.y + Math.random() * 8,
        vy: -(0.3 + Math.random() * 0.6),
        r: 2 + Math.random() * 5,
        rGrowth: 0.0015 + Math.random() * 0.0025,
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 0.8,
        amp: 10 + Math.random() * 18,
        opacity: 0.35 + Math.random() * 0.4,
        born: performance.now(),
        wobble: 0,
      });
    }

    function step(now) {
      if (paused) { rafId = null; return; }

      if (now - lastSpawn > SPAWN_INTERVAL + (Math.random() - 0.5) * SPAWN_JITTER) {
        spawn();
        lastSpawn = now;
      }

      var cssW = canvas.width / dpr;
      var cssH = canvas.height / dpr;
      ctx.clearRect(0, 0, cssW, cssH);

      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i];
        var age = now - b.born;
        if (age > BUBBLE_LIFETIME || b.y < -20) {
          bubbles.splice(i, 1);
          continue;
        }

        b.y += b.vy;
        b.vy -= 0.0008;
        b.r += b.rGrowth;
        b.wobble += 0.018 * b.freq;

        var xOffset = Math.sin(b.wobble + b.phase) * b.amp * 0.4;
        var drawX = b.baseX + xOffset;
        var drawY = b.y;

        var fadeIn = Math.min(1, age / 500);
        var fadeOut = age > BUBBLE_LIFETIME * 0.7
          ? Math.max(0, 1 - (age - BUBBLE_LIFETIME * 0.7) / (BUBBLE_LIFETIME * 0.3))
          : 1;
        var topFade = b.y < 60 ? Math.max(0, b.y / 60) : 1;
        var alpha = b.opacity * fadeIn * fadeOut * topFade;

        if (alpha < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;

        var gradient = ctx.createRadialGradient(
          drawX - b.r * 0.3, drawY - b.r * 0.3, 0,
          drawX, drawY, b.r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.5, 'rgba(255, 245, 230, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 220, 200, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(drawX, drawY, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.arc(drawX - b.r * 0.35, drawY - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      rafId = requestAnimationFrame(step);
    }

    function start() {
      if (rafId) return;
      lastSpawn = performance.now();
      rafId = requestAnimationFrame(step);
    }

    function stop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (paused) stop();
      else start();
    });

    start();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
