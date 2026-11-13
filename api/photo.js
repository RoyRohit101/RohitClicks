const { del, issueSignedToken } = require('@vercel/blob');
const { handleUploadPresigned } = require('@vercel/blob/client');
const L = require('./_lib');

const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const safeId = value => /^[a-zA-Z0-9_-]{1,90}$/.test(String(value || ''));

function parseBody(body) {
  if (typeof body === 'string') return JSON.parse(body);
  return body && typeof body === 'object' ? body : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  let body;
  try {
    body = parseBody(req.body);
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  if (body.action === 'delete') {
    if (!L.isAdmin(req)) {
      return res.status(401).json({ ok: false, error: 'Your admin session has expired. Log in again.' });
    }
    try {
      const projectId = String(body.projectId || '');
      if (!safeId(projectId)) {
        return res.status(400).json({ ok: false, error: 'Invalid project' });
      }

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

      const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      const ownedProjectPhoto =
        pathname.startsWith('rohitclicks/photos/' + projectId + '/') &&
        /^rohitclicks\/photos\/[a-zA-Z0-9_-]{1,90}\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|avif)$/i.test(pathname);

      if (!ownedProjectPhoto) {
        return res.status(403).json({ ok: false, error: 'This photo does not belong to the selected project' });
      }

      await del(rawUrl);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Photo delete failed:', error);
      return res.status(500).json({ ok: false, error: 'Could not delete the stored photo. ' + String(error.message || '').slice(0, 180) });
    }
  }

  if (body.type !== 'blob.generate-presigned-url' && body.type !== 'blob.upload-completed') {
    return res.status(400).json({
      ok: false,
      error: 'Invalid Vercel Blob request. Expected a presigned upload event.'
    });
  }

  try {
    const result = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname, clientPayload) => {
        if (!L.isAdmin(req)) {
          throw new Error('Your admin session has expired. Log in again.');
        }

        const limit = L.checkRateLimit(req, 'photo-upload', 60, 600000);
        if (!limit.allowed) {
          throw new Error('Too many photo uploads. Please wait before uploading more.');
        }

        const projectId = String(clientPayload || '');
        if (!safeId(projectId)) {
          throw new Error('Invalid project. Please choose a project and try again.');
        }

        const safePath = String(pathname || '');
        const pathPrefix = 'rohitclicks/photos/' + projectId + '/';
        if (!safePath.startsWith(pathPrefix) ||
            !/^rohitclicks\/photos\/[a-zA-Z0-9_-]{1,90}\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|avif)$/i.test(safePath)) {
          throw new Error('Invalid photo path.');
        }

        // issueSignedToken uses Vercel OIDC + BLOB_STORE_ID when the store is
        // connected with OIDC. It does not require the legacy RW token.
        const token = await issueSignedToken({
          pathname: safePath,
          operations: ['put'],
          validUntil: Date.now() + 5 * 60 * 1000,
          allowedContentTypes: Array.from(TYPES),
          maximumSizeInBytes: MAX_PHOTO_BYTES
        });

        return {
          token,
          urlOptions: {
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ projectId })
          }
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const payload = JSON.parse(tokenPayload || '{}');
          if (!safeId(payload.projectId) ||
              !String(blob.pathname || '').startsWith('rohitclicks/photos/' + payload.projectId + '/')) {
            throw new Error('Upload completion did not match the authorised project');
          }
          console.info('Portfolio photo uploaded:', blob.pathname);
        } catch (error) {
          console.error('Photo upload completion check failed:', error);
          throw error;
        }
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Photo upload handshake failed:', error);
    return res.status(400).json({
      ok: false,
      error: String(error.message || 'Photo upload could not be authorised').slice(0, 220)
    });
  }
};
