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
        bg: {
          DEFAULT: "#0a0d22",
          2: "#0f1433",
        },
        panel: {
          DEFAULT: "#141a42",
          2: "#1b2254",
          3: "#232c6a",
        },
        playbex: {
          orange: "#ff9a1f",
          pink: "#ff3d5a",
          blue: "#3aa0ff",
          navy: "#0b1030",
          yellow: "#ffc23d",
          green: "#2fd47a",
          purple: "#a46bff",
          muted: "#a3abd6",
          dim: "#6f78a8",
        },
      },
      fontFamily: {
        head: ["'Lilita One'", "'Arial Black'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        "playbex-grad": "linear-gradient(135deg, #ffb02e 0%, #ff7a1f 45%, #ff3d5a 100%)",
        "playbex-blue": "linear-gradient(135deg, #5cc0ff 0%, #3a7dff 100%)",
        "card-grad": "linear-gradient(180deg, #1b2254, #141a42)",
        "p1-grad": "linear-gradient(180deg, #3a3550 0%, #141a3c 100%)",
        "p2-grad": "linear-gradient(180deg, #26306a 0%, #141a3c 100%)",
      },
      boxShadow: {
        playbex: "0 18px 50px rgba(0, 0, 0, 0.45)",
        btn: "0 5px 0 #c2410c, 0 12px 24px rgba(255, 61, 90, 0.25)",
        "btn-glass": "0 5px 0 rgba(0,0,0,0.35), 0 12px 24px rgba(0,0,0,0.3)",
        "btn-white": "0 5px 0 #cbd5e1",
      },
    },
  },
  plugins: [],
};
export default config;
