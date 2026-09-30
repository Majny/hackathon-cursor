import { redirect } from "next/navigation";
import { routes } from "@/lib/archive";

// Old route: transcripts now live under /family/conversations/[id].
export default async function LegacySessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(routes.conversation(id));
}
