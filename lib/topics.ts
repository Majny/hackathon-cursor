import type { LifeTopicKey } from "./types";

export const LIFE_TOPICS: { key: LifeTopicKey; label: string; labelEn: string }[] = [
  { key: "detstvi", label: "Childhood", labelEn: "Childhood" },
  { key: "skola", label: "School", labelEn: "School" },
  { key: "vojna", label: "Military service", labelEn: "Military service" },
  { key: "prace", label: "Work", labelEn: "Work" },
  { key: "laska", label: "Love", labelEn: "Love" },
  { key: "deti", label: "Children", labelEn: "Children" },
  { key: "moudrost", label: "Wisdom", labelEn: "Wisdom" },
];

export const LIFE_TOPIC_KEYS: LifeTopicKey[] = LIFE_TOPICS.map((t) => t.key);

export function topicLabel(key: LifeTopicKey): string {
  return LIFE_TOPICS.find((t) => t.key === key)?.label ?? key;
}

export function isLifeTopicKey(v: unknown): v is LifeTopicKey {
  return typeof v === "string" && (LIFE_TOPIC_KEYS as string[]).includes(v);
}
