import { prisma } from "@/lib/db";
import { normalizeMessageId } from "./brevo";
import { consumeTelegramLinkToken, maskedEmailForUser, setTelegramChatReachable, unlinkTelegramChat } from "./settings";
import { escapeHtml, sendTelegramMessage, type TelegramUpdate } from "./telegram";

const reply = (chatId: number | string, text: string) => sendTelegramMessage(String(chatId), text).catch(() => undefined);

/**
 * Handle one Telegram update (already authenticated by the webhook secret).
 * Only three things matter: `/start <token>` links an account, `/stop` unlinks, and a
 * `my_chat_member` update tells us the user blocked or unblocked the bot.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const member = update.my_chat_member;
  if (member && member.chat.type === "private") {
    const status = member.new_chat_member?.status;
    if (status === "kicked") await setTelegramChatReachable(String(member.chat.id), false);
    if (status === "member") await setTelegramChatReachable(String(member.chat.id), true);
    return;
  }

  const message = update.message;
  if (!message?.text) return;
  const text = message.text.trim();
  const chat = message.chat;

  const start = /^\/start(?:@\w+)?(?:\s+(\S+))?$/.exec(text);
  if (start) {
    const token = start[1];
    if (!token) {
      await reply(chat.id, "👋 To connect Runtime HQ, open <b>Settings → Notifications</b> in the app and press <b>Connect Telegram</b>.");
      return;
    }
    const displayName = message.from?.username ? `@${message.from.username}` : message.from?.first_name;
    const result = await consumeTelegramLinkToken(token, { id: chat.id, type: chat.type, displayName });
    if (result.ok) {
      const who = await maskedEmailForUser(result.userId);
      await reply(chat.id, `✅ <b>Telegram connected</b>\nLinked to Runtime HQ account <b>${escapeHtml(who)}</b>. You'll get alerts here when a service goes down or recovers.\nSend /stop to disconnect.`);
    } else if (result.reason === "CHAT_IN_USE") {
      await reply(chat.id, "This Telegram chat is already connected to another Runtime HQ account. Send /stop here first, then try again.");
    } else if (result.reason === "PRIVATE_CHAT_ONLY") {
      await reply(chat.id, "Runtime HQ alerts can only be connected from a private chat with the bot.");
    } else {
      await reply(chat.id, "That link is invalid or has expired. Generate a new one from <b>Settings → Notifications</b>.");
    }
    return;
  }

  if (/^\/stop(?:@\w+)?$/.test(text) && chat.type === "private") {
    await unlinkTelegramChat(String(chat.id));
    await reply(chat.id, "Disconnected. You won't receive Runtime HQ alerts here anymore.");
  }
}

interface BrevoEvent {
  event?: string;
  "message-id"?: string;
  reason?: string;
}

const DELIVERED = new Set(["delivered"]);
const BOUNCED = new Set(["hard_bounce", "blocked", "invalid_email", "spam", "error"]);

/**
 * Apply a Brevo transactional webhook event to the matching delivery.
 * "delivered" confirms receipt by the recipient's mail server; bounces mark the delivery failed.
 * Opens, clicks and deferrals only update the provider status text.
 */
export async function handleBrevoEvent(body: BrevoEvent): Promise<{ matched: boolean }> {
  const event = body.event;
  const rawId = body["message-id"];
  if (!event || !rawId) return { matched: false };

  const messageId = normalizeMessageId(rawId);
  const delivery = await prisma.notificationDelivery.findFirst({ where: { channel: "EMAIL", providerMessageId: messageId }, select: { id: true, status: true } });
  if (!delivery) return { matched: false };

  if (DELIVERED.has(event)) {
    await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date(), providerStatus: event } });
  } else if (BOUNCED.has(event)) {
    await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", providerStatus: event, lastError: "EMAIL_RECIPIENT_INVALID" } });
  } else if (delivery.status === "SENT") {
    await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { providerStatus: event } });
  }
  return { matched: true };
}
