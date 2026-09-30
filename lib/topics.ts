import type { LifeTopicKey } from "./types";

export const LIFE_TOPICS: { key: LifeTopicKey; label: string; labelEn: string }[] = [
  { key: "detstvi", label: "Dětství", labelEn: "Childhood" },
  { key: "skola", label: "Škola", labelEn: "School" },
  { key: "vojna", label: "Vojna", labelEn: "Military service" },
  { key: "prace", label: "Práce", labelEn: "Work" },
  { key: "laska", label: "Láska a svatba", labelEn: "Love & marriage" },
  { key: "deti", label: "Děti a rodina", labelEn: "Children & family" },
  { key: "moudrost", label: "Životní moudrost", labelEn: "Life wisdom" },
];

export const LIFE_TOPIC_KEYS: LifeTopicKey[] = LIFE_TOPICS.map((t) => t.key);

export function topicLabel(key: LifeTopicKey): string {
  return LIFE_TOPICS.find((t) => t.key === key)?.label ?? key;
}

export function isLifeTopicKey(v: unknown): v is LifeTopicKey {
  return typeof v === "string" && (LIFE_TOPIC_KEYS as string[]).includes(v);
}
