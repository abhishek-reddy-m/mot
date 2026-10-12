import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const tone = (name: string) => ({
  DEFAULT: `hsl(var(--${name}) / <alpha-value>)`,
  foreground: `hsl(var(--${name}-foreground) / <alpha-value>)`,
  soft: `hsl(var(--${name}-soft) / <alpha-value>)`,
});

export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      // Dynamic viewport units (core utilities only arrive in Tailwind 3.4).
      height: { dvh: "100dvh" },
      minHeight: { dvh: "100dvh" },
      maxHeight: { dvh: "100dvh" },
      // Finer opacity steps (core in 3.4) so modifiers like ring-primary/15 resolve.
      opacity: { 15: "0.15", 35: "0.35", 45: "0.45", 55: "0.55", 65: "0.65", 85: "0.85" },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          raised: "hsl(var(--surface-raised) / <alpha-value>)",
          sunken: "hsl(var(--surface-sunken) / <alpha-value>)",
        },
        primary: tone("primary"),
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: tone("destructive"),
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        success: tone("success"),
        warning: tone("warning"),
        danger: tone("destructive"),
        info: tone("info"),
        agent: tone("agent"),
        // Per-property brand color for white-labeled guest pages.
        brand: {
          DEFAULT: "hsl(var(--brand) / <alpha-value>)",
          foreground: "hsl(var(--brand-foreground) / <alpha-value>)",
          soft: "hsl(var(--brand-soft) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 14px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(var(--shadow) / 0.05)",
        soft: "0 1px 2px hsl(var(--shadow) / 0.04), 0 4px 12px -2px hsl(var(--shadow) / 0.06)",
        lifted: "0 2px 4px hsl(var(--shadow) / 0.04), 0 12px 32px -8px hsl(var(--shadow) / 0.14)",
        float: "0 8px 16px -4px hsl(var(--shadow) / 0.08), 0 24px 64px -12px hsl(var(--shadow) / 0.22)",
        glow: "0 0 0 1px hsl(var(--agent) / 0.25), 0 8px 32px -6px hsl(var(--agent) / 0.35)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        aurora: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--agent) / 0.45)" },
          "100%": { boxShadow: "0 0 0 10px hsl(var(--agent) / 0)" },
        },
        blink: { "0%, 100%": { opacity: "0.2" }, "50%": { opacity: "1" } },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-up": "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        aurora: "aurora 12s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        blink: "blink 1.2s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
