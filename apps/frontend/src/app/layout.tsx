import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/ekvaar/query-provider";
import { AuthProvider } from "@/components/ekvaar/auth-provider";
import { ErrorBoundary } from "@/components/ekvaar/error-boundary";
import { Suspense } from "react";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://app.commerce.abata.tech"),
  title: "Commerce OS — Your company, finally in sync",
  description: "An AI-native operating system where people, AI teammates, knowledge, workflows and connected apps work together.",
  keywords: ["AI business operating system", "AI teammates", "workflow automation", "company knowledge", "founder workspace"],
  authors: [{ name: "ABATA" }],
  openGraph: {
    title: "Commerce OS — Your company, finally in sync",
    description: "People, AI teammates, knowledge, workflows and connected apps—operating together in one accountable workspace.",
    type: "website",
    siteName: "Commerce OS",
  },
  twitter: {
    card: "summary",
    title: "Commerce OS — Your company, finally in sync",
    description: "An AI-native operating system for the company you are building.",
  },
  icons: {
    icon: "/branding/monogram.png",
  },
  verification: {
    google: "oJ4HPFEsh4WS_xVfuy616putgA6xDHw_rDh_Z_Agshw",
  },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <QueryProvider>
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                {children}
              </Suspense>
            </ErrorBoundary>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
