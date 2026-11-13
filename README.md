# Rohit Clicks

A static photography and cinematography portfolio for Rohit Roy, with Vercel serverless API routes and a private admin dashboard.

## Deploy

1. Install Node.js and run `npm install`.
2. Link the repository to a Vercel project.
3. Create a Vercel Blob store and connect it to the project. This supplies `BLOB_READ_WRITE_TOKEN` (or configure the supported Vercel Blob OIDC connection).
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
- A minimal photo library for each project.
- Editing homepage, about, services and contact page copy.
- Editing public studio name, location and contact links.
- Downloading and restoring a JSON content backup.

## Photo library

Open the **Photos** tab while logged in as admin. Choose a project and select **Add photos** to pick one or many images from the device you're using. Each photo can be previewed, replaced, moved earlier/later, or deleted.

Supported formats: JPEG, PNG, WebP and AVIF. Each file can be up to 50 MB. Uploads use the official `@vercel/blob/client` browser helper and the official `handleUpload` server handshake. The browser module is loaded from the pinned `esm.sh` CDN URL; allow this CDN in browser/network settings. The long-lived Blob storage credential stays on the server.

Deleting a photo removes its reference from the project and asks the Blob API to delete the stored file. Replacing a photo saves the new URL before attempting to remove the previous stored file. If storage cleanup fails, the portfolio still reflects the saved gallery change and the dashboard reports the cleanup issue.

## Storage and security

- Public content is stored in Vercel Blob at `site/content.json`.
- Only an authenticated admin session can write portfolio content or request photo upload/delete operations.
- Photo upload permissions are scoped to one generated pathname, one image content type, a 50 MB maximum, and a short expiry.
- Admin sessions are signed with `AUTH_SECRET`, stored in an HttpOnly, Secure, SameSite=Lax cookie and expire after seven days.
- Login-code and public enquiry endpoints have basic per-instance rate limits and input validation.
- Login and enquiry email delivery requires a working Resend API key.

## Validation

A GitHub Actions workflow checks serverless API JavaScript syntax, inline browser JavaScript syntax, and key portfolio/admin/photo requirements on pushes and pull requests.
