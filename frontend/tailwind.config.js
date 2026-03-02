/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        slate: {
          950: "#0a0f1e",
        },
        amber: {
          350: "#fbbf5a",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-in": "slideIn 0.35s ease forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow": "spin 2s linear infinite",
        "card-flip": "cardFlip 0.5s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideIn: {
          "0%": { opacity: 0, transform: "translateX(-12px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        "amber-glow":
          "radial-gradient(ellipse at top, rgba(251,191,36,0.15) 0%, transparent 60%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        glow: "0 0 30px rgba(251,191,36,0.2)",
        "glow-sm": "0 0 15px rgba(251,191,36,0.15)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
