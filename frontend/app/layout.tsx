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
  metadataBase: new URL("https://rasikn.com"),
  title: { default: "Rasik Tiwari | BI & Data Analyst | Brisbane", template: "%s | Rasik Tiwari" },
  description: "BI and Data Analyst based in Brisbane working with Snowflake, SQL, Tableau and Matillion across data validation, reporting and analytics.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: "https://rasikn.com", siteName: "Rasik Tiwari", title: "Rasik Tiwari | BI & Data Analyst | Brisbane", description: "BI and Data Analyst based in Brisbane working with Snowflake, SQL, Tableau and Matillion across data validation, reporting and analytics." },
  twitter: { card: "summary_large_image", title: "Rasik Tiwari | BI & Data Analyst | Brisbane", description: "BI and Data Analyst based in Brisbane working with Snowflake, SQL, Tableau and Matillion across data validation, reporting and analytics." },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {"@type": "Person", "name": "Rasik Tiwari", "url": "https://rasikn.com", "jobTitle": "BI & Data Analyst", "sameAs": ["https://github.com/Angel16989"]},
            {"@type": "WebSite", "name": "Rasik Tiwari | BI & Data Analyst", "url": "https://rasikn.com"}
          ]
        })}} />
      </body>
    </html>
  );
}
