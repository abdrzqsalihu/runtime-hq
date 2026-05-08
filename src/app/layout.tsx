import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ThemeProvider } from "@/lib/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Runtime HQ | Unified Service Status Monitor",
  description: "Track the health of all third-party services in one place.",
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
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
