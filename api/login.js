const L = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!L.SECRET || !L.ADMIN_EMAIL || !process.env.RESEND_API_KEY) {
    return res.status(503).json({ ok: false, error: 'Admin email login is not configured' });
  }
  const limit = L.checkRateLimit(req, 'login', 5, 600000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again later.' });
  }
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (email === L.ADMIN_EMAIL) {
    try {
      await L.sendMail(
        'Your Rohit Clicks admin login code',
        'Your Rohit Clicks admin code: ' + L.loginCode(email, L.windowId()) + '\n\nIt expires in about 10 minutes.'
      );
    } catch (error) {
      console.error('Admin login email failed:', error);
      return res.status(502).json({ ok: false, error: 'Could not send the login code' });
    }
  }
  // Keep the response identical for unknown addresses to avoid disclosing the admin email.
  return res.status(200).json({ ok: true });
};
