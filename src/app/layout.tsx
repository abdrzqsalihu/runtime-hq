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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
  },
  title: {
    default: "Runtime HQ — HTTP service monitoring with automatic incidents",
    template: "%s | Runtime HQ",
  },
  description:
    "Runtime HQ runs real HTTP checks against your services, records latency and status history, and opens an incident automatically when a service starts failing.",
};

// Runs before first paint so the saved theme is applied without a dark-to-light flash
const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t)}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
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
