"use client";

import { useEffect, useState } from "react";

const KEY = "heirloom:text-lg";

/** A / A+ toggle — scales the whole archive to 112.5% for older eyes. Remembered per browser. */
export function TextSizeToggle() {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem(KEY) === "1";
    } catch {
      /* storage blocked — fine */
    }
    setLarge(saved);
    document.documentElement.classList.toggle("text-lg-mode", saved);
    return () => document.documentElement.classList.remove("text-lg-mode");
  }, []);

  const toggle = () => {
    const next = !large;
    setLarge(next);
    document.documentElement.classList.toggle("text-lg-mode", next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={large}
      aria-label={large ? "Use normal text size" : "Use larger text"}
      title={large ? "Normal text" : "Larger text"}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-full border px-3 font-(family-name:--font-display) transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick ${
        large ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-brick/50"
      }`}
    >
      <span className="text-sm">A</span>
      <span className="text-lg font-semibold">A</span>
      <span className="text-xs">{large ? "−" : "+"}</span>
    </button>
  );
}
