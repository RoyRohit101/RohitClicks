# Rohit Clicks – deploy to Vercel
1. Install Node, then in this folder: `npm i` and `npx vercel login`
2. `npx vercel link` (name the project **rohitclicks** → rohitclicks.vercel.app)
3. Vercel dashboard → Storage → Create **Blob** store → connect to the project (adds BLOB_READ_WRITE_TOKEN)
4. Settings → Environment Variables (Production):
   - ADMIN_EMAIL = royrohit26012000@gmail.com
   - AUTH_SECRET = any long random string
   - RESEND_API_KEY = key from resend.com (sign up with the same Gmail)
5. `npx vercel --prod`
Admin: footer → "Admin" → enter your email → enter the 6-digit code emailed to you.
Custom domain (rohitclicks.com): buy it, then Project → Settings → Domains → Add.
