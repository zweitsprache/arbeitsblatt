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

const FALLBACK_STRIKE_PATHS = [
  {
    d: "M10 20 C34 10, 63 28, 92 17 C117 7, 136 24, 150 15",
    fill: "none",
    stroke: "#0097dc",
    strokeWidth: 2.1,
  },
];

const strikeDrawable = generator.line(10, 20, 150, 15, {
  seed: 23,
  roughness: 2.1,
  bowing: 3.2,
  stroke: "#0097dc",
  strokeWidth: 2.1,
});
const roughStrikePaths = generator.toPaths(strikeDrawable).filter((path) => path.d && path.stroke !== "none");

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 17;
}

function buildCirclePaths(seed: number, stroke: string) {
  const drawable = generator.ellipse(80, 30, 136, 42, {
    seed,
    roughness: 1.9,
    bowing: 2.4,
    stroke,
    strokeWidth: 2.1,
    fill: "none",
    disableMultiStroke: true,
  });

  return generator.toPaths(drawable).filter((path) => path.d && path.stroke !== "none").slice(0, 1);
}

export function RoughExampleCircle({ children, stroke = "#0097dc" }: { children: React.ReactNode; stroke?: string }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const instanceId = React.useId();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const paths = React.useMemo(() => {
    if (!isMounted) {
      return FALLBACK_PATHS.map((path) => ({
        ...path,
        stroke,
      }));
    }

    return buildCirclePaths(hashSeed(`${instanceId}:${stroke}`), stroke);
  }, [instanceId, isMounted, stroke]);

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
            stroke={path.stroke || stroke}
            strokeWidth={path.strokeWidth || 2}
          />
        ))}
      </svg>
    </span>
  );
}

export function RoughExampleStrike({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const paths = isMounted ? roughStrikePaths : FALLBACK_STRIKE_PATHS;

  return (
    <span className={`relative inline-block ${className || ""}`.trim()} style={style}>
      <span>{children}</span>
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none overflow-visible"
        viewBox="0 0 160 40"
        preserveAspectRatio="none"
        style={{
          left: "-0.35rem",
          top: "50%",
          width: "calc(100% + 0.7rem)",
          height: "1.15rem",
          transform: "translateY(-50%) rotate(-4deg)",
        }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.fill || "none"}
            stroke={path.stroke || "#0097dc"}
            strokeWidth={path.strokeWidth || 2}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
}

type RoughRoundedRectHighlight = {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  stroke?: string;
};

type RoughSvgPath = {
  d: string;
  points?: [number, number][];
  stroke?: string;
  strokeWidth?: number;
};

function buildRoundedRectPath(width: number, height: number, radius: number): string {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const limitedRadius = Math.max(0, Math.min(radius, halfWidth, halfHeight));

  return [
    `M ${-halfWidth + limitedRadius} ${-halfHeight}`,
    `H ${halfWidth - limitedRadius}`,
    `Q ${halfWidth} ${-halfHeight} ${halfWidth} ${-halfHeight + limitedRadius}`,
    `V ${halfHeight - limitedRadius}`,
    `Q ${halfWidth} ${halfHeight} ${halfWidth - limitedRadius} ${halfHeight}`,
    `H ${-halfWidth + limitedRadius}`,
    `Q ${-halfWidth} ${halfHeight} ${-halfWidth} ${halfHeight - limitedRadius}`,
    `V ${-halfHeight + limitedRadius}`,
    `Q ${-halfWidth} ${-halfHeight} ${-halfWidth + limitedRadius} ${-halfHeight}`,
    "Z",
  ].join(" ");
}

export function RoughRoundedRectHighlights({
  highlights,
  width,
  height,
  className,
}: {
  highlights: RoughRoundedRectHighlight[];
  width: number;
  height: number;
  className?: string;
}) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const paths = React.useMemo(
    () => highlights.map((highlight, index) => {
      const pathD = buildRoundedRectPath(highlight.width, highlight.height, Math.min(highlight.height * 0.26, 8));
      if (!isMounted) {
        return {
          ...highlight,
          roughPaths: [{ d: pathD, fill: "none", stroke: highlight.stroke || "#15803d", strokeWidth: 2.1 }],
        };
      }

      const drawable = generator.path(pathD, {
        seed: 101 + index,
        roughness: 0.8,
        bowing: 1,
        stroke: highlight.stroke || "#15803d",
        strokeWidth: 1.9,
        fill: "none",
        disableMultiStroke: true,
      });

      return {
        ...highlight,
        roughPaths: generator.toPaths(drawable).filter((path) => path.d && path.stroke !== "none").slice(0, 1),
      };
    }),
    [highlights, isMounted],
  );

  if (width <= 0 || height <= 0 || highlights.length === 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible ${className || ""}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {paths.map((highlight, index) => (
        <g
          key={index}
          transform={`translate(${highlight.x} ${highlight.y}) rotate(${highlight.angle || 0})`}
        >
          {highlight.roughPaths.map((path, pathIndex) => (
            <path
              key={pathIndex}
              d={path.d}
              fill={path.fill || "none"}
              stroke={path.stroke || highlight.stroke || "#15803d"}
              strokeWidth={path.strokeWidth || 2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function RoughSvgPaths({ paths }: { paths: RoughSvgPath[] }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderedPaths = React.useMemo(
    () => paths.map((path, index) => {
      if (!isMounted) {
        return [{
          d: path.d,
          fill: "none",
          stroke: path.stroke || "#0097dc",
          strokeWidth: path.strokeWidth || 2,
        }];
      }

      const drawable = path.points && path.points.length > 1
        ? generator.curve(path.points, {
            seed: 401 + index,
            roughness: 0.9,
            bowing: 1,
            stroke: path.stroke || "#0097dc",
            strokeWidth: path.strokeWidth || 2,
            fill: "none",
            disableMultiStroke: true,
          })
        : generator.path(path.d, {
            seed: 401 + index,
            roughness: 0.9,
            bowing: 1,
            stroke: path.stroke || "#0097dc",
            strokeWidth: path.strokeWidth || 2,
            fill: "none",
            disableMultiStroke: true,
          });

      return generator.toPaths(drawable)
        .filter((item) => item.d && item.stroke !== "none")
        .slice(0, 1);
    }),
    [isMounted, paths],
  );

  return (
    <>
      {renderedPaths.map((pathSet, index) => (
        <g key={index}>
          {pathSet.map((path, pathIndex) => (
            <path
              key={pathIndex}
              d={path.d}
              fill={path.fill || "none"}
              stroke={path.stroke || paths[index]?.stroke || "#0097dc"}
              strokeWidth={path.strokeWidth || paths[index]?.strokeWidth || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
    </>
  );
}