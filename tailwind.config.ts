import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mirror design tokens
        bg:      "#F7F6F4",
        text:    "#1A1A18",
        muted:   "#6B6B65",
        faint:   "#A8A89E",
        border:  "#E8E5DF",
        cta:     "#1C1C2E",
        gain:    "#1A6B3A",
        loss:    "#9B3A3A",
        warn:    "#C97B20",
        // Legacy
        canvas:  "#F7F6F4",
      },
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        prose:   ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        ui:      ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        data:    ['DM Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        "card":       "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "panel":      "-8px 0 32px rgba(0,0,0,0.06)",
        "login":      "0 24px 64px rgba(0,0,0,0.08)",
        "input":      "0 2px 8px rgba(0,0,0,0.04)",
        "input-focus":"0 2px 16px rgba(0,0,0,0.08)",
        "glass":      "0 8px 32px rgba(31,38,135,0.07), inset 0 1px 0 rgba(255,255,255,0.90)",
      },
      borderRadius: {
        "mirror-sm": "6px",
        "mirror-md": "12px",
        "mirror-lg": "20px",
        "mirror-xl": "28px",
      },
      transitionTimingFunction: {
        "spring":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-out": "cubic-bezier(0.0, 0.0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
