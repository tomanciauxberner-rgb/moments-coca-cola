/* ============================================================
   Moments Atlas — Polaroid generator
   - Builds a cinematic prompt via /api/scene-prompt (Claude)
   - Fetches the image from Pollinations.ai (free, no key)
   - Displays as a tilted polaroid with shimmer loader
   ============================================================ */
(function () {
  'use strict';

  if (window.__polaroidLoaded) return;
  window.__polaroidLoaded = true;

  var POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
  var POLLINATIONS_PARAMS = '?width=768&height=960&nologo=true&enhance=true&model=flux';

  function buildPollinationsUrl(prompt) {
    var seed = Math.floor(Math.random() * 1000000);
    return (
      POLLINATIONS_BASE +
      encodeURIComponent(prompt) +
      POLLINATIONS_PARAMS +
      '&seed=' +
      seed
    );
  }

  function getPolaroid() {
    return document.getElementById('r-polaroid');
  }

  function setState(state) {
    var section = document.querySelector('.r-section-polaroid');
    if (!section) return;
    section.setAttribute('data-state', state);
  }

  function showError(msg) {
    var p = getPolaroid();
    if (!p) return;
    p.classList.add('errored');
    var cap = p.querySelector('.r-polaroid-caption');
    if (cap) cap.textContent = msg || 'Could not develop this memory.';
    setState('error');
  }

  async function generatePolaroid(memory, name, city, year) {
    var polaroid = getPolaroid();
    if (!polaroid) return;

    polaroid.classList.remove('ready', 'errored');
    polaroid.classList.add('loading');
    setState('loading');

    var img = polaroid.querySelector('.r-polaroid-img');
    var cap = polaroid.querySelector('.r-polaroid-caption');
    if (cap) {
      var parts = [name, city, year].filter(function (x) { return x && x !== 'Toi'; });
      cap.textContent = parts.length ? parts.join(' · ') : 'A moment, developed.';
    }
    if (img) img.removeAttribute('src');

    try {
      var resp = await fetch('/api/scene-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: memory, name: name, city: city, year: year }),
      });

      if (!resp.ok) {
        showError('We couldn’t develop this memory right now.');
        return;
      }

      var data = await resp.json();
      if (!data || !data.prompt) {
        showError('Empty prompt.');
        return;
      }

      var url = buildPollinationsUrl(data.prompt);

      var probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = function () {
        if (img) {
          img.src = url;
          polaroid.classList.remove('loading');
          polaroid.classList.add('ready');
          setState('ready');
        }
      };
      probe.onerror = function () {
        showError('The film never developed.');
      };
      probe.src = url;
    } catch (err) {
      showError('Network error.');
    }
  }

  window.__generatePolaroid = generatePolaroid;
})();
