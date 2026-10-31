import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PreMeet — Find Your Next Connection",
  description: "Connect with the right people before your next event.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}