"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { BrandMark } from "./BrandMark";
import { CtaLink } from "./CtaLink";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

const linkClass =
  "text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-colors hover:text-accent";
const iconButtonClass =
  "rounded-sm p-2 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground cursor-pointer";

export function MarketingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className={iconButtonClass}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-12 max-w-[1680px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <BrandMark />

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {themeButton}
          {isAuthenticated ? (
            <CtaLink href="/dashboard" className="h-9">
              Open Dashboard
            </CtaLink>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Sign in
              </Link>
              <CtaLink href="/register" className="h-9">
                Get started
              </CtaLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          {themeButton}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={iconButtonClass}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-border px-5 py-4 md:hidden"
        >
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:text-accent"
              >
                {link.label}
              </a>
            ))}
          </div>
          {isAuthenticated ? (
            <div className="mt-4">
              <CtaLink href="/dashboard" className="w-full">
                Open Dashboard
              </CtaLink>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CtaLink href="/login" variant="secondary">
                Sign in
              </CtaLink>
              <CtaLink href="/register">Get started</CtaLink>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
