import Link from "next/link";
import { BrandMark } from "./BrandMark";

const linkClass =
  "text-[10px] font-black uppercase tracking-widest text-foreground/50 transition-colors hover:text-accent";

export function MarketingFooter({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-5 py-10 sm:px-8 lg:px-14 md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
          <a href="#features" className={linkClass}>
            Features
          </a>
          <a href="#how-it-works" className={linkClass}>
            How it works
          </a>
          {isAuthenticated ? (
            <Link href="/dashboard" className={linkClass}>
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Sign in
              </Link>
              <Link href="/register" className={linkClass}>
                Get started
              </Link>
            </>
          )}
        </nav>
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
          © {new Date().getFullYear()} Runtime HQ
        </p>
      </div>
    </footer>
  );
}
