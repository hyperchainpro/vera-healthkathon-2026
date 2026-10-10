import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERA - Verifikasi Rawat Inap Efisien & Akuntabel | Healthkathon 2026",
  description: "Platform cerdas telaah klaim rawat inap berbasis analitik klinis dan kecerdasan buatan untuk verifikasi berkas klaim BPJS Kesehatan secara akurat, transparan, dan akuntabel.",
  keywords: ["VERA", "Healthkathon 2026", "BPJS Kesehatan", "Verifikasi Klaim", "Rawat Inap", "Audit Medis", "Clinical Analytics", "INA-CBG"],
  authors: [{ name: "Tim Pengembang VERA" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "VERA - Verifikasi Rawat Inap Efisien & Akuntabel",
    description: "Sistem otomasi audit dan verifikasi klaim rawat inap berbasis analitik klinis untuk pencegahan dispute klaim dan akuntabilitas pembiayaan kesehatan.",
    siteName: "VERA Healthkathon 2026",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VERA - Verifikasi Rawat Inap Efisien & Akuntabel",
    description: "Sistem otomasi audit dan verifikasi klaim rawat inap berbasis analitik klinis untuk Healthkathon 2026.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
