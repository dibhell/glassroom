import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Glass Room",
  description:
    "Glass Room to interaktywny system generatywnego audio, w ktorym szklane obiekty i fizyka ruchu tworza ambientowe struktury dzwiekowe.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl">
      <body>
        {children}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "fa40b2ad9eae40bea749d8d56cc3f32a"}'
        />
      </body>
    </html>
  );
}
