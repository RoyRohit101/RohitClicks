const L = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!L.SECRET || !L.ADMIN_EMAIL) return res.status(503).json({ ok: false });
  const limit = L.checkRateLimit(req, 'verify', 8, 600000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ ok: false, error: 'Too many attempts. Request a new code later.' });
  }
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  const submitted = String((req.body || {}).code || '').trim();
  const validCode = [L.windowId(), L.windowId() - 1].some(window => {
    const expected = L.loginCode(email, window);
    return /^[0-9]{6}$/.test(submitted) && L.constantTimeTextEqual(submitted, expected);
  });
  if (email !== L.ADMIN_EMAIL || !validCode) return res.status(401).json({ ok: false });
  res.setHeader('Set-Cookie', 'adm=' + L.sessionToken() + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800');
  return res.status(200).json({ ok: true });
};
