const { put, list } = require('@vercel/blob');
const L = require('./_lib');

const clip = (value, max = 4000) => String(value == null ? '' : value).slice(0, max);
const safeUrl = value => {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

function validateContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid content payload');
  if (!Array.isArray(input.projects) || input.projects.length > 300) throw new Error('Invalid projects list');
  const texts = {};
  if (input.texts && typeof input.texts === 'object' && !Array.isArray(input.texts)) {
    for (const [key, value] of Object.entries(input.texts).slice(0, 60)) {
      if (/^[a-zA-Z0-9_-]{1,50}$/.test(key)) texts[key] = clip(value, 10000);
    }
  }
  const sourceSettings = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const settings = {
    brand: clip(sourceSettings.brand || 'Cinematic Overthinker', 80),
    email: clip(sourceSettings.email || L.ADMIN_EMAIL, 160),
    whatsapp: clip(sourceSettings.whatsapp || '', 20).replace(/[^0-9]/g, ''),
    instagram: safeUrl(sourceSettings.instagram),
    location: clip(sourceSettings.location || 'Kolkata, India', 100)
  };
  const projects = input.projects.map((p, index) => {
    if (!p || typeof p !== 'object' || !clip(p.title, 120).trim()) throw new Error('Every project needs a title');
    const category = ['weddings', 'events', 'fashion', 'jewellery', 'commercial', 'creative'].includes(p.cat) ? p.cat : 'creative';
    return {
      id: clip(p.id || 'p' + index, 100),
      title: clip(p.title, 120).trim(),
      cat: category,
      published: p.published !== false,
      featured: !!p.featured,
      order: Number.isFinite(Number(p.order)) ? Number(p.order) : index,
      year: clip(p.year, 4),
      client: clip(p.client, 120),
      location: clip(p.location, 120),
      summary: clip(p.summary, 240),
      description: clip(p.description, 4000),
      services: Array.isArray(p.services) ? p.services.slice(0, 30).map(v => clip(v, 80)) : [],
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 30).map(v => clip(v, 60)) : [],
      projectUrl: safeUrl(p.projectUrl),
      videoUrl: safeUrl(p.videoUrl),
      ph: Array.isArray(p.ph) ? p.ph.slice(0, 60).filter(v => typeof v === 'string' && (/^https:\/\//i.test(v) || /^data:image\//i.test(v))) : [],
      createdAt: clip(p.createdAt, 40),
      updatedAt: clip(p.updatedAt, 40)
    };
  });
  return { texts, settings, projects, updatedAt: clip(input.updatedAt, 40) };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method === 'POST') {
      if (!L.isAdmin(req)) return res.status(401).json({ ok: false });
      const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const clean = validateContent(input);
      const json = JSON.stringify(clean);
      if (Buffer.byteLength(json, 'utf8') > 600000) return res.status(413).json({ ok: false, error: 'Content is too large' });
      await put('site/content.json', json, {
        access: 'public',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 60
      });
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'GET') return res.status(405).json({ ok: false });
    const { blobs } = await list({ prefix: 'site/content.json' });
    if (!blobs.length) return res.status(200).json({});
    const response = await fetch(blobs[0].url + '?t=' + Date.now());
    if (!response.ok) throw new Error('Could not read stored content');
    return res.status(200).json(await response.json());
  } catch (error) {
    console.error('Content API error:', error);
    // Send a short diagnostic only to the authenticated admin so storage setup
    // problems are visible in the dashboard without exposing internals publicly.
    const detail = L.isAdmin(req)
      ? String(error && error.message || 'Unknown storage error')
          .replace(/[A-Za-z0-9_-]{48,}/g, '[redacted]')
          .slice(0, 180)
      : '';
    return res.status(500).json({
      ok: false,
      error: 'Content service unavailable',
      ...(detail ? { details: detail } : {})
    });
  }
};
