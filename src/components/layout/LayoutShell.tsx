"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Define routes that should not have the dashboard shell
    const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/register");

    if (isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-full w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    {children}
                </main>
            </div>
        </div>
    );
}
