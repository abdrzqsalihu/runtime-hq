"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, User, KeyRound, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { signUp, signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/use-toast";
import { GithubIcon, GoogleIcon } from "@/components/BrandIcons";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOAuthLoading] = useState<"google" | "github" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const toast = useToast();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (loading || oauthLoading) return;
        setLoading(true);
        setError(null);

        try {
            await signUp.email({
                email,
                password,
                name,
                callbackURL: "/",
            }, {
                onSuccess: () => {
                    toast.success("AUTHENTICATION_SUCCESS", "Account created and session established.");
                    window.location.href = "/";
                },
                onError: (ctx) => {
                    const message = ctx.error.message || "Registration failed. Please try again.";
                    setError(message);
                    toast.error("AUTHENTICATION_FAILED", message);
                }
            });
        } catch (err) {
            const message = "An unexpected error occurred";
            setError(message);
            toast.error("AUTHENTICATION_FAILED", message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: "google" | "github") => {
        if (loading || oauthLoading) return;
        setOAuthLoading(provider);
        setError(null);

        try {
            await signIn.social({
                provider,
                callbackURL: "/",
            }, {
                onSuccess: () => {
                    toast.success("AUTHENTICATION_SUCCESS", "Session established successfully.");
                },
                onError: (ctx) => {
                    const message = `Unable to complete ${provider} authentication. Please try again.`;
                    setError(message);
                    toast.error("AUTHENTICATION_FAILED", message);
                    setOAuthLoading(null);
                }
            });
        } catch (err) {
            const message = `Unable to connect to ${provider}. Please try again.`;
            setError(message);
            toast.error("AUTHENTICATION_FAILED", message);
            setOAuthLoading(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Create_Account</span>
                </div>
                <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase italic">Get_Started</h1>
                <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest leading-relaxed">
                    Create an account to start monitoring your services.
                </p>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
                <form className="space-y-4" onSubmit={handleRegister}>
                    {error && (
                        <div className="p-3 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                            <Shield className="w-4 h-4 text-error/60" />
                            <p className="text-[10px] font-bold text-error/80 uppercase tracking-widest">{error}</p>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">Full_Name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Your name"
                                className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3.5 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">Password</label>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground/50 ml-1">Confirm_Password</label>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-accent transition-colors" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3 text-[11px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground placeholder:text-foreground/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <p className="text-[8px] font-medium text-foreground/30 uppercase tracking-widest leading-relaxed mb-4">
                            By creating an account, you agree to the <span className="text-foreground/60 cursor-pointer hover:text-accent transition-colors underline">Terms_of_Service</span> and <span className="text-foreground/60 cursor-pointer hover:text-accent transition-colors underline">Privacy_Policy</span>.
                        </p>
                        <button
                            type="submit"
                            disabled={loading || oauthLoading !== null}
                            className="w-full bg-accent text-black h-12 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Create_Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Divider */}
                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/60"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-background px-4 text-[8px] font-black uppercase tracking-[0.3em] text-foreground/20 italic">Or_Sign_Up_With</span>
                    </div>
                </div>

                {/* OAuth Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleOAuth("github")}
                        disabled={loading || oauthLoading !== null}
                        className="flex items-center justify-center gap-2 h-11 border border-border bg-foreground/[0.01] hover:bg-foreground/[0.03] rounded-sm transition-all cursor-pointer group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {oauthLoading === "github" ? (
                            <Loader2 className="w-4 h-4 animate-spin text-foreground/60" />
                        ) : (
                            <GithubIcon className="w-4 h-4 text-foreground/60 group-hover:text-foreground transition-colors" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-foreground/80 transition-colors">
                            {oauthLoading === "github" ? "Connecting..." : "GitHub"}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOAuth("google")}
                        disabled={loading || oauthLoading !== null}
                        className="flex items-center justify-center gap-2 h-11 border border-border bg-foreground/[0.01] hover:bg-foreground/[0.03] rounded-sm transition-all cursor-pointer group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {oauthLoading === "google" ? (
                            <Loader2 className="w-4 h-4 animate-spin text-foreground/60" />
                        ) : (
                            <GoogleIcon className="w-3.5 h-3.5 text-foreground/60 group-hover:text-foreground transition-colors" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 group-hover:text-foreground/80 transition-colors">
                            {oauthLoading === "google" ? "Connecting..." : "Google"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Footer Link */}
            <div className="pt-4 text-center border-t border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground/30">
                    Already have an account?{" "}
                    <Link href="/login" className="text-accent hover:text-accent/80 transition-colors ml-1">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
