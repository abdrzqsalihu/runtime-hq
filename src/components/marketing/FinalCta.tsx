import { CtaLink } from "./CtaLink";

export function FinalCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="border-b border-border" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <h2
            id="cta-heading"
            className="text-3xl font-black leading-tight tracking-tighter text-foreground sm:text-4xl"
          >
            Know what your services are doing.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-foreground/60 sm:text-base">
            Add an endpoint and see its first real check result.
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
        </div>
      </div>
    </section>
  );
}
