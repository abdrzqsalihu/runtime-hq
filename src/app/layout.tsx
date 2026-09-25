import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { LayoutShell } from "@/components/layout/LayoutShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Runtime HQ — HTTP service monitoring with automatic incidents",
    template: "%s | Runtime HQ",
  },
  description:
    "Runtime HQ runs real HTTP checks against your services, records latency and status history, and opens an incident automatically when a service starts failing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <body className="flex h-full bg-background text-foreground transition-colors duration-200 selection:bg-accent/30">
        <ThemeProvider>
          <ToastProvider>
            <LayoutShell>
              {children}
            </LayoutShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
