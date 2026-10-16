"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Shield } from "lucide-react";

const MIN_LENGTH = 8;

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">
        {label}
      </label>
      <div className="relative group">
        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={MIN_LENGTH}
          autoComplete={autoComplete}
          placeholder="••••••••••••"
          className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-11 py-3.5 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/20 hover:text-foreground/60 transition-colors cursor-pointer"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !token) return;
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 429) {
          setError("Too many attempts. Wait a few minutes and try again.");
        } else if (data?.code === "INVALID_TOKEN" || res.status === 400) {
          setTokenRejected(true);
        } else {
          setError(data?.message || "Something went wrong. Try again.");
        }
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || tokenRejected) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-3.5 h-3.5 text-warning" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-warning">
              Link_Invalid
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic">
            Reset_Link_Expired
          </h1>
          <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest leading-relaxed">
            This password reset link is invalid, expired, or has already been used. Request a new one below.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="w-full bg-accent text-black h-12 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(167,139,250,0.15)]"
        >
          Request_New_Link
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="pt-4 text-center border-t border-border/60">
          <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
            <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-success">
              Password_Updated
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic">
            All_Set
          </h1>
          <p role="status" className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest leading-relaxed">
            Your password has been changed. Any other active sessions have been signed out. Sign in with your new password.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full bg-accent text-black h-12 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer"
        >
          Continue_To_Sign_In
          <ArrowRight className="w-4 h-4" />
        </button>
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
          New_Password
        </h1>
        <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest leading-relaxed">
          Choose a new password. At least {MIN_LENGTH} characters.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="p-3 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <Shield className="w-4 h-4 text-error/60 shrink-0" />
            <p className="text-[10px] font-bold text-error/80 uppercase tracking-widest">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <PasswordField
            id="reset-password"
            label="New Password"
            value={password}
            onChange={setPassword}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
            autoComplete="new-password"
          />
          <PasswordField
            id="reset-confirm-password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
            autoComplete="new-password"
          />
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
              Update_Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 text-center border-t border-border/60">
        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
