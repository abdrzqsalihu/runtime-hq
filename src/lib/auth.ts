import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";
import { dash } from "@better-auth/infra";
import { sendBrevoEmail } from "@/lib/notifications/brevo";
import { appUrl } from "@/lib/notifications/config";
import { renderPasswordResetEmail } from "@/lib/notifications/templates";

const RESET_PASSWORD_TOKEN_TTL_SECONDS = 30 * 60;

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_TTL_SECONDS,
        // A changed password invalidates whatever session let someone reach this point.
        revokeSessionsOnPasswordReset: true,
        // The emailed link points at our own reset-password page (not Better Auth's redirect
        // callback route), built from the configured app URL below, never a request header.
        sendResetPassword: async ({ user, token }) => {
            const resetUrl = `${appUrl()}/reset-password?token=${token}`;
            try {
                const outcome = await sendBrevoEmail({ to: user.email, ...renderPasswordResetEmail(resetUrl, RESET_PASSWORD_TOKEN_TTL_SECONDS / 60) });
                if (outcome.kind !== "sent") {
                    // Never throw here: throwing would surface as an error response only for accounts
                    // that exist (a nonexistent email never reaches this callback), which would leak
                    // account existence through response shape. Log and let the route's neutral
                    // response stand either way.
                    console.error("Password reset email was not accepted by the provider", outcome.code);
                }
            } catch (err) {
                console.error("Password reset email failed to send", err instanceof Error ? err.name : "error");
            }
        },
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 100,
        customRules: {
            // Requesting a reset and submitting a token are the sensitive, abusable operations here.
            "/request-password-reset": { window: 15 * 60, max: 5 },
            "/reset-password": { window: 15 * 60, max: 10 },
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        },
        github: {
            clientId: process.env.GITHUB_OAUTH_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || "",
        },
    },
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
        dash()
    ]
});
