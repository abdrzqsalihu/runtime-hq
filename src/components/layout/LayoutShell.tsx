"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [navOpen, setNavOpen] = useState(false);

    // Define routes that should not have the dashboard shell
    const isPublicRoute =
        pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/register");

    if (isPublicRoute) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-full w-full">
            <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                <TopBar onOpenMenu={() => setNavOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
                    {children}
                </main>
            </div>
        </div>
    );
}
