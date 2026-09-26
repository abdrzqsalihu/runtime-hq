"use client";

import {
  User,
  Shield,
  Cpu,
  Terminal,
  Moon,
  Sun,
  LogOut,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/lib/use-toast";

export default function SettingsPage() {
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({
      fetchOptions: {
        onError: () => {
          setSigningOut(false);
          toast.error("SIGN_OUT_FAILED", "Could not end the session. Try again.");
        },
        onSuccess: () => {
          toast.success("SESSION_ENDED", "You've been signed out.");
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  const formatDate = (dateInput: string | Date | undefined) => {
    if (!dateInput) return "Unknown";
    try {
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">Account_Settings</h2>
        </div>
        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">Manage your Runtime HQ account</p>
      </div>

      <div className="space-y-4">
        {/* Account Section */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01] flex items-center gap-3">
            <User className="w-3.5 h-3.5 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Account</h3>
          </div>
          <div className="divide-y divide-border/50">
            {/* Display Name */}
            <div className="p-4 sm:p-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Display Name</div>
                <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">Your name in Runtime HQ</p>
              </div>
              <div className="sm:text-right break-all">
                <div className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                  {session?.user?.name || "—"}
                </div>
                <p className="text-[8px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">
                  Read-only
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="p-4 sm:p-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Email Address</div>
                <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">Your account email</p>
              </div>
              <div className="sm:text-right break-all">
                <div className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                  {session?.user?.email || "—"}
                </div>
                <p className="text-[8px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">
                  Read-only
                </p>
              </div>
            </div>

            {/* Account Created */}
            <div className="p-4 sm:p-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Account Created</div>
                <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">When you joined</p>
              </div>
              <div className="sm:text-right break-all">
                <div className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                  {formatDate(session?.user?.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01] flex items-center gap-3">
            <Cpu className="w-3.5 h-3.5 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Appearance</h3>
          </div>
          <div className="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Theme Mode</div>
              <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">Switch between dark and light theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-black hover:border-accent transition-all"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01] flex items-center gap-3">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Security</h3>
          </div>
          <div className="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Session</div>
              <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">Terminate your current session and sign out</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-4 py-2 border border-error/20 text-error rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-error/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {!signingOut && <LogOut className="w-3.5 h-3.5" />}
              {signingOut ? "Signing Out" : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
