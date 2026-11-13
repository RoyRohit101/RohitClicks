const crypto = require('crypto');
const { issueSignedToken, presignUrl, parseStoreIdFromDelegationToken, del } = require('@vercel/blob');
const L = require('./_lib');

const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif'
};

const safeId = value => /^[a-zA-Z0-9_-]{1,90}$/.test(String(value || ''));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!L.isAdmin(req)) return res.status(401).json({ ok: false, error: 'Admin login required' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    const projectId = String(body.projectId || '');
    if (!safeId(projectId)) return res.status(400).json({ ok: false, error: 'Invalid project' });

    if (action === 'upload') {
      const contentType = String(body.contentType || '').toLowerCase();
      const extension = TYPES[contentType];
      const size = Number(body.size);
      if (!extension) return res.status(415).json({ ok: false, error: 'Choose a JPEG, PNG, WebP or AVIF image' });
      if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) {
        return res.status(413).json({ ok: false, error: 'Each photo must be 50 MB or smaller' });
      }

      const pathname = 'rohitclicks/photos/' + projectId + '/' +
        Date.now() + '-' + crypto.randomBytes(10).toString('hex') + '.' + extension;
      const validUntil = Date.now() + 10 * 60 * 1000;
      const signed = await issueSignedToken({
        pathname,
        operations: ['put'],
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: MAX_PHOTO_BYTES
      });
      const { presignedUrl } = await presignUrl(signed, {
        pathname,
        operation: 'put',
        access: 'public',
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: MAX_PHOTO_BYTES
      });
      const storeId = parseStoreIdFromDelegationToken(signed.delegationToken);
      const url = 'https://' + storeId + '.public.blob.vercel-storage.com/' + pathname;
      return res.status(200).json({ ok: true, uploadUrl: presignedUrl, url, pathname, contentType, expiresAt: validUntil });
    }

    if (action === 'delete') {
      const rawUrl = String(body.url || '');
      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return res.status(400).json({ ok: false, error: 'Invalid photo URL' });
      }
      if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) {
        return res.status(400).json({ ok: false, error: 'This photo is not stored in the connected Blob store' });
      }

      let pathname;
      try {
        pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      } catch {
        return res.status(400).json({ ok: false, error: 'Invalid photo path' });
      }
      const ownedProjectPhoto = pathname.startsWith('rohitclicks/photos/' + projectId + '/') &&
        /^rohitclicks\/photos\/[a-zA-Z0-9_-]{1,90}\/[a-zA-Z0-9._-]+\.(jpg|png|webp|avif)$/i.test(pathname);
      const legacyPhoto = /^img\/[a-zA-Z0-9._-]+$/i.test(pathname);
      if (!ownedProjectPhoto && !legacyPhoto) {
        return res.status(403).json({ ok: false, error: 'This photo cannot be deleted from this project' });
      }

      await del(rawUrl);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Unknown photo action' });
  } catch (error) {
    console.error('Photo API error:', error);
    return res.status(500).json({ ok: false, error: 'Photo storage is unavailable. Check the Vercel Blob connection.' });
  }
};
