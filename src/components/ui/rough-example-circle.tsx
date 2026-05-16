"use client";

import React from "react";
import rough from "roughjs";

const FALLBACK_PATHS = [
  {
    d: "M10 30 C10 14, 37 7, 80 7 C118 7, 150 16, 150 30 C150 44, 121 53, 80 53 C39 53, 10 45, 10 30",
    fill: "none",
    stroke: "#0097dc",
    strokeWidth: 2.1,
  },
];

const generator = rough.generator();
const drawable = generator.ellipse(80, 30, 136, 42, {
  seed: 17,
  roughness: 1.9,
  bowing: 2.4,
  stroke: "#0097dc",
  strokeWidth: 2.1,
  fill: "none",
});
const roughPaths = generator.toPaths(drawable).filter((path) => path.d && path.stroke !== "none");

export function RoughExampleCircle({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const paths = isMounted ? roughPaths : FALLBACK_PATHS;

  return (
    <span className="relative inline-block">
      <span>{children}</span>
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none overflow-visible"
        viewBox="0 0 160 60"
        preserveAspectRatio="none"
        style={{
          inset: "-0.42rem -1rem",
          width: "calc(100% + 2rem)",
          height: "calc(100% + 0.84rem)",
          transform: "rotate(-4deg)",
        }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.fill || "none"}
            stroke={path.stroke || "#0097dc"}
            strokeWidth={path.strokeWidth || 2}
          />
        ))}
      </svg>
    </span>
  );
}