import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "\uD574\uACE8 \uBC08 \uC0DD\uC131\uAE30",
  description: "\uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC774\uBBF8\uC9C0\uB97C \uD574\uACE8 \uBC08\uC73C\uB85C \uB9CC\uB4DC\uB294 \uC0DD\uC131\uAE30.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
