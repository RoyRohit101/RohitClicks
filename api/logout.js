module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  res.setHeader('Set-Cookie', 'adm=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({ ok: true });
};
