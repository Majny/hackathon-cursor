import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "And Then",
  description:
    "Talk, remember, write a life chapter, and link people into a family tree.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
