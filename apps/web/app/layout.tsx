import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "SokoOdds",
  description: "Kenya-first event markets with clear odds, public resolution sources, and M-Pesa-native trust."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bodyFont.variable}>
      <body>
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}
