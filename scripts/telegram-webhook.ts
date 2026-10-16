/**
 * Register (or inspect / remove) the Telegram webhook for the bot.
 *
 *   pnpm telegram:webhook            register  <NEXT_PUBLIC_APP_URL>/api/telegram/webhook
 *   pnpm telegram:webhook -- --info  show what Telegram currently has registered
 *   pnpm telegram:webhook -- --delete  remove the webhook
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_APP_URL from the environment (.env).
 * Telegram only delivers webhooks to a public HTTPS URL; for local development expose your dev server
 * with a tunnel and set NEXT_PUBLIC_APP_URL to the tunnel URL before running this.
 */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
const base = (process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org").replace(/\/+$/, "");

async function call(method: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${base}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; result?: unknown; description?: string };
}

async function main() {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const args = process.argv.slice(2);

  if (args.includes("--info")) {
    const info = await call("getWebhookInfo");
    console.log(JSON.stringify(info.result ?? info, null, 2));
    return;
  }
  if (args.includes("--delete")) {
    const res = await call("deleteWebhook");
    console.log(res.ok ? "Webhook removed." : `Failed: ${res.description}`);
    return;
  }

  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set (1-256 characters: A-Z a-z 0-9 _ -)");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) throw new Error("TELEGRAM_WEBHOOK_SECRET may only contain A-Z a-z 0-9 _ -");
  if (!appUrl.startsWith("https://")) throw new Error("NEXT_PUBLIC_APP_URL must be a public https:// URL for Telegram webhooks");

  const url = `${appUrl}/api/telegram/webhook`;
  const res = await call("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "my_chat_member"] });
  console.log(res.ok ? `Webhook registered: ${url}` : `Failed: ${res.description}`);
  if (!res.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
