# Runtime HQ

Runtime HQ is a lightweight service monitoring and incident management application for tracking the health, availability and response time of HTTP services. It sends HTTP requests to endpoints you register, records every result, derives a status from it, and opens and resolves incidents when a service starts and stops failing.

It is a single Next.js application backed by PostgreSQL. There is no separate worker or agent: checks run inside the app's API routes and are triggered by an external scheduler.

## What it does

- Monitors HTTP and HTTPS endpoints registered by each user.
- Records status, HTTP code and response latency for every check, and keeps the history.
- Derives a service status: `OPERATIONAL`, `DEGRADED` or `OUTAGE`. A service that has never been checked is shown as `AWAITING_CHECK`.
- Opens an incident automatically when a healthy service starts failing, and resolves it when the service recovers.
- Supports manually declared incidents with a status workflow and a timeline of updates.
- Shows dashboard telemetry (24-hour uptime, average response time, open incidents, status distribution, recent heartbeat history) and a per-service detail page.
- Runs a manual check on demand ("Check now"), with a per-service cooldown.
- Isolates data per user: every service and incident belongs to the account that created it.
- Authenticates with email and password, Google and GitHub (Better Auth).

## Core monitoring model

**Checks.** Each check is a single `GET` request with a total time budget of 3 seconds, including any redirects. Up to 5 redirects are followed. Only the response headers are read; the body is never downloaded.

**Classification.** The result of a check maps to a service status:

| Result | Status |
|---|---|
| HTTP 2xx | `OPERATIONAL` |
| Any other status below 500 (including 3xx that is not followed, 4xx) | `DEGRADED` |
| HTTP 5xx | `OUTAGE` |
| No HTTP response (timeout, DNS failure, connection error, blocked destination, too many redirects) | `OUTAGE` |

For checks with no HTTP response, the reason is stored in `ServiceCheck.message` (`TIMEOUT`, `DNS_FAILURE`, `NETWORK_ERROR`, `BLOCKED_DESTINATION`, `TOO_MANY_REDIRECTS`). Failed HTTP responses are stored as `HTTP_ERROR`; successful checks as `OK`.

**Before the first check.** A new service has no checks and no heartbeat. The UI shows `AWAITING_CHECK` and does not count it toward uptime. The status column in the database has a default value, but it is never displayed for a service with no check history, and clients cannot set it.

**Uptime.** Uptime is the number of `OPERATIONAL` checks divided by all checks in the last 24 hours, from persisted `ServiceCheck` rows. `DEGRADED` and `OUTAGE` checks both count as not up. With no checks in the window there is no uptime value (shown as "—"), not a default. The dashboard KPI aggregates across all of a user's services; the service list and detail pages show the same definition per service.

**Response time.** The dashboard's average response time is the mean latency of checks in the last 24 hours that received an HTTP response.

