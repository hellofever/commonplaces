import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const generalSans = localFont({
  src: [
    { path: "../public/fonts/GeneralSans-Variable.woff2", weight: "200 700", style: "normal" },
    { path: "../public/fonts/GeneralSans-VariableItalic.woff2", weight: "200 700", style: "italic" },
  ],
  variable: "--font-general-sans",
});

const clashDisplay = localFont({
  src: "../public/fonts/ClashDisplay-Semibold.woff2",
  variable: "--font-clash-display",
  weight: "600",
});

export const metadata: Metadata = {
  title: "Commonplaces",
  description: "Our favourite restaurants, on a map.",
};

// Page-wide pinch/double-tap zoom stays enabled (userScalable/maximumScale used to
// disable it here, but that fights iOS Safari's own viewport math badly enough to
// break fixed-position layout elsewhere on the page -- see MapView's `touch-none` on
// the map div for the scoped replacement). viewportFit "cover" opts the page into
// rendering under the notch/Dynamic Island/home-indicator area explicitly, so every
// top/bottom-anchored fixed or sticky element must pad itself with
// env(safe-area-inset-top/bottom) -- see Header, the mobile nav/Settings sheets, and
// MapSearchExpand's overlay bar for the top-inset half of that (bottom-inset padding
// already existed before this).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${clashDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense>
            <AppShell>{children}</AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
