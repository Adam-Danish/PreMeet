import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PreMeet — Event Game Plan",
  description:
    "Know who to meet before an event. Track meetings, pilots and deals after.",
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