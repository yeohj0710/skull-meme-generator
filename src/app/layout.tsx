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
  metadataBase: new URL("https://skull-meme-generator.vercel.app"),
  title: "Skull Meme Generator",
  description: "Create phonk-style skull meme images in your browser. Upload a photo, tune the cinematic noise, and download a PNG without sending your image to a server.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Skull Meme Generator",
    description: "Create phonk-style skull meme images in your browser.",
    url: "/",
    siteName: "Skull Meme Generator",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Skull Meme Generator",
    description: "Create phonk-style skull meme images in your browser.",
  },
  authors: [{ name: "yeohj0710" }],
  creator: "yeohj0710",
  applicationName: "Skull Meme Generator",
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "rxIVuaujGlI5Tc8FtIqiIFwfntmlTl1MSA5EG9E67Rw",
  },
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
