"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function RecomputeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.recomputeMatches();
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Hledám…" : "Hledat shody ve stromě"}
    </Button>
  );
}
