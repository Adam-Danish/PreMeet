"use client";

import { useEffect, useState } from "react";

type Design = "classic" | "glass";

export const DESIGN_KEY = "premeet-design";

const LABELS: Record<Design, string> = {
  classic: "Classic",
  glass: "Liquid Glass",
};

// Floating button that flips the whole app between the Classic and Liquid Glass designs.
// The choice lives on <html data-design="glass"> and in localStorage, so it survives reloads.
export default function DesignSwitch() {
  const [design, setDesign] = useState<Design>("classic");

  useEffect(() => {
    // layout.tsx already applied the saved design before paint; mirror it here.
    setDesign(document.documentElement.dataset.design === "glass" ? "glass" : "classic");
  }, []);

  function toggle() {
    const next: Design = design === "glass" ? "classic" : "glass";
    if (next === "glass") {
      document.documentElement.dataset.design = "glass";
    } else {
      delete document.documentElement.dataset.design;
    }
    try {
      localStorage.setItem(DESIGN_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
    setDesign(next);
  }

  return (
    <button
      type="button"
      className="design-switch"
      onClick={toggle}
      aria-label={`Design: ${LABELS[design]}. Switch to ${LABELS[design === "glass" ? "classic" : "glass"]}`}
    >
      <span className="design-switch-dot" aria-hidden="true" />
      {LABELS[design]}
    </button>
  );
}
