import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveNumbers } from "@/components/landing/LiveNumbers";
import { CallSection, Footer, Nav, Problem, Trust } from "@/components/landing/Sections";

const display = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-display" });
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Heirloom — Your family's stories, in their own voice.",
  description:
    "Grandpa just talks. Heirloom listens, remembers, and writes his life story — linked to your family tree.",
};

export default function LandingPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} font-(family-name:--font-body) bg-paper text-ink selection:bg-brick/20`}
    >
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <LiveNumbers />
        <CallSection />
        <Trust />
      </main>
      <Footer />
    </div>
  );
}
