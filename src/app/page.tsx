import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MotionStyles } from "@/components/marketing/MotionStyles";
import { Hero } from "@/components/marketing/Hero";
import { Evidence } from "@/components/marketing/Evidence";
import { Lifecycle } from "@/components/marketing/Lifecycle";
import { Capabilities } from "@/components/marketing/Capabilities";
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
      <MotionStyles />
      <MarketingNav isAuthenticated={isAuthenticated} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <Evidence />
        <Lifecycle />
        <Capabilities />
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>
      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
