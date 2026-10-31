import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans.ttf",
  display: "swap",
  variable: "--font-jakarta",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "PreMeet",
  description:
    "Know who to meet before an event. Track meetings, pilots and deals after.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
