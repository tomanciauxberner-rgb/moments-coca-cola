/* ============================================================
   Moments Atlas — True 3D Parallax (2 layers)
   - Background plate moves subtly
   - Bottle moves stronger => depth illusion
   - GPU compositing, requestAnimationFrame, lerp smoothing
   - Mouse on desktop, DeviceOrientation on mobile (iOS perm-aware)
   - Respects prefers-reduced-motion
   - Self-contained
   ============================================================ */
(function () {
  'use strict';

  if (window.__parallax2LLoaded) return;
  window.__parallax2LLoaded = true;

  var ready = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  ready(function () {
    var bg = document.getElementById('pgBgPlate');
    var bottle = document.getElementById('pgBgBottle');
    if (!bg || !bottle) return;

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var BG_MAX_X = 10;
    var BG_MAX_Y = 8;
    var BG_SCALE = 1.04;

    var BOTTLE_MAX_X = 28;
    var BOTTLE_MAX_Y = 22;
    var BOTTLE_SCALE = 1.08;

    var LERP = 0.08;

    var targetX = 0, targetY = 0;
    var curBgX = 0, curBgY = 0;
    var curBoX = 0, curBoY = 0;
    var rafId = null;
    var active = false;

    bg.style.willChange = 'transform';
    bottle.style.willChange = 'transform';
    bg.style.transformOrigin = 'center center';
    bottle.style.transformOrigin = 'center center';
    bg.style.transition = 'none';
    bottle.style.transition = 'none';
    bg.style.transform = 'translate3d(0,0,0) scale(' + BG_SCALE + ')';
    bottle.style.transform = 'translate3d(0,0,0) scale(' + BOTTLE_SCALE + ')';

    function loop() {
      var tBgX = targetX * (BG_MAX_X / Math.max(BG_MAX_X, BOTTLE_MAX_X));
      var tBgY = targetY * (BG_MAX_Y / Math.max(BG_MAX_Y, BOTTLE_MAX_Y));
      var tBoX = targetX;
      var tBoY = targetY;

      curBgX += (tBgX - curBgX) * LERP;
      curBgY += (tBgY - curBgY) * LERP;
      curBoX += (tBoX - curBoX) * LERP;
      curBoY += (tBoY - curBoY) * LERP;

      bg.style.transform =
        'translate3d(' +
        curBgX.toFixed(2) +
        'px,' +
        curBgY.toFixed(2) +
        'px,0) scale(' +
        BG_SCALE +
        ')';

      bottle.style.transform =
        'translate3d(' +
        curBoX.toFixed(2) +
        'px,' +
        curBoY.toFixed(2) +
        'px,0) scale(' +
        BOTTLE_SCALE +
        ')';

      var done =
        Math.abs(tBoX - curBoX) < 0.05 &&
        Math.abs(tBoY - curBoY) < 0.05 &&
        Math.abs(tBgX - curBgX) < 0.05 &&
        Math.abs(tBgY - curBgY) < 0.05;

      if (done) {
        rafId = null;
        active = false;
      } else {
        rafId = requestAnimationFrame(loop);
      }
    }

    function kick() {
      if (!active) {
        active = true;
        rafId = requestAnimationFrame(loop);
      }
    }

    function onMouseMove(e) {
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      var nx = (e.clientX / w) * 2 - 1;
      var ny = (e.clientY / h) * 2 - 1;
      targetX = -nx * BOTTLE_MAX_X;
      targetY = -ny * BOTTLE_MAX_Y;
      kick();
    }

    function onOrientation(e) {
      var gamma = e.gamma;
      var beta = e.beta;
      if (gamma === null || beta === null) return;
      var nx = Math.max(-1, Math.min(1, gamma / 30));
      var ny = Math.max(-1, Math.min(1, (beta - 45) / 30));
      targetX = -nx * BOTTLE_MAX_X;
      targetY = -ny * BOTTLE_MAX_Y;
      kick();
    }

    var isTouch =
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    if (isTouch && window.DeviceOrientationEvent) {
      var needsPermission =
        typeof DeviceOrientationEvent.requestPermission === 'function';

      var attachGyro = function () {
        window.addEventListener('deviceorientation', onOrientation, {
          passive: true
        });
      };

      if (needsPermission) {
        var askOnce = function () {
          DeviceOrientationEvent.requestPermission()
            .then(function (state) {
              if (state === 'granted') attachGyro();
            })
            .catch(function () {});
          document.removeEventListener('touchend', askOnce);
        };
        document.addEventListener('touchend', askOnce, { once: true });
      } else {
        attachGyro();
      }
    } else {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
        active = false;
      }
    });
  });
})();
