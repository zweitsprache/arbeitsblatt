"use client";

import { useState, useEffect } from "react";

const PASTEL_COLORS_URL = "/colors/pastel-colors.md";

let cachedColors: string[] | null = null;

function parseColorsFromMarkdown(md: string): string[] {
  const colors: string[] = [];
  for (const line of md.split("\n")) {
    const match = line.match(/\|\s*\w+\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/);
    if (match) {
      colors.push(match[1]);
    }
  }
  return colors;
}

export function usePastelColors(): string[] {
  const [colors, setColors] = useState<string[]>(cachedColors ?? []);

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
