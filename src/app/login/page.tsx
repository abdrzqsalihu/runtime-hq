"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Shield, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn.email({
        email,
        password,
        callbackURL: "/",
      }, {
        onSuccess: () => {
          window.location.href = "/";
        },
        onError: (ctx) => {
          setError(ctx.error.message || "Authentication failed");
        }
      });
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Authentication_Required</span>
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">Access_Terminal</h1>
        <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest leading-relaxed">
          Provide credentials to establish a secure connection to the control plane.
        </p>
      </div>

      {/* Auth Options */}
      <div className="space-y-6">
        {/* Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          {error && (
            <div className="p-3 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <Shield className="w-4 h-4 text-error/60" />
              <p className="text-[10px] font-bold text-error/80 uppercase tracking-widest">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">Operator_Identity (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@organization.com"
                  className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3.5 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50">Access_Key (Password)</label>
                <Link href="#" className="text-[8px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors">Recover_Key?</Link>
              </div>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3.5 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-3.5 h-3.5 border border-border rounded-[2px] bg-foreground/[0.03] peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-black rounded-[1px] opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-foreground/60 transition-colors">Persistent_Session</span>
            </label>
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
                Authorize_Access
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-[8px] font-black uppercase tracking-[0.3em] text-foreground/20 italic">Alternative_Auth_Nodes</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 h-11 border border-border bg-foreground/[0.01] hover:bg-foreground/[0.03] rounded-sm transition-all cursor-pointer group active:scale-[0.98]">
            <svg className="w-4 h-4 fill-foreground/60 group-hover:fill-foreground transition-colors" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-foreground/80 transition-colors">GitHub_Node</span>
          </button>
          <button className="flex items-center justify-center gap-2 h-11 border border-border bg-foreground/[0.01] hover:bg-foreground/[0.03] rounded-sm transition-all cursor-pointer group active:scale-[0.98]">
            <svg className="w-3.5 h-3.5 fill-foreground/60 group-hover:fill-foreground transition-colors" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.4-1.2 1.2-3.08 2.4-6.44 2.4-5.52 0-9.84-4.44-9.84-9.84s4.32-9.84 9.84-9.84c3.08 0 5.36 1.2 7.04 2.8l2.32-2.32C19.16 1.92 16.12 0 12.48 0 5.64 0 0 5.64 0 12.48s5.64 12.48 12.48 12.48c3.68 0 6.72-1.2 9.08-3.6 2.44-2.44 3.12-5.88 3.12-8.56 0-.6-.08-1.2-.16-1.88h-12.04z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-foreground/80 transition-colors">Google_Node</span>
          </button>
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 text-center border-t border-border/60">
        <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
          New to the Control Plane?{" "}
          <Link href="/register" className="text-accent hover:text-accent/80 transition-colors ml-1">Initialize_New_Account</Link>
        </p>
      </div>
    </div>
  );
}
