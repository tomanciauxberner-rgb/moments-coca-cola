const SYSTEM_PROMPT = `You are a cinematographer and prompt engineer for an editorial AI image generator.
Given a personal memory tied to a Coca-Cola moment, you produce a SINGLE image generation prompt in English.

Rules:
- The image must feel like a real photograph, not an illustration.
- Style: 35mm film, soft grain, photoreal, cinematic composition.
- Always include the era's visual codes (clothing, light quality, ambient details) from the year given.
- Always include the city or region as a subtle background cue.
- The Coca-Cola bottle, can or glass MUST be visually present but never the main subject. It must be a quiet detail.
- No text, no logos overlay, no captions. The bottle's iconic shape is enough.
- No people's faces shown clearly. Use silhouettes, back views, hands, or out-of-focus framing to preserve emotional ambiguity.
- One concise prompt, maximum 350 characters, no quotes, no markdown.

Return ONLY the prompt string, nothing else.`;

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

  const memory = String(body.memory || '').slice(0, 500).replace(/[<>]/g, '');
  const name = String(body.name || '').slice(0, 60).replace(/[<>]/g, '');
  const city = String(body.city || '').slice(0, 80).replace(/[<>]/g, '');
  const year = String(body.year || '').slice(0, 10).replace(/[<>]/g, '');

  if (memory.length < 5) {
    res.status(400).json({ error: 'memory_too_short' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_api_key' });
    return;
  }

  const userContent = JSON.stringify({ memory, name, city, year });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: 'anthropic_error', detail: err.slice(0, 200) });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).find(b => b.type === 'text');
    const prompt = (text && text.text ? text.text : '').trim().replace(/^"+|"+$/g, '').slice(0, 400);

    if (!prompt) {
      res.status(502).json({ error: 'empty_prompt' });
      return;
    }

    res.status(200).json({ prompt });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 200) });
  }
};
