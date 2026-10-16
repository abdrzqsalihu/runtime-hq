# Alerts and notifications

Runtime HQ sends a **service-down** alert when an incident opens and a **recovered** notice when it resolves, over **Telegram** and **email (Brevo)**. Each user chooses their own channels in **Settings → Notifications**.

## How it works

```text
check recorded → incident opens/resolves (one DB transaction, row-locked per service)
              → NotificationEvent + one NotificationDelivery per enabled channel (the outbox)
              → worker claims due deliveries (FOR UPDATE SKIP LOCKED) → Telegram / Brevo
              → SENT (provider accepted) → DELIVERED / FAILED (Brevo webhook, email only)
```

- **Threshold.** An incident opens after `INCIDENT_FAILURE_THRESHOLD` consecutive failed checks (default 2, range 1–10). One transient failure does not alert.
- **No duplicates.** Each (incident, cycle, opened|resolved) has a unique idempotency key. Repeated failing checks, overlapping cron runs, and concurrent workers cannot create a second alert or send one twice.
- **Reopening.** Reopening a resolved automatic incident starts a new cycle and sends a new alert.
- **Recovery rules.** A recovery notice is only created if an alert was created for the same cycle, and per channel it waits for that channel's alert and is skipped if the alert never reached the user.
- **Scope.** Alerts are sent for incidents opened by the monitoring engine. Manually declared incidents, and incidents closed because their service was deleted, do not notify.
- **Retries.** Transient failures (timeouts, 429, 5xx) retry with exponential backoff (~1, 2, 4, 8 min, jittered) up to 5 attempts. Permanent failures (blocked bot, bad sender, rejected recipient) are not retried. Alerts older than 6 hours are dropped. Channels fail independently.
- **Monitoring is independent.** Checks and incidents are committed before any provider is contacted. A provider outage only delays notifications.

## Setup

### 1. Telegram bot
1. In Telegram, message **@BotFather** → `/newbot`, choose a name and username, copy the token → `TELEGRAM_BOT_TOKEN`.
2. Generate a secret (`openssl rand -hex 32`) → `TELEGRAM_WEBHOOK_SECRET` (only `A-Z a-z 0-9 _ -`).
3. Deploy the app with `NEXT_PUBLIC_APP_URL` set to its public **https** URL, then register the webhook:
   ```bash
   pnpm telegram:webhook            # sets <NEXT_PUBLIC_APP_URL>/api/telegram/webhook
   pnpm telegram:webhook -- --info  # shows what Telegram has registered
   ```
   Telegram only calls public HTTPS URLs. For local testing, expose your dev server with a tunnel and use the tunnel URL as `NEXT_PUBLIC_APP_URL` before running the command.

Linking: the user presses **Connect Telegram**, the server creates a 15-minute single-use token bound to their account and returns a `t.me/<bot>?start=<token>` link. When they press **Start**, Telegram calls the webhook (verified with the secret header), the token is consumed atomically, and the chat is attached to that account. The browser never supplies a chat id. `/stop` in the chat disconnects it.

### 2. Brevo
1. Create an account at brevo.com → **SMTP & API → API Keys** → generate a key → `BREVO_API_KEY`.
2. **Senders, domains & dedicated IPs → Senders** (or Domains): add and **verify** the sender address you will use → `BREVO_SENDER_EMAIL`; display name → `BREVO_SENDER_NAME`. Mail from an unverified sender is rejected (the settings page will say so).
3. Optional, for real delivery/bounce status: **Transactional → Settings → Webhook** → add `https://<your-domain>/api/brevo/webhook?secret=<BREVO_WEBHOOK_SECRET>` and tick *Delivered*, *Hard bounce*, *Soft bounce*, *Blocked*, *Invalid email*, *Spam*, *Error*. Brevo does not sign webhooks, so the shared secret is the protection; without `BREVO_WEBHOOK_SECRET` the endpoint is disabled and email stays at **Sent** (provider accepted) instead of **Delivered**.

Email addresses must be confirmed: the user enters an address, we email a single-use link (valid 60 minutes), and alerts only go to confirmed addresses. The link opens `/settings?confirm_email=<token>` and must be opened while signed in as the same account.

### 3. Environment
Copy `.env.example` → `.env` (or set the variables in your host). New variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, optional `BREVO_WEBHOOK_SECRET`, optional `INCIDENT_FAILURE_THRESHOLD`. Existing `NEXT_PUBLIC_APP_URL` is used for dashboard links in messages. `TELEGRAM_API_BASE_URL` / `BREVO_API_BASE_URL` exist only to point at a fake provider in tests.

### 4. Database
The project uses `prisma db push`. After pulling this change run:
```bash
pnpm db:push
```
It adds `NotificationSettings`, `NotificationToken`, `NotificationEvent`, `NotificationDelivery` and `Incident.notifyCycle` (additive; nothing is dropped).

### 5. Scheduler
Notifications are delivered by the same external scheduler that runs checks. `POST /api/cron/check-services` already delivers due notifications at the end of each run. Retries happen on the next run, so with a 5-minute schedule a retry is up to ~5 minutes late. For faster retries add a second scheduled job (e.g. every minute):
```bash
curl -X POST https://<your-domain>/api/cron/process-notifications -H "Authorization: Bearer $CRON_SECRET"
```
Manual checks also deliver anything they queue right after the response (`after()`).

## Testing it yourself
1. Settings → Notifications → connect Telegram, confirm an email, press **Send test** on each (limited to one per minute per channel).
2. Add a service pointing at a URL that fails, e.g. `https://does-not-exist.invalid`, and run two checks (or wait for two scheduled runs) → one down alert per channel.
3. Change the URL to a working one and check again → one recovery notice per channel with the duration.
4. **Recent deliveries** on the settings page shows each message's status and failure reason.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| "Telegram alerts aren't available" | `TELEGRAM_BOT_TOKEN` or `TELEGRAM_WEBHOOK_SECRET` missing. |
| Pressing Start does nothing | Webhook not registered, wrong `NEXT_PUBLIC_APP_URL`, or secret mismatch. Run `pnpm telegram:webhook -- --info` (check `url`, `last_error_message`). |
| Status "Needs reconnect" | You blocked the bot or the chat no longer exists. Unblock the bot, press **Reconnect**. |
| "sender is not verified" | `BREVO_SENDER_EMAIL` isn't a verified sender/domain in Brevo. |
| Email stays "Sent", never "Delivered" | Brevo webhook not configured (optional), or mail is deferred/in spam. |
| Alerts feel late | Retries run on the scheduler cadence; add the `process-notifications` job. |
| No alert after a failure | Fewer than `INCIDENT_FAILURE_THRESHOLD` consecutive failures, an incident is already open, or the channel is off/not confirmed. |
