import { appUrl } from "./config";
import { escapeHtml } from "./telegram";
import type { EventPayload, IncidentPayload } from "./types";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COLORS = { bg: "#070a12", surface: "#0e1420", text: "#f3f4f6", muted: "#9ca3af", accent: "#a78bfa", down: "#ef4444", up: "#10b981", border: "#1f2937" };

export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rest}s`;
  return `${rest}s`;
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const serviceNames = (p: IncidentPayload) => (p.services.length ? p.services.map((s) => s.name).join(", ") : p.title);
export const incidentLink = (id: string) => `${appUrl()}/incidents/${id}`;

function layout(opts: { banner: string; bannerColor: string; heading: string; rows: Array<[string, string]>; cta?: { label: string; href: string }; footer: string }): string {
  const rows = opts.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-top:1px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;letter-spacing:.08em;text-transform:uppercase;width:130px;vertical-align:top">${escapeHtml(k)}</td><td style="padding:10px 0;border-top:1px solid ${COLORS.border};color:${COLORS.text};font-size:14px;word-break:break-word">${v}</td></tr>`,
    )
    .join("");
  const cta = opts.cta
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:${COLORS.accent};color:#070a12;text-decoration:none;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:12px 20px;border-radius:4px">${escapeHtml(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.bg}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Inter,Segoe UI,Arial,sans-serif"><tr><td style="padding:0 0 18px;color:${COLORS.text};font-weight:900;font-size:13px;letter-spacing:.3em;text-transform:uppercase">Runtime HQ</td></tr><tr><td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:6px;padding:28px"><p style="margin:0 0 14px"><span style="display:inline-block;background:${opts.bannerColor};color:#070a12;font-weight:900;font-size:11px;letter-spacing:.16em;text-transform:uppercase;padding:5px 10px;border-radius:3px">${escapeHtml(opts.banner)}</span></p><h1 style="margin:0 0 20px;color:${COLORS.text};font-size:22px;line-height:1.25">${opts.heading}</h1><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${cta}</td></tr><tr><td style="padding:18px 4px 0;color:${COLORS.muted};font-size:12px;line-height:1.5">${opts.footer}</td></tr></table></td></tr></table></body></html>`;
}

const footerHtml = () => `You're receiving this because email alerts are enabled in <a href="${escapeHtml(appUrl())}/settings" style="color:${COLORS.accent}">Runtime HQ settings</a>.`;
const footerText = () => `You're receiving this because email alerts are enabled in Runtime HQ settings: ${appUrl()}/settings`;

export function renderEmail(type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED" | "TEST", payload: EventPayload): RenderedEmail {
  if (type === "TEST" || payload.kind === "test") {
    return {
      subject: "Runtime HQ test notification",
      html: layout({ banner: "Test", bannerColor: COLORS.accent, heading: "Email alerts are working", rows: [["Channel", "Email"]], footer: footerHtml() }),
      text: `Runtime HQ test notification\n\nEmail alerts are working.\n\n${footerText()}`,
    };
  }

  const p = payload;
  const names = serviceNames(p);
  const link = incidentLink(p.incidentId);
  const serviceRows: Array<[string, string]> = p.services.length
    ? [["Service", p.services.map((s) => `<strong>${escapeHtml(s.name)}</strong>`).join("<br>")], ["URL", p.services.map((s) => escapeHtml(s.url)).join("<br>")]]
    : [];

  if (type === "INCIDENT_OPENED") {
    return {
      subject: oneLine(`[Runtime HQ] Service down: ${names}`),
      html: layout({
        banner: "Service down",
        bannerColor: COLORS.down,
        heading: `${escapeHtml(names)} is down`,
        rows: [...serviceRows, ["Incident", escapeHtml(p.title)], ["Severity", escapeHtml(p.severity)], ["Status", "Investigating"], ["Started", escapeHtml(formatUtc(p.startedAt))]],
        cta: { label: "View incident", href: link },
        footer: footerHtml(),
      }),
      text: [`SERVICE DOWN: ${names}`, "", ...p.services.map((s) => `${s.name} — ${s.url}`), `Incident: ${p.title}`, `Severity: ${p.severity}`, `Status: Investigating`, `Started: ${formatUtc(p.startedAt)}`, "", `View incident: ${link}`, "", footerText()].join("\n"),
    };
  }

  const duration = p.durationSeconds !== undefined ? formatDuration(p.durationSeconds) : null;
  return {
    subject: oneLine(`[Runtime HQ] Recovered: ${names}`),
    html: layout({
      banner: "Recovered",
      bannerColor: COLORS.up,
      heading: `${escapeHtml(names)} has recovered`,
      rows: [...serviceRows, ["Incident", escapeHtml(p.title)], ["Status", "Resolved"], ["Started", escapeHtml(formatUtc(p.startedAt))], ["Resolved", escapeHtml(formatUtc(p.resolvedAt ?? p.occurredAt))], ...(duration ? ([["Duration", escapeHtml(duration)]] as Array<[string, string]>) : [])],
      cta: { label: "View incident", href: link },
      footer: footerHtml(),
    }),
    text: [`RECOVERED: ${names}`, "", ...p.services.map((s) => `${s.name} — ${s.url}`), `Incident: ${p.title}`, `Status: Resolved`, `Started: ${formatUtc(p.startedAt)}`, `Resolved: ${formatUtc(p.resolvedAt ?? p.occurredAt)}`, ...(duration ? [`Duration: ${duration}`] : []), "", `View incident: ${link}`, "", footerText()].join("\n"),
  };
}

export function renderTelegram(type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED" | "TEST", payload: EventPayload): string {
  if (type === "TEST" || payload.kind === "test") {
    return "✅ <b>Runtime HQ test notification</b>\nTelegram alerts are working.";
  }
  const p = payload;
  const names = escapeHtml(serviceNames(p));
  const urls = p.services.map((s) => escapeHtml(s.url)).join("\n");
  const link = `<a href="${escapeHtml(incidentLink(p.incidentId))}">View incident</a>`;

  if (type === "INCIDENT_OPENED") {
    return [`🔴 <b>Service down</b>`, `<b>${names}</b>`, urls, `Severity: ${escapeHtml(p.severity)}`, `Started: ${escapeHtml(formatUtc(p.startedAt))}`, link].filter(Boolean).join("\n");
  }
  const duration = p.durationSeconds !== undefined ? `Duration: ${escapeHtml(formatDuration(p.durationSeconds))}` : "";
  return [`🟢 <b>Recovered</b>`, `<b>${names}</b>`, urls, `Resolved: ${escapeHtml(formatUtc(p.resolvedAt ?? p.occurredAt))}`, duration, link].filter(Boolean).join("\n");
}

export function renderVerificationEmail(confirmUrl: string): RenderedEmail {
  return {
    subject: "Confirm your Runtime HQ notification email",
    html: layout({
      banner: "Confirm email",
      bannerColor: COLORS.accent,
      heading: "Confirm this address for alerts",
      rows: [["Why", "Someone asked to send Runtime HQ incident alerts to this address."], ["Expires", "In 60 minutes"]],
      cta: { label: "Confirm email", href: confirmUrl },
      footer: "If you didn't request this, ignore this email — no alerts will be sent to this address.",
    }),
    text: `Confirm your Runtime HQ notification email\n\nOpen this link while signed in to Runtime HQ (expires in 60 minutes):\n${confirmUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}
