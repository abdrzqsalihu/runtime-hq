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


## License

No license is currently included in the repository.
