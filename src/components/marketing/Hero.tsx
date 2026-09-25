import { CtaLink } from "./CtaLink";
import { ProductPreview } from "./ProductPreview";

const FACTS = [
  "HTTP GET checks",
  "3-second timeout",
  "Checked every 5 minutes",
  "History stored per check",
];

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
              HTTP_Service_Monitoring
            </span>
          </div>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
            Every check recorded.
            <br />
            Every failure an incident.
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-foreground/60 sm:text-base">
            Runtime HQ sends real HTTP requests to your services, records the status and latency of
            each check, and opens an incident automatically when a healthy service starts failing.
            When it recovers, the incident resolves and the history stays.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
              <CtaLink href="/dashboard" arrow>
                Open Dashboard
              </CtaLink>
            ) : (
              <>
                <CtaLink href="/register" arrow>
                  Get started
                </CtaLink>
                <CtaLink href="/login" variant="secondary">
                  Sign in
                </CtaLink>
              </>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {FACTS.map((fact) => (
              <li
                key={fact}
                className="text-[10px] font-black uppercase tracking-widest text-foreground/40"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 sm:mt-16">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
