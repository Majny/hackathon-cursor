import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveNumbers } from "@/components/landing/LiveNumbers";
import { Footer, Nav, Trust } from "@/components/landing/Sections";

const display = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-display" });
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Heirloom",
  description:
    "Tom, an AI grandson, calls Grandpa on WhatsApp and turns the calls into a cited family archive.",
};

export default function LandingPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} font-(family-name:--font-body) bg-paper text-ink selection:bg-brick/20`}
    >
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <LiveNumbers />
        <Trust />
      </main>
      <Footer />
    </div>
  );
}
