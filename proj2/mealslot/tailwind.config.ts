// --- path: tailwind.config.ts ---
import type { Config } from "tailwindcss";

const config: Config = {
  // Use class strategy so next-themes can flip <html class="dark">
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          dusk: "#0F1C24",
          navy: "#123040",
          teal: "#1F4F61",
          aqua: "#2B6D82",
          glow: "#6BE6C1",
          coral: "#E5623A",
          gold: "#F1C04F",
          sand: "#F7F2EA",
        },
      },
      boxShadow: {
        glow: "0 10px 30px rgba(0,0,0,0.45), 0 0 24px rgba(241,192,79,0.35)",
        panel: "0 18px 42px rgba(15,28,36,0.18)",
        soft: "0 8px 24px rgba(18,48,64,0.12)",
      },
      backgroundImage: {
        "mesh-dusk":
          "radial-gradient(circle at 20% 20%, rgba(107,230,193,0.14), transparent 28%), radial-gradient(circle at 80% 0%, rgba(241,192,79,0.16), transparent 26%), radial-gradient(circle at 50% 90%, rgba(229,98,58,0.12), transparent 30%)",
        beam: "linear-gradient(120deg, #1F4F61 0%, #123040 50%, #0F1C24 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
