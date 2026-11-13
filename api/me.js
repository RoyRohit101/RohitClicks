const L = require('./_lib');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ admin: false });
  return res.status(200).json({ admin: L.isAdmin(req) });
};
