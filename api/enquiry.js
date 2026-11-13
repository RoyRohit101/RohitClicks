const L = require('./_lib');

const value = (input, max) => String(input == null ? '' : input).trim().slice(0, max);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const limit = L.checkRateLimit(req, 'enquiry', 8, 600000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ ok: false, error: 'Please wait before sending another enquiry.' });
  }
  const v = req.body || {};
  const name = value(v.n, 120);
  const email = value(v.e, 160).toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'A name and valid email are required' });
  }
  const fields = {
    n: name,
    e: email,
    p: value(v.p, 40),
    t: value(v.t, 100),
    d: value(v.d, 30),
    s: value(v.s, 20),
    l: value(v.l, 180),
    b: value(v.b, 100),
    m: value(v.m, 1500)
  };
  const body = Object.entries(fields).map(([key, text]) => key + ': ' + text.replace(/[\r\n]/g, ' ')).join('\n');
  try {
    const mail = await L.sendMail('New portfolio enquiry: ' + fields.t.slice(0, 60), body, email);
    return res.status(mail.ok ? 200 : 502).json({ ok: !!mail.ok });
  } catch (error) {
    console.error('Enquiry email failed:', error);
    return res.status(502).json({ ok: false, error: 'Email service unavailable' });
  }
};
