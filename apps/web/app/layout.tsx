import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuthentiCheck",
  description: "AI-powered product authentication and counterfeit risk detection"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
