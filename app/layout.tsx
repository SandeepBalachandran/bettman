import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/app/SessionProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { PopupManager } from "@/components/PopupManager";
import { QuizFab } from "@/components/QuizFab";
import { ChatFab } from "@/components/ChatFab";
import { DevelopmentBanner } from "@/components/DevelopmentBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Condensed display face for page titles and big scores.
const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Bettman",
  description:
    "Predict results & scorers, climb the leaderboard, and win bragging rights. Join our private football prediction league! ⚽🏆",
  openGraph: {
    title: "Bettman",
    description:
      "Predict results & scorers, climb the leaderboard, and win bragging rights. Join our private football prediction league! ⚽🏆",
    url: appUrl,
    siteName: "Bettman",
    type: "website",
  },
  applicationName: "Bettman",
  // iPhone "Add to Home Screen": open full-screen with the app's name.
  appleWebApp: { capable: true, title: "Bettman", statusBarStyle: "black-translucent" },
  twitter: {
    card: "summary_large_image",
    title: "Bettman",
    description:
      "Predict winners & scorers, climb the leaderboard, and win bragging rights. ⚽🏆",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${bebas.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-24 sm:pb-0">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <SessionProvider>
            <ServiceWorkerRegister />
            <DevelopmentBanner />
            <PopupManager />
            <QuizFab />
            <ChatFab />
            <SiteHeader />
            {children}
            <Toaster richColors theme="dark" position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
