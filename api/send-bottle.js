const FROM_EMAIL = process.env.RESEND_FROM || 'info@thinklanceai.com';
const FROM_NAME = 'Moments Atlas';
const SUBJECT_PREFIX = 'Someone sent you a Coca-Cola memory';

function sanitize(s, max) {
  return String(s || '').replace(/[<>]/g, '').slice(0, max);
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function buildHtml({ recipientName, senderName, memory, personalMessage, city, year, polaroidUrl }) {
  const attribution = [senderName, city, year].filter(Boolean).join(' · ');
  const msgBlock = personalMessage
    ? `<p style="font-style:italic;color:#7a4a3a;border-left:2px solid #c8a070;padding-left:14px;margin:24px 0;font-size:15px;line-height:1.6;">${personalMessage}</p>`
    : '';
  const imgBlock = polaroidUrl
    ? `<div style="text-align:center;margin:28px 0;"><img src="${polaroidUrl}" alt="Your memory, developed" style="max-width:300px;width:80%;border:14px solid #fffcf3;border-bottom-width:54px;box-shadow:0 12px 32px rgba(0,0,0,0.25);transform:rotate(-2deg);"/></div>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f3eb;font-family:Georgia,'Times New Roman',serif;color:#2a1a14;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fffcf3;border-radius:6px;overflow:hidden;">
        <tr><td style="padding:48px 40px 24px;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.4em;text-transform:uppercase;color:#a05030;margin-bottom:24px;">A Moment from the Atlas</div>
          <h1 style="font-size:22px;font-weight:400;font-style:italic;color:#2a1a14;margin:0 0 8px;line-height:1.4;">${recipientName ? `Dear ${recipientName},` : 'Dear friend,'}</h1>
          <p style="font-size:15px;color:#5a3a2a;margin:16px 0 0;line-height:1.6;">Someone wanted you to remember this.</p>
        </td></tr>
        <tr><td style="padding:0 40px;">${imgBlock}</td></tr>
        <tr><td style="padding:0 40px 8px;">
          <blockquote style="font-size:17px;font-style:italic;color:#2a1a14;border-left:3px solid #d4453c;padding-left:18px;margin:0 0 16px;line-height:1.65;">"${memory}"</blockquote>
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9a6a4a;padding-left:21px;">— ${attribution}</div>
        </td></tr>
        <tr><td style="padding:20px 40px 0;">${msgBlock}</td></tr>
        <tr><td style="padding:32px 40px 48px;text-align:center;">
          <p style="font-size:13px;color:#7a4a3a;line-height:1.7;margin:0 0 18px;">A custom Coca-Cola bottle with this memory printed on it could be on its way to you, soon.</p>
          <p style="font-size:11px;color:#a07060;letter-spacing:0.15em;text-transform:uppercase;margin:24px 0 0;">Moments Atlas · A concept for The Coca-Cola Company</p>
          <p style="font-size:10px;color:#b09080;margin:8px 0 0;font-style:italic;">Editorial demo. Not affiliated with The Coca-Cola Company.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const recipientEmail = sanitize(body.recipientEmail, 120).trim();
  const recipientName = sanitize(body.recipientName, 60);
  const senderName = sanitize(body.senderName, 60);
  const memory = sanitize(body.memory, 500);
  const personalMessage = sanitize(body.personalMessage, 400);
  const city = sanitize(body.city, 80);
  const year = sanitize(body.year, 10);
  const polaroidUrl = sanitize(body.polaroidUrl, 2000);

  if (!isValidEmail(recipientEmail)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (memory.length < 5) {
    res.status(400).json({ error: 'memory_too_short' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_resend_key' });
    return;
  }

  const html = buildHtml({
    recipientName, senderName, memory, personalMessage,
    city, year, polaroidUrl,
  });

  const subject = senderName
    ? `${senderName} sent you a Coca-Cola memory`
    : SUBJECT_PREFIX;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: 'resend_error', detail: detail.slice(0, 300) });
      return;
    }

    const data = await r.json();
    res.status(200).json({ ok: true, id: data.id || null });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 200) });
  }
};
