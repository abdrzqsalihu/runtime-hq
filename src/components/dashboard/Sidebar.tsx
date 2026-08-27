"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  AlertCircle,
  Settings,
  Cpu,
  Database,
  ShieldCheck,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Control Center", href: "/" },
  { icon: Server, label: "Monitored Services", href: "/services" },
  { icon: AlertCircle, label: "Incident History", href: "/incidents" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("SESSION_TERMINATED", "Your Runtime HQ session has been closed.");
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <div className="w-60 border-r border-border bg-background flex flex-col h-screen sticky top-0 z-20">
      <div className="p-6 mb-2 flex items-center gap-3">
        <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center">
          <Cpu className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="text-xs font-black tracking-[0.3em] uppercase text-foreground/90">RUNTIME HQ</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        <div className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">System Navigation</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all duration-75 border-l-2 cursor-pointer",
                isActive
                  ? "bg-accent/5 text-accent border-accent"
                  : "text-foreground/50 hover:text-foreground/90 hover:bg-foreground/[0.03] border-transparent"
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-accent" : "text-foreground/40")} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-8 px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">Active Clusters</div>
        {[
          { label: "US-EAST-PRIMARY", status: "success" },
          { label: "EU-WEST-SECONDARY", status: "success" },
          { label: "AP-SOUTH-NODE", status: "warning" },
        ].map((cluster) => (
          <div key={cluster.label} className="flex items-center justify-between px-3 py-1.5 group cursor-pointer hover:bg-foreground/[0.02] rounded-sm transition-all">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-foreground/30 group-hover:text-foreground/60" />
              <span className="text-[9px] font-bold text-foreground/40 group-hover:text-foreground/70 uppercase tracking-tighter">{cluster.label}</span>
            </div>
            <div className={cn("w-1 h-1 rounded-full", cluster.status === "success" ? "bg-success" : "bg-warning")} />
          </div>
        ))}
      </nav>

      <div className="p-4 bg-foreground/[0.01] border-t border-border space-y-2">
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-7 h-7 rounded-sm bg-accent/20 flex items-center justify-center text-[9px] font-black text-accent border border-accent/20 shrink-0">
              {session?.user?.name?.slice(0, 2).toUpperCase() || "OP"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-foreground/80 truncate uppercase tracking-tighter">
                {session?.user?.name || "system_root"}
              </span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-2.5 h-2.5 text-success" />
                <span className="text-[8px] font-bold text-success/60 uppercase tracking-widest">Verified Access</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 hover:bg-error/10 hover:text-error text-foreground/30 rounded-sm transition-all cursor-pointer"
            title="Terminate Session"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
