const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const attempts = new Map();

const hmac = value => crypto.createHmac('sha256', SECRET).update(value).digest('hex');
const windowId = () => Math.floor(Date.now() / 600000);
const loginCode = (email, window) =>
  String(parseInt(hmac(email + ':' + window).slice(0, 8), 16) % 1000000).padStart(6, '0');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function readCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return '';
  const entry = header.split(/;\\s*/).find(part => part.startsWith(name + '='));
  return entry ? entry.slice(name.length + 1) : '';
}

function isAdmin(req) {
  if (!SECRET) return false;
  const [expires, signature, extra] = readCookie(req, 'adm').split('.');
  if (!expires || !signature || extra || !/^\\d+$/.test(expires) || Number(expires) <= Date.now()) return false;
  return safeEqual(hmac('adm' + expires), signature);
}

function sessionToken() {
  const expires = String(Date.now() + 7 * 86400000);
  return expires + '.' + hmac('adm' + expires);
}

function checkRateLimit(req, bucket, max = 6, periodMs = 600000) {
  const forwarded = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  const key = bucket + ':' + (forwarded || 'unknown');
  const now = Date.now();
  const prior = attempts.get(key) || { count: 0, resetAt: now + periodMs };
  if (now > prior.resetAt) {
    prior.count = 0;
    prior.resetAt = now + periodMs;
  }
  prior.count += 1;
  attempts.set(key, prior);
  for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
  return { allowed: prior.count <= max, retryAfter: Math.max(1, Math.ceil((prior.resetAt - now) / 1000)) };
}

async function sendMail(subject, text, replyTo) {
  if (!process.env.RESEND_API_KEY || !ADMIN_EMAIL) throw new Error('Email service is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Rohit Clicks <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: String(subject).replace(/[\\r\\n]/g, ' ').slice(0, 160),
      text: String(text).slice(0, 12000),
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!response.ok) throw new Error('Email provider rejected the request');
  return response;
}

module.exports = {
  ADMIN_EMAIL,
  SECRET,
  windowId,
  loginCode,
  isAdmin,
  sessionToken,
  sendMail,
  checkRateLimit
};
