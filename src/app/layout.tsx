import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftDrop | Premium File Sharing",
  description: "Ultra-fast, secure file sharing with real-time sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
