import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bani Waraich",
  description: "Personal website of Bani Waraich.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
