import { CtaLink } from "./CtaLink";
import { HeroInstrument } from "./HeroInstrument";
import { RuleLabel } from "./RuleLabel";
import { WRAP } from "./layout";

const FACTS = ["HTTP GET", "3s timeout", "Every 5 minutes", "History per check"];

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="border-b border-border" aria-labelledby="hero-heading">
      <div className={WRAP}>
        <RuleLabel className="pt-6" left="RUNTIME_HQ" right="HTTP_SERVICE_MONITORING" />

        <div className="grid gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-12 lg:items-end lg:gap-12 lg:pb-20 lg:pt-16">
          <h1
            id="hero-heading"
            className="text-[clamp(2.9rem,8.6vw,9.25rem)] font-black leading-[0.9] tracking-[-0.045em] lg:col-span-8"
          >
            <span className="block">Know when</span>
            <span className="block">your services</span>
            <span className="block text-foreground/30">change.</span>
          </h1>

          <div className="lg:col-span-4 lg:pb-3">
            <p className="max-w-md text-base leading-relaxed text-foreground/65 lg:text-lg">
              Runtime HQ sends real HTTP requests to your services, records every result, and opens
              an incident when a healthy service starts failing.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <CtaLink href="/dashboard" arrow className="h-11">
                  Open Dashboard
                </CtaLink>
              ) : (
                <>
                  <CtaLink href="/register" arrow className="h-11">
                    Get started
                  </CtaLink>
                  <CtaLink href="/login" variant="secondary" className="h-11">
                    Sign in
                  </CtaLink>
                </>
              )}
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-1.5">
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
        </div>

        <HeroInstrument />
      </div>
    </section>
  );
}
