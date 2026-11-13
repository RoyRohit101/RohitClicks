# Rohit Clicks

A static photography and cinematography portfolio for Rohit Roy, with Vercel serverless API routes and a private admin dashboard.

## Deploy

1. Install Node.js and run `npm install`.
2. Link the repository to a Vercel project.
3. Create a Vercel Blob store and connect it to the project. This supplies `BLOB_READ_WRITE_TOKEN`.
4. Add these Production environment variables in Vercel:
   - `ADMIN_EMAIL`: the email address allowed to access the admin dashboard.
   - `AUTH_SECRET`: a long, private random secret used to sign one-time codes and admin sessions.
   - `RESEND_API_KEY`: an API key from Resend for login codes and contact enquiries.
5. Deploy with `npx vercel --prod`.

The public portfolio is served from `public/index.html`. API routes live in `api/`.

## Admin dashboard

Open the **Admin** link in the website footer, enter the authorised admin email, then enter the six-digit code sent by email.

The dashboard includes:

- Overview of total, published, draft and featured projects.
- Add, edit, duplicate and delete project entries.
- Project category, title, client, year, location, summary and full description.
- Services delivered, tags, external project link and film link.
- Draft/publish and featured-on-homepage controls.
- Project ordering, search and category/status filters.
- Editing homepage, about, services and contact page copy.
- Editing public studio name, location and contact links.
- Downloading and restoring a JSON content backup.

**Photo handling:** this version does not provide photo uploads or add new photographs. Existing image references already stored with projects are preserved when the content is saved.

## Storage and security

- Public content is stored in Vercel Blob at `site/content.json`.
- Only an authenticated admin session can write portfolio content.
- Admin sessions are signed with `AUTH_SECRET`, stored in an HttpOnly, Secure, SameSite=Lax cookie and expire after seven days.
- Login-code and public enquiry endpoints have basic per-instance rate limits and input validation.
- Login and enquiry email delivery requires a working Resend API key.

## Validation

A GitHub Actions workflow checks serverless API JavaScript syntax, inline browser JavaScript syntax, and key portfolio/admin requirements on pushes and pull requests.
