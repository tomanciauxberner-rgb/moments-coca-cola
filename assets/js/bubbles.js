/* ============================================================
   Moments Atlas — Bottle bubbles
   - Canvas particles rising from the bottle neck
   - Subtle, slow, premium
   - GPU-friendly, RAF-driven
   - Respects prefers-reduced-motion, pauses when tab hidden
   ============================================================ */
(function () {
  'use strict';

  if (window.__bubblesLoaded) return;
  window.__bubblesLoaded = true;

  var MAX_BUBBLES = 14;
  var SPAWN_INTERVAL = 600;
  var SPAWN_JITTER = 500;
  var BUBBLE_LIFETIME = 8000;

  function init() {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var pgResult = document.getElementById('pg-result');
    var bottle = document.getElementById('pgBgBottle');
    if (!pgResult || !bottle) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'pgBgBubbles';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1200ms ease 800ms';

    var firstChild = pgResult.firstChild;
    pgResult.insertBefore(canvas, firstChild);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var bubbles = [];
    var lastSpawn = 0;
    var rafId = null;
    var paused = false;

    function getNeckOrigin() {
      var rect = bottle.getBoundingClientRect();
      // Bottle neck is roughly at top 8% and center-x of the bottle image
      var x = rect.left + rect.width * 0.52;
      var y = rect.top + rect.height * 0.05;
      return { x: x, y: y, width: rect.width };
    }

    function spawn() {
      if (bubbles.length >= MAX_BUBBLES) return;
      var origin = getNeckOrigin();
      var spread = origin.width * 0.04;
      bubbles.push({
        x: origin.x + (Math.random() - 0.5) * spread * 2,
        y: origin.y + Math.random() * 10,
        baseX: origin.x + (Math.random() - 0.5) * spread * 2,
        vy: -(0.25 + Math.random() * 0.5),
        r: 2 + Math.random() * 5,
        rGrowth: 0.0015 + Math.random() * 0.0025,
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 0.8,
        amp: 8 + Math.random() * 18,
        opacity: 0.25 + Math.random() * 0.35,
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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        b.wobble += 0.016 * b.freq;

        var xOffset = Math.sin(b.wobble + b.phase) * b.amp * 0.4;
        var drawX = b.baseX + xOffset;
        var drawY = b.y;

        var fadeIn = Math.min(1, age / 600);
        var fadeOut = age > BUBBLE_LIFETIME * 0.7
          ? Math.max(0, 1 - (age - BUBBLE_LIFETIME * 0.7) / (BUBBLE_LIFETIME * 0.3))
          : 1;
        var topFade = b.y < 80 ? Math.max(0, b.y / 80) : 1;
        var alpha = b.opacity * fadeIn * fadeOut * topFade;

        if (alpha < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;

        var gradient = ctx.createRadialGradient(
          drawX - b.r * 0.3, drawY - b.r * 0.3, 0,
          drawX, drawY, b.r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        gradient.addColorStop(0.5, 'rgba(255, 245, 230, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 220, 200, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(drawX, drawY, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.arc(drawX - b.r * 0.35, drawY - b.r * 0.35, b.r * 0.22, 0, Math.PI * 2);
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

    function onResultActive() {
      var pg = document.getElementById('pg-result');
      if (pg && pg.classList.contains('active')) {
        canvas.style.opacity = '1';
        if (!rafId) start();
      } else {
        canvas.style.opacity = '0';
        // keep running anyway, cheap
      }
    }

    var mo = new MutationObserver(onResultActive);
    mo.observe(pgResult, { attributes: true, attributeFilter: ['class'] });
    onResultActive();

    setTimeout(function () {
      if (!rafId && !paused) start();
    }, 1500);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
