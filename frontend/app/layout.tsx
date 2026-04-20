import type { Metadata } from "next";
import { DM_Sans, Fraunces, DM_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rady GenAI — Clinical AI Assistant",
  description: "AI-powered clinical assistant for Rady Children's Hospital",
  manifest: "/manifest.json",
  themeColor: "#F7F6F4",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rady GenAI",
  },
  formatDetection: { telephone: true },
  other: { "mobile-web-app-capable": "yes" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${fraunces.variable} ${dmMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto page-enter" style={{ background: "var(--background)" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
