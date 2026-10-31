import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import DesignSwitch from "./design-switch";
import "./globals.css";

export const metadata: Metadata = {
  title: "PreMeet",
  description:
    "Know who to meet before an event. Track meetings, pilots and deals after.",
};

// Applies the saved design before the first paint, so Liquid Glass never flashes Classic.
const applySavedDesign = `try{if(localStorage.getItem("premeet-design")==="glass")document.documentElement.dataset.design="glass"}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <DesignSwitch />
        <Script id="apply-saved-design" strategy="beforeInteractive">
          {applySavedDesign}
        </Script>
      </body>
    </html>
  );
}
