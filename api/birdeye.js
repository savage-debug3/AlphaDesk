const ALLOWED_PATHS = [
  { path: '/defi/tokenlist', cache: 60 },
  { path: '/defi/v2/tokens/top_traders', cache: 30 },
  { path: '/v1/wallet/token_list', cache: 30 },
  { path: '/defi/token_overview', cache: 60 },
  { path: '/defi/history_price', cache: 120 },
  { path: '/defi/token_security', cache: 300 },
  { path: '/wallet/v2/pnl-summary', cache: 60 },
  { path: '/defi/token_creation_info', cache: 300 },
  { path: '/defi/v3/token/holder', cache: 120 },
  { path: '/trader/gainers-losers', cache: 60 },
];

const SAFE_PARAM_RE = /^[a-zA-Z0-9_\-.]+$/;

const rateStore = new Map();
const RATE_WINDOW = 60000;
const RATE_MAX = 150;

function checkRate(ip) {
  const now = Date.now();
  let entry = rateStore.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    rateStore.set(ip, entry);
  }
  entry.count++;
  if (rateStore.size > 5000) {
    for (const [key, val] of rateStore) {
      if (now - val.start > RATE_WINDOW) rateStore.delete(key);
    }
  }
  return entry.count <= RATE_MAX;
}

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;

  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    const list = envOrigins.split(',').map(s => s.trim()).filter(Boolean);
    return list.includes(origin) ? origin : null;
  }

  const host = req.headers.host;
  if (host) {
    try {
      const url = new URL(origin);
      if (url.host === host) return origin;
    } catch { /* invalid origin */ }
  }
  return null;
}

function parseEndpoint(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const qIdx = raw.indexOf('?');
  const pathPart = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
  const queryPart = qIdx >= 0 ? raw.slice(qIdx) : '';
  return { path: pathPart, query: queryPart };
}

function validateParams(query) {
  if (!query) return true;
  const params = new URLSearchParams(query);
  for (const [key, value] of params) {
    if (key.length > 50 || value.length > 200) return false;
    if (!SAFE_PARAM_RE.test(key)) return false;
  }
  return true;
}

export default async function handler(req, res) {
  const corsOrigin = getAllowedOrigin(req);
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }

  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'API service not configured' });
  }

  const { endpoint } = req.query;
  const parsed = parseEndpoint(endpoint);
  if (!parsed) {
    return res.status(400).json({ error: 'Missing or invalid endpoint parameter' });
  }

  const allowed = ALLOWED_PATHS.find(a => a.path === parsed.path);
  if (!allowed) {
    return res.status(403).json({ error: 'Endpoint not permitted' });
  }

  if (!validateParams(parsed.query)) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  try {
    const url = `https://public-api.birdeye.so${parsed.path}${parsed.query}`;
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'x-chain': 'solana',
      },
    });

    const data = await response.json();

    res.setHeader(
      'Cache-Control',
      `s-maxage=${allowed.cache}, stale-while-revalidate=${allowed.cache * 2}`
    );
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Upstream request failed' });
  }
}
