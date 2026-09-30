import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI životopisec – vzpomínky dědy Jaroslava",
  description: "AI vnouče, které si povídá s dědou, pamatuje si minulé rozhovory a píše rodinnou knihu vzpomínek.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
