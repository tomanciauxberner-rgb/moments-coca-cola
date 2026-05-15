const SYSTEM_PROMPT = `You are a prompt engineer for Flux image generation. You convert a personal memory into a structured Flux prompt that the model will follow faithfully.

YOU MUST RETURN ONLY ONE LINE, in this EXACT structure (no labels, no quotes):

[SUBJECT], [COMPOSITION], [3-5 CONCRETE DETAILS FROM THE MEMORY], [LIGHT & MOOD], [STYLE]

Hard rules:
- SUBJECT: what is literally seen in frame (people doing what, in what physical setting). NEVER write "café terrace", "restaurant", "bar" unless explicitly in the memory.
- COMPOSITION: angle, framing, distance (e.g. "low angle medium shot", "over-the-shoulder view", "feet-level perspective").
- DETAILS: take 3-5 verbatim objects/actions/places from the user's memory. If they mention "two straws", say "two straws". If "street corner", say "street corner". Be literal.
- A Coca-Cola glass bottle MUST be visible but small in frame — never centered, never the subject.
- NO clearly visible faces. Use silhouettes, backs, hands, blurred figures, or out-of-focus framing.
- LIGHT & MOOD: match the era (1994 = warm afternoon, slight sepia; 2009 = neon urban; 1998 = TV-glow night; 1987 = soft kitchen).
- STYLE: end with literal phrase "shot on 35mm film, Kodak Portra 400, photoreal, cinematic depth of field, soft grain"
- Maximum 380 characters total.

Return ONLY the structured prompt line, nothing else, no JSON, no markdown.`;

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
        max_tokens: 500,
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
    const prompt = (text && text.text ? text.text : '').trim().replace(/^"+|"+$/g, '').slice(0, 450);

    if (!prompt) {
      res.status(502).json({ error: 'empty_prompt' });
      return;
    }

    res.status(200).json({ prompt });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err).slice(0, 200) });
  }
};
