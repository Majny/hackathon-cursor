"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Yes / No buttons for "Is this the same person?". Calls POST /api/matches/:id. */
export function MatchAnswer({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "yes" | "no" | "error">("idle");

  const answer = async (action: "confirm" | "reject") => {
    setState("busy");
    try {
      const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState(action === "confirm" ? "yes" : "no");
      router.refresh();
    } catch {
      setState("error");
    }
  };

  if (state === "yes") return <p className="mt-4 text-[1.1rem] text-moss">Thank you. We linked them in the family tree.</p>;
  if (state === "no") return <p className="mt-4 text-[1.1rem] text-ink-soft">Thank you. We will keep them apart.</p>;

  const btn =
    "inline-flex min-h-12 min-w-24 items-center justify-center rounded-full px-6 text-[1.1rem] font-medium transition-colors disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" disabled={state === "busy"} onClick={() => answer("confirm")} className={`${btn} bg-ink text-paper hover:bg-ink/90`}>
        Yes, same person
      </button>
      <button type="button" disabled={state === "busy"} onClick={() => answer("reject")} className={`${btn} border border-line bg-card text-ink hover:border-brick/50`}>
        No
      </button>
      {state === "error" && <span className="text-[1rem] text-brick">Something went wrong. Please try again.</span>}
    </div>
  );
}
