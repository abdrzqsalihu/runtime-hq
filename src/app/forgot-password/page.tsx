"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Shield, Loader2 } from "lucide-react";

// Always the same wording, whether or not the address belongs to an account — the UI must not
// let a visitor distinguish the two cases from what's shown.
const NEUTRAL_MESSAGE = "If an account exists for that email, you'll receive instructions to reset your password.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // The endpoint itself always returns the same success shape regardless of whether the
      // account exists. A non-2xx here means the request was malformed or rate-limited, not that
      // the account was or wasn't found — so the message stays generic either way.
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 429) {
          setError("Too many attempts. Wait a few minutes and try again.");
        } else {
          setError(data?.message || "Something went wrong. Try again.");
        }
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-success">
              Check_Your_Email
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic">
            Instructions_Sent
          </h1>
          <p role="status" className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest leading-relaxed">
            {NEUTRAL_MESSAGE}
          </p>
        </div>
        <Link
          href="/login"
          className="w-full bg-foreground/[0.03] border border-border text-foreground/70 h-12 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-foreground/[0.06] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back_To_Sign_In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">
            Reset_Password
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">
          Forgot_Password
        </h1>
        <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest leading-relaxed">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="p-3 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <Shield className="w-4 h-4 text-error/60 shrink-0" />
            <p className="text-[10px] font-bold text-error/80 uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="forgot-email" className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">
            Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3.5 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-black h-12 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Send_Reset_Link
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 text-center border-t border-border/60">
        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
          Remembered it?{" "}
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors ml-1">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
