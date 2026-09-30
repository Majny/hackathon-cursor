import Link from "next/link";
import type { ConversationDetail, EntityLink } from "@/lib/archive";
import { ConvLinkedText, focusRing } from "./parts";

type Turn = ConversationDetail["turns"][number];

/** One chat bubble: Grandpa on the left, Tom on the right. The id keeps deep links (#turnId) working. */
export function TranscriptTurn({ t, links }: { t: Turn; links: EntityLink[] }) {
  const gp = t.role === "grandparent";
  const story = t.chapterRefs[0];

  return (
    <div id={t.turnId} className={`flex scroll-mt-28 py-1.5 target:rounded-2xl target:bg-brick/10 ${gp ? "justify-start" : "justify-end"}`}>
      <div className={`flex max-w-[88%] flex-col sm:max-w-[78%] ${gp ? "items-start" : "items-end"}`}>
        <span className={`mb-1 text-[0.95rem] font-semibold ${gp ? "text-brick-dark" : "text-moss"}`}>
          {gp ? "Grandpa" : "Tom"}
        </span>
        <div
          className={`rounded-2xl px-5 py-3.5 text-[1.15rem] leading-[1.6] text-ink ${
            gp ? "rounded-tl-sm border border-line bg-card" : "rounded-tr-sm bg-paper-dark"
          }`}
        >
          {gp ? <ConvLinkedText text={t.text} links={links} /> : t.text}
        </div>
        {gp && story && (
          <Link href={story.href} className={`mt-1.5 rounded text-[0.95rem] text-brick underline-offset-4 hover:underline ${focusRing}`}>
            Used in the story “{story.title}”
          </Link>
        )}
      </div>
    </div>
  );
}
