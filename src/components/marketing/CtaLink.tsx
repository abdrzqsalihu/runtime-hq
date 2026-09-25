import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CtaLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function CtaLink({
  href,
  children,
  variant = "primary",
  arrow = false,
  className,
  onClick,
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-sm px-5 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
        variant === "primary"
          ? "bg-accent text-black hover:bg-accent/80"
          : "border border-border text-foreground/70 hover:border-accent/40 hover:bg-accent/5 hover:text-accent",
        className,
      )}
    >
      {children}
      {arrow && <ArrowRight className="h-3.5 w-3.5" />}
    </Link>
  );
}
