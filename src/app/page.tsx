import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Hero } from "@/components/marketing/Hero";
import { EvidenceSection } from "@/components/marketing/EvidenceSection";
import { IncidentLifecycle } from "@/components/marketing/IncidentLifecycle";
import { Capabilities } from "@/components/marketing/Capabilities";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { FinalCta } from "@/components/marketing/FinalCta";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: { absolute: "Runtime HQ — Know what your services are doing" },
  description:
    "Runtime HQ runs real HTTP checks against your services, records latency and status history, and opens an incident automatically when a service starts failing.",
};

async function getIsAuthenticated(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return !!session?.user;
  } catch {
    return false;
  }
}

export default async function LandingPage() {
  const isAuthenticated = await getIsAuthenticated();

  return (
    <div className="min-h-screen w-full min-w-0 flex-1 bg-background text-foreground">
      <MarketingNav isAuthenticated={isAuthenticated} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <EvidenceSection />
        <IncidentLifecycle />
        <Capabilities />
        <HowItWorks />
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>
      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
