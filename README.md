# MediConnect

MediConnect is a web application for connecting patients and doctors. It provides patient and doctor dashboards for account access, appointment scheduling, doctor availability, health assessments, alerts, and medical-record uploads.

## Project structure

- `frontend/` contains the browser-based registration, patient dashboard, and doctor dashboard.
- `backend/` contains the Express API, Supabase authentication and data access, and Storage integration.

The backend serves the frontend static files, so you can run the app from a single server.

## Requirements

- Node.js 18 or newer (with npm)

## Run locally

From the repository root, install the backend dependencies:

```bash
cd backend
npm install
```

Start the development server:

```bash
npm run dev
```

Alternatively, run it without the development watcher:

```bash
npm start
```

Open [http://localhost:4000](http://localhost:4000) to use the app. The API health check is available at [http://localhost:4000/api/health](http://localhost:4000/api/health).

## Recreate and configure Supabase

The app uses Supabase Auth for email/password and Google login, and Supabase Postgres and Storage for application data. After creating a new Supabase project:

1. In the Supabase Dashboard, open **SQL Editor**, create a query, paste in [`supabase/setup.sql`](supabase/setup.sql), and run it. This creates the tables and a private `medical-records` bucket used by the API.
2. In **Project Settings → API** (or **Connect**), copy the project URL, the publishable/anon key, and the `service_role` secret key.
3. From the `backend/` directory, create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. The publishable/anon key is intended for browser use; **never expose the service-role key or commit `.env`**.
4. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:4000` and add `http://localhost:4000/**` to the allowed redirect URLs. If email confirmation is enabled, configure Supabase email delivery so confirmation links can be sent. See Supabase's [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).
5. To enable Google, create an OAuth 2.0 **Web application** client in [Google Cloud Console](https://console.cloud.google.com/auth/clients). Add `http://localhost:4000` as an authorized JavaScript origin. Copy the callback URL shown on Supabase's **Authentication → Providers → Google** page into Google's authorized redirect URIs, then put the Google client ID and secret into the Supabase Google provider settings and enable the provider. The OAuth callback belongs to Supabase; the allowed post-login redirect is your MediConnect URL from step 4. See Supabase's [Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google).
6. Start the server using the commands below and open `http://localhost:4000`. Do not open the HTML file directly or use a different local port unless you also add that origin and redirect URL in Supabase and Google.

The backend loads `backend/.env` automatically and refuses to start if the required Supabase URL or keys are missing. Doctor sign-ups are held in `pending` status until an administrator approves them in the MediConnect verification portal described below.

Patients can register with Google after selecting **Patient** without entering additional details. Their Google name and email create the initial patient account; phone number, gender, and date of birth are requested and saved to the patient profile when they book their first appointment. Doctor registration continues to require the doctor profile fields.

## Doctor verification administrator

Doctor registrations remain pending until an administrator approves them. To create the administrator:

1. In Supabase **Authentication → Users**, create or invite the administrator's Auth user if it does not exist yet. Public MediConnect registration cannot grant administrator access.
2. Add the administrator's exact Auth email to `ADMIN_EMAILS` in `backend/.env` (for example, `ADMIN_EMAILS=admin@example.com`). Multiple addresses may be comma-separated. This server-side allowlist is the only way to grant the administrator role; it is not available in public registration.
3. Restart the backend and sign in with that Supabase account, selecting **Admin** as the sign-in role. Open `http://localhost:4000/admin-dashboard.html` to review, search, and filter doctor applications. Approving a doctor changes their status to `approved`; that doctor can then sign in to the doctor portal. Rejected doctors remain blocked. Patient and doctor roles are selected during registration; admin is an existing, allowlisted Auth account and cannot be self-registered.

If your Supabase database was already initialized before this patient signup flow was added, run these statements once in the Supabase SQL Editor to allow the initial Google patient profile to be created:

```sql
alter table public.users alter column phone drop not null;
alter table public.users alter column gender drop not null;
alter table public.users alter column dob drop not null;
```

For production, add the deployed app's HTTPS origin and redirect URL to Supabase and Google, configure production email delivery, and use production-only secrets. If the previous Supabase project was deleted, its data and keys cannot be recovered from this app; create a new project and use its new URL and keys.

## Local data

The API stores account profiles in Supabase. Uploaded medical files are placed in the private Supabase Storage bucket and are served via short-lived signed links. Local `.env`, dependency, and generated-data files are excluded from Git.
