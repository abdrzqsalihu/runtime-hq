# Runtime HQ

Runtime HQ is a lightweight service monitoring and incident management platform for tracking the health, availability, and response time of HTTP services.

It monitors registered endpoints, records check results, detects service failures, and automatically creates and resolves incidents when services go down or recover.

## Features

* HTTP/HTTPS service monitoring
* Automatic uptime and response-time tracking
* Automatic incident detection and recovery
* Manual incident management
* Service health history
* Dashboard telemetry and service details
* Manual "Check now" monitoring
* Per-user data isolation
* Email/password, Google, and GitHub authentication
* Protection against monitoring private/internal network destinations

## Tech Stack

* **Next.js 16** - App Router
* **React 19**
* **TypeScript**
* **Tailwind CSS 4**
* **PostgreSQL**
* **Prisma 6**
* **Better Auth**
* **Zod**

## Architecture

Runtime HQ is a single Next.js application backed by PostgreSQL. Monitoring checks run through the application's API and are triggered by an external scheduler.

```text
Scheduler
   ↓
Check API
   ↓
HTTP Service
   ↓
Service Check
   ↓
Status & Incident Detection
   ↓
Dashboard
```

## Project Structure

An automatic incident opens after `INCIDENT_FAILURE_THRESHOLD` consecutive failed checks (default 2). Opening and resolving an automatic incident queues Telegram and email notifications; see [docs/notifications.md](docs/notifications.md).

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
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Optional | Enable Telegram alerts (bot token from @BotFather; webhook secret you generate). |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Optional | Enable email alerts through Brevo. The sender must be verified in Brevo. |
| `BREVO_WEBHOOK_SECRET` | Optional | Protects `/api/brevo/webhook` (delivery/bounce events). Endpoint is disabled without it. |
| `INCIDENT_FAILURE_THRESHOLD` | Optional | Consecutive failed checks before an incident opens (1–10, default 2). |
| `BETTER_AUTH_API_KEY` | Optional | Used by the `@better-auth/infra` dashboard plugin that the app enables. |
```text
src/
├── app/          Pages and API routes
├── components/   UI components
├── lib/          Monitoring, incidents, auth and database logic
└── proxy.ts      Authentication middleware

prisma/
├── schema.prisma
└── seed.ts
```

## Getting Started

### Requirements

* Node.js 22+
* pnpm
* PostgreSQL

### Installation

```bash
git clone https://github.com/abdrzqsalihu/runtime-hq
cd runtime-hq
pnpm install
```

Create a `.env` file:

```env
DATABASE_URL=
DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=
```

Optional OAuth configuration:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
```

Prepare the database and start the development server:

```bash
pnpm db:push
pnpm dev
```

The application will be available at:

```text
http://localhost:3000
```

## Scheduled Monitoring

Runtime HQ uses an external scheduler to trigger monitoring checks.

The project is configured for checks every **5 minutes**.

```bash
curl -X POST https://your-domain/api/cron/check-services \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Database

Runtime HQ uses PostgreSQL with Prisma.

The main models are:

* `Service`
* `ServiceCheck`
* `Incident`
* `IncidentEvent`
* `IncidentService`
* Better Auth user and session models

There is no CI configuration. `pnpm test` runs the Node test runner suite in `src/test/` (incident → notification lifecycle, outbox delivery/retries, Telegram linking, email confirmation, webhook authentication). It runs against the database in `DATABASE_URL` using disposable users it deletes afterwards, with Telegram and Brevo mocked, so prefer a non-production database. Also available:
Schema changes are currently managed with:

```bash
pnpm db:push
```

## Available Scripts

| Command            | Description              |
| ------------------ | ------------------------ |
| `pnpm dev`         | Start development server |
| `pnpm build`       | Build for production     |
| `pnpm start`       | Start production server  |
| `pnpm lint`        | Run ESLint               |
| `pnpm db:generate` | Generate Prisma client   |
| `pnpm db:push`     | Apply Prisma schema      |
| `pnpm db:studio`   | Open Prisma Studio       |
| `pnpm db:seed`     | Seed development data    |

- Notification channels other than Telegram and email (Slack, webhooks, SMS), reminders while an incident stays open, or notifications for manually declared incidents.
- Multi-region monitoring. Every check runs from wherever the app is deployed. The `region` field on a service is a stored label, not a monitoring location, and is not exposed in the creation flow.
- Teams, workspaces or shared access. Data is per user.
- Billing or plans (there is a fixed limit of 25 services per user).
- Public status pages.
- Third-party integrations.
- Configurable check intervals, timeouts, HTTP methods or expected status codes. Checks are `GET`, 3 seconds, with the classification above.
- Password reset or email verification.
- Account deletion, or profile editing.
- Data retention, or per-service failure thresholds (the threshold is one global setting).

## License

No license is currently included in the repository.
