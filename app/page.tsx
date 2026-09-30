// PLACEHOLDER by WP0 – owned and replaced by WP1 (senior "Povídat" page).
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-semibold">Ahoj, dědo Jardo</h1>
      <Card className="text-center">
        <p className="text-ink-soft">Tady bude velké tlačítko „Povídat“ (WP1).</p>
        <div className="mt-4 flex justify-center gap-4 text-brick underline">
          <Link href="/rodina">Pro rodinu</Link>
          <Link href="/demo">Demo</Link>
        </div>
      </Card>
    </main>
  );
}
