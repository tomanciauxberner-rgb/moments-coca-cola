/* ============================================================
   Moments Atlas — Polaroid v4
   - Event delegation on document (no race condition possible)
   - Retry Pollinations up to 3 times with new seed
   - Visibility via state class
   - Download + Send bottle + Atlas note
   ============================================================ */
(function () {
  'use strict';

  var POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
  var NEGATIVE = 'cafe terrace, restaurant interior, bar, modern, stock photo, generic, watermark, text, logo overlay, distorted faces, hands deformed';
  var MAX_RETRIES = 3;
  var IMAGE_TIMEOUT_MS = 22000;

  var currentState = {
    memory: '',
    name: '',
    city: '',
    year: '',
    polaroidImageUrl: null,
    currentPrompt: '',
  };

  function buildPollinationsUrl(prompt, seed) {
    return POLLINATIONS_BASE +
      encodeURIComponent(prompt) +
      '?width=768&height=960' +
      '&nologo=true' +
      '&enhance=false' +
      '&model=flux' +
      '&seed=' + seed +
      '&negative=' + encodeURIComponent(NEGATIVE);
  }

  function $(id) { return document.getElementById(id); }

  function setStatus(text) {
    var st = document.querySelector('#r-polaroid .r-polaroid-status');
    if (st) st.textContent = text;
  }

  function setState(state) {
    var p = $('r-polaroid');
    if (!p) return;
    p.classList.remove('loading', 'ready', 'errored');
    p.classList.add(state);
    var wrap = p.closest('.r-polaroid-wrap');
    if (wrap) {
      wrap.classList.remove('is-loading', 'is-ready', 'is-errored');
      wrap.classList.add('is-' + state);
    }
  }

  function showError(msg) {
    setState('errored');
    setStatus(msg || 'Could not develop this memory.');
  }

  function tryLoadImage(url) {
    return new Promise(function (resolve, reject) {
      var probe = new Image();
      probe.crossOrigin = 'anonymous';
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('timeout'));
      }, IMAGE_TIMEOUT_MS);
      probe.onload = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (probe.naturalWidth < 50) {
          reject(new Error('empty_image'));
        } else {
          resolve(url);
        }
      };
      probe.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('load_error'));
      };
      probe.src = url;
    });
  }

  async function loadWithRetry(prompt) {
    var lastErr = null;
    for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
      var seed = Math.floor(Math.random() * 1000000);
      var url = buildPollinationsUrl(prompt, seed);
      if (attempt > 0) {
        setStatus('The film is taking shape… (try ' + (attempt + 1) + '/' + MAX_RETRIES + ')');
      }
      try {
        var ok = await tryLoadImage(url);
        return ok;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(function (r) { setTimeout(r, 800 + attempt * 600); });
        }
      }
    }
    throw lastErr || new Error('all_attempts_failed');
  }

  async function generatePolaroid(memory, name, city, year) {
    currentState = {
      memory: memory || '',
      name: name || '',
      city: city || '',
      year: year || '',
      polaroidImageUrl: null,
      currentPrompt: '',
    };

    var polaroid = $('r-polaroid');
    if (!polaroid) return;

    setState('loading');

    var img = polaroid.querySelector('.r-polaroid-img');
    var cap = polaroid.querySelector('.r-polaroid-caption');
    if (cap) {
      var parts = [name, city, year].filter(function (x) { return x && x !== 'Toi'; });
      cap.textContent = parts.length ? parts.join(' · ') : 'A moment, developed.';
    }
    if (img) {
      img.removeAttribute('src');
      img.removeAttribute('crossorigin');
    }
    setStatus('Developing your memory…');

    try {
      var resp = await fetch('/api/scene-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState),
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

      currentState.currentPrompt = data.prompt;
      var finalUrl;
      try {
        finalUrl = await loadWithRetry(data.prompt);
      } catch (err) {
        showError('The film never developed.');
        return;
      }

      currentState.polaroidImageUrl = finalUrl;
      if (img) {
        img.crossOrigin = 'anonymous';
        img.src = finalUrl;
        setState('ready');
      }
    } catch (err) {
      showError('Network error.');
    }
  }

  function wrapText(ctx, text, maxWidth) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function buildDownloadCanvas(callback) {
    var img = document.querySelector('#r-polaroid .r-polaroid-img');
    if (!img || !img.src) { callback(null); return; }

    var src = new Image();
    src.crossOrigin = 'anonymous';
    src.onload = function () {
      var W = 900;
      var FRAME = 60;
      var BOTTOM = 220;
      var photoW = W - FRAME * 2;
      var photoH = Math.round((photoW / src.width) * src.height);
      var H = FRAME + photoH + BOTTOM;

      var canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = '#fffcf3';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(src, FRAME, FRAME, photoW, photoH);

      var attribution = [currentState.name, currentState.city, currentState.year]
        .filter(function (x) { return x && x !== 'Toi'; })
        .join(' · ');

      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'italic 26px Georgia, serif';
      ctx.textAlign = 'center';
      var quoteY = FRAME + photoH + 60;
      var quote = currentState.memory.length > 180
        ? currentState.memory.slice(0, 177) + '…'
        : currentState.memory;
      var lines = wrapText(ctx, '"' + quote + '"', W - 120).slice(0, 3);
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], W / 2, quoteY + i * 32);
      }

      if (attribution) {
        ctx.fillStyle = '#7a4a3a';
        ctx.font = '14px Georgia, serif';
        ctx.fillText('— ' + attribution.toUpperCase(), W / 2, quoteY + lines.length * 32 + 32);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.font = '10px Helvetica, sans-serif';
      ctx.fillText('MOMENTS ATLAS', W / 2, H - 24);

      callback(canvas);
    };
    src.onerror = function () { callback(null); };
    src.src = img.src;
  }

  function downloadPolaroid() {
    buildDownloadCanvas(function (canvas) {
      if (!canvas) { alert('Could not prepare the download.'); return; }
      canvas.toBlob(function (blob) {
        if (!blob) { alert('Could not prepare the download.'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var fname = 'moments-atlas';
        if (currentState.name && currentState.name !== 'Toi') fname += '-' + currentState.name.toLowerCase();
        if (currentState.year) fname += '-' + currentState.year;
        a.href = url;
        a.download = fname.replace(/[^a-z0-9\-]/gi, '') + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      }, 'image/png');
    });
  }

  function openSendModal() {
    var modal = $('r-send-modal');
    if (!modal) return;
    var memEl = modal.querySelector('.r-send-memory');
    var atrEl = modal.querySelector('.r-send-attr');
    if (memEl) memEl.textContent = '"' + currentState.memory + '"';
    var attribution = [currentState.name, currentState.city, currentState.year]
      .filter(function (x) { return x && x !== 'Toi'; })
      .join(' · ');
    if (atrEl) atrEl.textContent = attribution ? '— ' + attribution : '';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    var ok = $('r-send-success');
    var form = $('r-send-form');
    if (ok) ok.style.display = 'none';
    if (form) form.style.display = '';

    setTimeout(function () {
      var first = modal.querySelector('input[name="recipientEmail"]');
      if (first) first.focus();
    }, 300);
  }

  function closeSendModal() {
    var modal = $('r-send-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function submitSendForm(form) {
    var fd = new FormData(form);
    var payload = {
      recipientEmail: String(fd.get('recipientEmail') || '').trim(),
      recipientName: String(fd.get('recipientName') || '').trim(),
      senderName: currentState.name && currentState.name !== 'Toi' ? currentState.name : (String(fd.get('senderName') || '').trim()),
      personalMessage: String(fd.get('personalMessage') || '').trim(),
      memory: currentState.memory,
      city: currentState.city,
      year: currentState.year,
      polaroidUrl: currentState.polaroidImageUrl || '',
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    var errEl = form.querySelector('.r-send-error');
    if (errEl) errEl.textContent = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    try {
      var resp = await fetch('/api/send-bottle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await resp.json().catch(function () { return {}; });

      if (!resp.ok) {
        var msg = data.error === 'invalid_email' ? 'Please enter a valid email.' :
                  data.error === 'missing_resend_key' ? 'Email service not configured.' :
                  'Could not send right now.';
        if (errEl) errEl.textContent = msg;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send this bottle'; }
        return;
      }

      form.style.display = 'none';
      var ok = $('r-send-success');
      if (ok) {
        ok.style.display = '';
        var who = payload.recipientName || payload.recipientEmail;
        var lbl = ok.querySelector('.r-send-recipient');
        if (lbl) lbl.textContent = who;
      }
    } catch (err) {
      if (errEl) errEl.textContent = 'Network error.';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send this bottle'; }
    }
  }

  /* ====== Event delegation on document — bulletproof ====== */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('#r-action-download')) {
      e.preventDefault();
      downloadPolaroid();
      return;
    }

    if (t.closest('#r-action-send')) {
      e.preventDefault();
      openSendModal();
      return;
    }

    if (t.closest('#r-send-close') || t.closest('#r-send-close-success')) {
      e.preventDefault();
      closeSendModal();
      return;
    }

    if (t.id === 'r-send-modal') {
      closeSendModal();
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'r-send-form') {
      e.preventDefault();
      submitSendForm(e.target);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = $('r-send-modal');
      if (modal && modal.classList.contains('open')) closeSendModal();
    }
  });

  window.__generatePolaroid = generatePolaroid;
  window.__polaroidV4Loaded = true;
})();