**Check interval.** Checks are scheduled externally (see [Scheduled monitoring](#scheduled-monitoring)). The interval is whatever the scheduler is configured to. The project is set up for 5 minutes. It is not configurable per service inside the app.

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (developed against Neon) |
| ORM | Prisma 6 |
| Authentication | Better Auth (email/password, Google, GitHub) |
| Validation | Zod |

```text
src/
├── app/          Routes (pages) and API route handlers
├── components/   UI: dashboard, incidents, landing page ("marketing"), shared modals
├── lib/          Server logic: check engine, incident manager, URL safety,
│                 service queries, auth, Prisma client
└── proxy.ts      Session check that protects authenticated pages
prisma/
├── schema.prisma
└── seed.ts       Development seed data
```

Boundaries worth knowing:

- **`src/lib/health-check.ts`** runs one check for one service, persists the result and hands the status transition to the incident manager.
- **`src/lib/incident-manager.ts`** owns incident creation, resolution, status changes and service deletion side effects.
- **`src/lib/url-safety.ts`** validates monitored URLs and performs the actual outbound request with destination checks.
- **`src/lib/service-queries.ts`** contains the bounded check-history and 24-hour uptime queries.
- **`src/proxy.ts`** redirects unauthenticated users away from application pages. API routes do their own authentication.

## Routes

**Pages**

| Route | Description |
|---|---|
| `/` | Public landing page. Visible to signed-in and signed-out users. |
| `/login`, `/register` | Authentication. Signed-in users are redirected to `/dashboard`. |
| `/dashboard` | Authenticated monitoring overview. |
| `/services`, `/services/[id]` | Service registry and service detail (`[id]` accepts the id or the slug). |
| `/incidents`, `/incidents/[id]` | Incident list and detail. |
| `/settings` | Account information, theme, sign out. |

**API** (all require a session except `health`, the auth handler and the cron endpoint, which has its own secret)

| Route | Purpose |
|---|---|
| `GET, POST /api/services` | List and create services. |
| `GET, PATCH, DELETE /api/services/[serviceId]` | Read, update and delete a service. |
| `POST /api/services/[serviceId]/check` | Run a check now. |
| `GET, POST /api/incidents` | List and declare incidents. |
| `GET, PATCH /api/incidents/[id]` | Read an incident, change its status. |
| `POST /api/incidents/[id]/events` | Add a timeline update. |
| `POST /api/incidents/[id]/resolve` | Resolve an incident. |
| `GET /api/dashboard` | Dashboard KPIs. |
| `POST /api/cron/check-services` | Scheduled check run (secret-protected). |
| `GET /api/health` | Liveness probe (does not touch the database). |
| `/api/auth/*` | Better Auth handler. |

## Monitoring flow

```text
Service
   ↓
Scheduled (or manual) health check
   ↓
HTTP response / network result
   ↓
ServiceCheck row + Service status, latency, last heartbeat
   ↓
Status transition (healthy ↔ failing)
   ↓
Incident manager
   ↓
Dashboard and service history
```

Checks, services and incidents are stored in PostgreSQL. Everything runs in the Next.js server process that handles the request; nothing is distributed beyond the external scheduler that calls the endpoint.

## Incidents

- **Automatic incidents** are created when a service moves from `OPERATIONAL` to `DEGRADED` or `OUTAGE`. Severity is `CRITICAL` for an outage and `MEDIUM` for degraded. They are stored with `automatic = true`, start as `INVESTIGATING`, and get an initial timeline event.
- **Automatic recovery** happens when the service returns to `OPERATIONAL`. Only the open automatic incident for that service is resolved: it gets `RESOLVED`, a `resolvedAt` timestamp and a timeline event that includes the duration.
- **Manual incidents** are declared by the user with a title, severity, optional affected services and notes. They are never resolved by service recovery; they are resolved manually.
- **Status** moves through `INVESTIGATING`, `IDENTIFIED`, `MONITORING` and `RESOLVED`. Every status change is recorded as a timeline event. Resolving sets `resolvedAt`; reopening clears it.
- **Duplicates.** Incident changes for a service are serialised with a row lock, so concurrent checks of the same service cannot open two automatic incidents or resolve one twice.
- **Deleting a service** keeps incident history. An open incident that only affected that service is closed with a timeline event. An open incident affecting other services stays open, and the removal is recorded.

Incidents are opened on the first failing check. There is no consecutive-failure threshold or retry, so a single failed check opens an incident.

## Security

Implemented:

- Application pages require a session. Every API route (except the ones listed above) authenticates and filters by the signed-in user, so services and incidents cannot be read or changed across accounts.
- Monitoring status is set by the server. Clients cannot set or update a service's `status`.
- A user can monitor at most **25 services** (`MAX_SERVICES_PER_USER`).
- Monitored URLs must be `http://` or `https://` and must not contain credentials.
- **Private-network protection.** Destinations are validated by the address they resolve to, not by hostname. Loopback, private, link-local (including cloud metadata addresses), carrier-grade NAT, multicast and reserved IPv4 ranges are blocked, as are the IPv6 equivalents, IPv4-mapped, NAT64, 6to4 and Teredo addresses.
- **Redirects** are followed manually and every hop is validated with the same rules; at most 5 redirects are followed.
- The address is checked inside the connection's DNS lookup, so the address that was validated is the one connected to. The URL is validated when a service is created or updated, and again on every check.
- The outbound requests identify themselves as `RuntimeHQ-Monitor/1.0`.
- The cron endpoint requires `Authorization: Bearer <CRON_SECRET>` and fails closed with a 500 if `CRON_SECRET` is not configured.

Not implemented: security headers (CSP, HSTS and similar are not configured in the app), a distributed rate limiter, restrictions on destination ports, or ownership verification of monitored domains.

## Environment variables

Create `.env` in the project root. Do not commit it (it is git-ignored).

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by the app. |
| `DIRECT_URL` | Yes | Direct (non-pooled) connection string used by Prisma for schema operations. It is set in `schema.prisma`, so Prisma needs it. With a single non-pooled database, use the same value as `DATABASE_URL`. |
| `BETTER_AUTH_SECRET` | Yes (production) | Secret used by Better Auth to sign sessions. Read by Better Auth itself. |
| `BETTER_AUTH_URL` | Yes (production) | Public base URL of the app, for example `https://your-domain`. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Base URL used by the browser auth client. Falls back to `http://localhost:3000` in the client, and is used as a fallback for the server base URL. |
| `CRON_SECRET` | Yes, to run scheduled checks | Bearer token for `/api/cron/check-services`. Without it the endpoint returns 500. |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Optional | Enables Google sign-in. |
| `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` | Optional | Enables GitHub sign-in. |
| `BETTER_AUTH_API_KEY` | Optional | Used by the `@better-auth/infra` dashboard plugin that the app enables. |

Email and password sign-in works without the OAuth variables. If a provider's variables are missing, its sign-in button will not work.

OAuth callback URLs follow Better Auth's default: `<BETTER_AUTH_URL>/api/auth/callback/google` and `<BETTER_AUTH_URL>/api/auth/callback/github`.

## Local development

Requirements: Node.js (developed on 22), [pnpm](https://pnpm.io/), and a PostgreSQL database.

```bash
git clone <repository-url>
cd runtime-hq
pnpm install
```

Create `.env` with at least `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000` and `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Then prepare the database and start the app:

```bash
pnpm db:push        # create/update tables from prisma/schema.prisma
pnpm dev            # http://localhost:3000
```

Available scripts (from `package.json`):

| Script | Command |
|---|---|
| `pnpm dev` | `next dev` |
| `pnpm build` | `prisma generate && next build` |
| `pnpm start` | `next start` |
| `pnpm lint` | `eslint` |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:push` | `prisma db push` |
| `pnpm db:migrate` | `prisma migrate dev` (see below) |
| `pnpm db:studio` | `prisma studio` |
| `pnpm db:seed` | `prisma db seed` |

## Database

The schema is in `prisma/schema.prisma`. Models: `Service`, `ServiceCheck`, `Incident`, `IncidentEvent`, `IncidentService` (join table), and Better Auth's `User`, `Session`, `Account`, `Verification`.

**The project applies schema changes with `prisma db push`.** There is no `prisma/migrations` directory. A `db:migrate` script exists but is not part of the current workflow, so use `pnpm db:push` and review the changes it proposes before accepting them, especially on a database that holds data. `pnpm db:generate` regenerates the Prisma client (`pnpm build` does this too).

Notable schema details:

- `Service` is unique per user on `(userId, slug)`.
- `ServiceCheck` is indexed on `(serviceId, checkedAt)`, which serves the "latest N checks" and 24-hour queries.
- Deleting a service cascades to its checks and its incident links. Incidents and their events are kept.
- `Incident.automatic` marks incidents opened by the monitoring engine.
- There is no data retention: check rows accumulate (about 288 per service per day at a 5-minute interval).

`pnpm db:seed` runs `prisma/seed.ts`. It is a development helper: it attaches sample services and an incident to the oldest user in the database (register an account first). It writes preset statuses and heartbeats without running real checks, so do not run it against a database you care about.

## Scheduled monitoring

Runtime HQ has no built-in scheduler. An external scheduler must call the check endpoint. The project is set up to call it every 5 minutes.

```bash
curl -X POST https://your-domain/api/cron/check-services \
  -H "Authorization: Bearer $CRON_SECRET"
```

The endpoint:

1. Requires `POST` and the `CRON_SECRET` bearer token (401 otherwise, 500 if the secret is not configured).
2. Loads every service in the database, across all users.
3. Skips services that are currently being checked or were checked less than 45 seconds ago.
4. Checks the remaining services concurrently, persists each result and runs incident detection.
5. Returns a JSON summary of the results.

The manual "Check now" action uses the same 45-second per-service guard. That guard is kept in process memory, so it is not shared between server instances and resets on restart.

## Testing and verification

There is no automated test suite, and no CI configuration in the repository. What exists:

- `pnpm lint` (ESLint). The codebase currently reports some pre-existing warnings and errors, mostly React hook rules.
- `pnpm build` runs a type-checked production build.
- Changes so far have been checked manually against a running dev server.

## Limitations

Runtime HQ does not currently provide:

- External notifications or alerting (email, Slack, webhooks). Incidents are visible in the app only; the bell icon in the top bar links to the incident list.
- Multi-region monitoring. Every check runs from wherever the app is deployed. The `region` field on a service is a stored label, not a monitoring location, and is not exposed in the creation flow.
- Teams, workspaces or shared access. Data is per user.
- Billing or plans (there is a fixed limit of 25 services per user).
- Public status pages.
- Third-party integrations.
- Configurable check intervals, timeouts, HTTP methods or expected status codes. Checks are `GET`, 3 seconds, with the classification above.
- Password reset or email verification.
- Account deletion, or profile editing.
- A failure threshold before opening an incident, or data retention.

## License

No license file is included in this repository, and none is declared in `package.json`. Ask the author before reusing or redistributing the code.
