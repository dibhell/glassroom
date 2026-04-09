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
      <body>{children}</body>
    </html>
  );
}
