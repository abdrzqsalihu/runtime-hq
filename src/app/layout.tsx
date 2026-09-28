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

const siteTitle = "Runtime HQ — HTTP service monitoring with automatic incidents";
const siteDescription =
  "Runtime HQ runs real HTTP checks against your services, records latency and status history, and opens an incident automatically when a service starts failing.";
const shareImage = "/social/runtime-hq-share.png";

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image URLs (and any future canonical URLs) to an absolute
  // production URL, using the same base-URL env var the rest of the app already reads.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://runtime-hq.vercel.app"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
  },
  title: {
    default: siteTitle,
    template: "%s | Runtime HQ",
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "Runtime HQ",
    images: [{ url: shareImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
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
