import type { Metadata } from "next";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SokoOdds",
  description: "Kenya-first event markets, forecasting, and clear YES or NO contracts."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}
