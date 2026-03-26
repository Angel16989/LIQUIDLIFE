import type { Metadata } from "next";
import { Geist_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./document-templates.css";
import "./template-theme.css";

const liquidSans = Source_Sans_3({
  variable: "--font-liquid-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rasik Tiwari Projects",
  description: "GitHub-driven project hub with live links to portfolio work and Liquid Life",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${liquidSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
