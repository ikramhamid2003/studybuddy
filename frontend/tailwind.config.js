/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      // Shared brand fonts used by the app shell and study tool surfaces.
      fontFamily: {
        display: ["'Outfit'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        slate: {
          950: "#0a0f1e",
        },
        amber: {
          350: "#fbbf5a",
        },
        // Enhanced color palette for tool accents with full shade ranges
        indigo: {
          950: "#1e1b4b",
        },
        emerald: {
          950: "#022c22",
        },
        violet: {
          950: "#2e1065",
        },
        sky: {
          950: "#082f49",
        },
        rose: {
          950: "#3b081f",
        },
        fuchsia: {
          950: "#4a044e",
        },
      },
      animation: {
        // Core animations
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-in": "slideIn 0.35s ease forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow": "spin 2s linear infinite",
        "card-flip": "cardFlip 0.5s ease forwards",

        // Enhanced animations for rich UI
        "scale-in": "scaleIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "shimmer": "shimmer 2s infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-reverse": "floatReverse 8s ease-in-out infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
        "rotate-in": "rotateIn 0.3s ease-out forwards",
        "accordion-down": "accordionDown 0.3s ease-out forwards",
        "accordion-up": "accordionUp 0.3s ease-out forwards",
        "ripple": "ripple 0.6s ease-out forwards",
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
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: 0, transform: "translateY(-20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-10px) scale(1.02)" },
        },
        floatReverse: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(10px) scale(0.98)" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        rotateIn: {
          "0%": { opacity: 0, transform: "rotate(-5deg) scale(0.9)" },
          "100%": { opacity: 1, transform: "rotate(0) scale(1)" },
        },
        accordionDown: {
          "0%": { height: 0, opacity: 0 },
          "100%": { height: "var(--radix-accordion-content-height)", opacity: 1 },
        },
        accordionUp: {
          "0%": { height: "var(--radix-accordion-content-height)", opacity: 1 },
          "100%": { height: 0, opacity: 0 },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: 0.5 },
          "100%": { transform: "scale(4)", opacity: 0 },
        },
      },
      backgroundImage: {
        // Existing patterns
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        "amber-glow":
          "radial-gradient(ellipse at top, rgba(251,191,36,0.15) 0%, transparent 60%)",
        // Enhanced gradient backgrounds
        "mesh-gradient":
          "radial-gradient(at 40% 20%, hsla(228,100%,74%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,71%,0.3) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(340,100%,61%,0.3) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(22,100%,77%,0.3) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(242,100%,70%,0.3) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(343,100%,76%,0.3) 0px, transparent 50%)",
        "hero-gradient":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.25), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(236, 72, 153, 0.15), transparent)",
        "card-glow-amber": "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.08) 0%, transparent 70%)",
        "card-glow-emerald": "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
        "card-glow-violet": "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.08) 0%, transparent 70%)",
        "card-glow-sky": "radial-gradient(ellipse at center, rgba(14, 165, 233, 0.08) 0%, transparent 70%)",
        "card-glow-rose": "radial-gradient(ellipse at center, rgba(251, 113, 133, 0.08) 0%, transparent 70%)",
        "card-glow-fuchsia": "radial-gradient(ellipse at center, rgba(217, 70, 239, 0.08) 0%, transparent 70%)",
        "card-glow-indigo": "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
        // Glass morphism gradients
        "glass-light": "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)",
        "glass-dark": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
        "glass-border": "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)",
      },
      backgroundSize: {
        grid: "40px 40px",
        shimmer: "200% 100%",
      },
      boxShadow: {
        glow: "0 0 30px rgba(251,191,36,0.2)",
        "glow-sm": "0 0 15px rgba(251,191,36,0.15)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6)",
        // Enhanced shadows for rich UI
        "glass": "0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.08)",
        "glass-hover": "0 4px 16px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.1), 0 24px 64px rgba(0,0,0,0.12)",
        "elevated": "0 2px 4px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.06)",
        "elevated-hover": "0 4px 8px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.1)",
        "floating": "0 8px 32px rgba(0,0,0,0.12), 0 16px 64px rgba(0,0,0,0.16)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.05)",
        "inner-glow-amber": "inset 0 1px 0 rgba(251,191,36,0.2), inset 0 -1px 0 rgba(251,191,36,0.1)",
        "inner-glow-emerald": "inset 0 1px 0 rgba(16,185,129,0.2), inset 0 -1px 0 rgba(16,185,129,0.1)",
        "inner-glow-violet": "inset 0 1px 0 rgba(168,85,247,0.2), inset 0 -1px 0 rgba(168,85,247,0.1)",
        "inner-glow-sky": "inset 0 1px 0 rgba(14,165,233,0.2), inset 0 -1px 0 rgba(14,165,233,0.1)",
        "inner-glow-rose": "inset 0 1px 0 rgba(251,113,133,0.2), inset 0 -1px 0 rgba(251,113,133,0.1)",
        "inner-glow-fuchsia": "inset 0 1px 0 rgba(217,70,239,0.2), inset 0 -1px 0 rgba(217,70,239,0.1)",
        "inner-glow-indigo": "inset 0 1px 0 rgba(99,102,241,0.2), inset 0 -1px 0 rgba(99,102,241,0.1)",
        "focus-ring": "0 0 0 2px rgba(99, 102, 241, 0.3)",
        "focus-ring-amber": "0 0 0 2px rgba(251, 191, 36, 0.3)",
        "focus-ring-emerald": "0 0 0 2px rgba(16, 185, 129, 0.3)",
        "focus-ring-violet": "0 0 0 2px rgba(168, 85, 247, 0.3)",
        "focus-ring-rose": "0 0 0 2px rgba(251, 113, 133, 0.3)",
      },
      transitionDuration: {
        "0": "0ms",
        "75": "75ms",
        "100": "100ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
        "400": "400ms",
        "500": "500ms",
        "700": "700ms",
        "1000": "1000ms",
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "sharp": "cubic-bezier(0.4, 0, 0.6, 1)",
      },
      scale: {
        "98": "0.98",
        "99": "0.99",
        "101": "1.01",
        "102": "1.02",
        "103": "1.03",
        "105": "1.05",
      },
      rotate: {
        "3": "3deg",
        "6": "6deg",
        "-3": "-3deg",
        "-6": "-6deg",
      },
      blur: {
        "xs": "2px",
        "4xl": "72px",
      },
      backdropBlur: {
        "xs": "2px",
        "4xl": "72px",
      },
    },
  },
  plugins: [],
};