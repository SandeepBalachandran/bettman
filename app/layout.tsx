import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Bettman — World Cup Prediction League",
  description:
    "Predict winners & scorers, climb the leaderboard, and win bragging rights. Join our private World Cup prediction game! ⚽🏆",
  openGraph: {
    title: "Bettman — World Cup Prediction League",
    description:
      "Predict winners & scorers, climb the leaderboard, and win bragging rights. Join our private World Cup prediction game! ⚽🏆",
    url: appUrl,
    siteName: "Bettman",
    type: "website",
  },
  applicationName: "Bettman",
  // iPhone "Add to Home Screen": open full-screen with the app's name.
  appleWebApp: { capable: true, title: "Bettman", statusBarStyle: "default" },
  twitter: {
    card: "summary_large_image",
    title: "Bettman — World Cup Prediction League",
    description:
      "Predict winners & scorers, climb the leaderboard, and win bragging rights. ⚽🏆",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-16 sm:pb-0">
        <ThemeProvider attribute="class" defaultTheme="light">
          <SessionProvider>
            <ServiceWorkerRegister />
            <DevelopmentBanner />
            <PopupManager />
            <QuizFab />
            <ChatFab />
            <SiteHeader />
            {children}
            <Toaster richColors position="top-center" />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
