"use client";

import { useState, useEffect } from "react";

const PASTEL_COLORS_URL = "/colors/pastel-colors.md";

export interface PastelColorSet {
  original: string[];
  lighter: string[];
}

let cachedColors: PastelColorSet | null = null;

function parseColorsFromMarkdown(md: string): PastelColorSet {
  const original: string[] = [];
  const lighter: string[] = [];
  for (const line of md.split("\n")) {
    const match = line.match(/\|\s*\w+\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/);
    if (match) {
      original.push(match[1]);
      lighter.push(match[2]);
    }
  }
  return { original, lighter };
}

export function usePastelColors(): string[] {
  const set = usePastelColorSet();
  return set.original;
}

export function usePastelColorSet(): PastelColorSet {
  const [colors, setColors] = useState<PastelColorSet>(cachedColors ?? { original: [], lighter: [] });

  useEffect(() => {
    if (cachedColors) return;
    fetch(PASTEL_COLORS_URL)
      .then((res) => res.text())
      .then((md) => {
        cachedColors = parseColorsFromMarkdown(md);
        setColors(cachedColors);
      })
      .catch(() => {});
  }, []);

  return colors;
}
