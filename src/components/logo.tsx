import * as React from "react";

/**
 * TPB brand mark — a triangle whose three sides are red (left), blue (right),
 * and green (bottom), with "TPB" lettering. Rendered as inline SVG so it stays
 * crisp at any size and adapts the label colour to the theme.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="TPB"
    >
      {/* Left side (red) */}
      <line
        x1="50"
        y1="9"
        x2="10"
        y2="88"
        stroke="#e01e1e"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Right side (blue) */}
      <line
        x1="50"
        y1="9"
        x2="90"
        y2="88"
        stroke="#1f52e0"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Bottom side (green) */}
      <line
        x1="12"
        y1="88"
        x2="88"
        y2="88"
        stroke="#22c55e"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <text
        x="52"
        y="80"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        className="fill-foreground"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        TPB
      </text>
    </svg>
  );
}
