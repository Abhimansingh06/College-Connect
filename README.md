# College Connect

College Connect is a responsive community app for juniors, senior students, alumni, and administrators.

## Run locally

Install Node.js 18 or later, open this folder in a terminal, then run:

```powershell
node server.js
```

Open `http://127.0.0.1:8000`. Without Supabase credentials the app uses its local JSON fallback in the ignored `data/` folder. Account passwords are salted and hashed with Node's scrypt. Sessions use HTTP-only cookies. Sign-up requires a password with at least 10 characters.

## Connect the app to Supabase

The project reference is `cfbaquhhnfyczgxwqqqn`. To switch the app from local JSON storage to this Supabase database:

1. Apply [`supabase/schema.sql`](</C:/Users/asus/OneDrive/Documents/ChatGPT/New project/supabase/schema.sql>) once in the Supabase SQL Editor.
2. Add `SUPABASE_URL=https://your-project.supabase.co` and `SUPABASE_SECRET_KEY=your-supabase-secret-key` to the ignored local `.env` file. Keep this secret server-side and out of browser code or source control.
3. Restart `node server.js`. On first connection the app imports existing local users and community data if the Supabase tables are empty, then uses Supabase for subsequent reads and writes.

The app uses the Supabase Data API directly from Node's server runtime; it does not require a client package. The server key is required because the API enforces the app's role rules on the server. Supabase Row Level Security is enabled and direct `anon`/`authenticated` table access is revoked by the schema script.

The local workspace already has an administrator account configured in the ignored `.env` file; open it to view or change the email and generated password. On another machine, copy `.env.example` to `.env` and set `CC_ADMIN_EMAIL` and `CC_ADMIN_PASSWORD` before launch. The administrator password must be at least 12 characters. Do not commit credentials or the `data` directory.

## Must Do user stories implemented

- Create and edit member profiles with basic and education details; seniors have CGPA and expertise domains, and alumni can add graduation, organization, role, and industry details.
- Register and sign in with server-validated credentials; sign-in rejects unknown users and incorrect passwords.
- Find verified, available senior/alumni mentors using search and filters, and inspect their skills, experience, and mentoring topics.
- Juniors can send mentorship requests and track status; senior and alumni mentors can accept or reject incoming requests.
- Juniors can ask questions; seniors can publish clearly labeled guidance posts and answer community questions; alumni can answer questions.
- Browse opportunities shared by alumni.
- Alumni can create and share internship, job, project, resource, and experience posts.
- Administrators can use the in-app community-care panel to verify mentors and moderate reported posts and opportunities.
- Administrators can list, disable, re-enable, and delete member accounts; disabling a mentor immediately removes their discovery access and ends their active sessions.
- Senior students can send connection/referral requests to alumni and cannot publish opportunities.
- Profiles, mentor verification, questions, answers, requests, opportunities, saved items, and reports persist on the server and are visible to other signed-in accounts.

## MCP connection

The local `college-connect` MCP server is registered in this Codex installation. It exposes read-only tools to search verified mentors, search opportunities, browse discussions, and get aggregate community counts. It reads the shared community data and omits member contact details. The server uses the standard MCP stdio transport and has no extra package dependencies. After the Codex app reloads its MCP configuration, the tools are available to new conversations. To register it on another machine, use `codex mcp add college-connect -- "C:\Program Files\nodejs\node.exe" "<absolute path to this project>\mcp-server.js"`.

## Current scope and deployment notes

When `.env` contains valid Supabase credentials, the Node server stores account records and shared community state in the Supabase tables. The ignored `data/` JSON files are used as a one-time import source when the corresponding Supabase table is empty. Without Supabase credentials, the app falls back to those local JSON files. Google sign-in and password reset email are not configured. The sample directory and initial discussions/opportunities are demonstration content.

For an internet-facing deployment, use HTTPS and secure secret management, and add session rotation, CSRF protection, rate limiting, backups, and operational monitoring. The app enforces account and role checks in the Node server; keep the Supabase secret key out of browser code and source control.
