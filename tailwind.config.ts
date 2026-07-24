import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Soft, layered shadows with a cool slate tint for a premium feel.
        // These override the Tailwind defaults, so existing shadow-sm / shadow /
        // shadow-md / shadow-lg usages are elevated without touching components.
        // NOTE: shadow-sm is deliberately kept light — it is used by the ~140
        // input cells in the transaction grid, so it must stay cheap to paint.
        sm: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        DEFAULT:
          "0 1px 3px 0 rgb(16 24 40 / 0.07), 0 1px 2px -1px rgb(16 24 40 / 0.08)",
        md: "0 4px 10px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.05)",
        lg: "0 12px 20px -6px rgb(16 24 40 / 0.10), 0 6px 10px -6px rgb(16 24 40 / 0.05)",
        // Dimensional (3D) utilities for bounded containers only — a raised top
        // highlight plus layered ambient + direct drop shadow. Applied to cards,
        // buttons, KPI tiles, and dialogs; never to the bulk input cells.
        card: "inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px 0 rgb(16 24 40 / 0.05), 0 6px 16px -4px rgb(16 24 40 / 0.10), 0 12px 28px -8px rgb(16 24 40 / 0.08)",
        raised:
          "inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1px 0 rgb(16 24 40 / 0.10), 0 2px 4px -1px rgb(16 24 40 / 0.14), 0 4px 8px -2px rgb(16 24 40 / 0.10)",
        float:
          "inset 0 1px 0 0 rgb(255 255 255 / 0.55), 0 12px 32px -8px rgb(16 24 40 / 0.22), 0 24px 56px -12px rgb(16 24 40 / 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
