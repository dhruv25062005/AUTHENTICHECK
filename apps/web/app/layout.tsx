import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import PwaRegistrar from "./components/PwaRegistrar";
import Holographic3DBackground from "./components/Holographic3DBackground";

export const viewport: Viewport = {
  themeColor: "#060d17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export const metadata: Metadata = {
  title: "AuthentiCheck Protocol",
  description: "Cryptographic anti-counterfeiting verification platform with dual-layer QR codes, merchant verification, scan velocity fraud detection, and Gemini AI image forensics.",
  keywords: [
    "product authentication",
    "counterfeit detection",
    "anti-counterfeiting",
    "serial verification",
    "QR verification",
    "brand protection",
    "supply chain integrity"
  ],
  authors: [{ name: "AuthentiCheck Protocol" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AuthentiCheck Protocol"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
  openGraph: {
    title: "AuthentiCheck Protocol",
    description: "Cryptographic anti-counterfeiting verification platform with dual-layer QR codes, merchant verification, scan velocity fraud detection, and Gemini AI image forensics.",
    type: "website",
    siteName: "AuthentiCheck Protocol"
  },
  twitter: {
    card: "summary_large_image",
    title: "AuthentiCheck Protocol",
    description: "Cryptographic anti-counterfeiting verification platform with dual-layer QR codes, merchant verification, scan velocity fraud detection, and Gemini AI image forensics."
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AuthentiCheck",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Enterprise anti-counterfeiting platform with cryptographic serial verification, scan velocity heuristics, and AI packaging inspection."
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <PwaRegistrar />
        <Holographic3DBackground />
            <div className="app-container" id="app-root">
            <Navbar />
            <div className="content-wrapper" id="page-content">
              {children}
            </div>
            <footer className="site-footer" id="main-footer">
              <div className="footer-inner">
                <p>© {new Date().getFullYear()} AuthentiCheck Protocol • Enterprise Anti-Counterfeiting & Serial Traceability</p>
                <p>Cryptographic identity verification, scan velocity heuristics, and Gemini AI packaging forensic analysis.</p>
              </div>
            </footer>
          </div>
        </body>
    </html>
  );
}
