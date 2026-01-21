import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ATLAS | Strategic Intelligence Platform",
  description:
    "Advanced Threat Analysis & Legal Strategic Intelligence Platform. Transforming open-source global signals into clear, defensible, executive decisions.",
  keywords: [
    "strategic intelligence",
    "risk assessment",
    "geopolitical analysis",
    "OSINT",
    "decision support",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-gray-950 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
