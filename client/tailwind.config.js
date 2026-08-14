/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#140f1e", // deep aubergine base (warmer than pure black)
        panel: "#1d1730", // raised plum surface
        line: "#332a49", // hairline borders
        haze: "#a99cc4", // muted lavender-grey text
        chalk: "#f4f0ff", // warm white text
        ember: { DEFAULT: "#ff7a3c", hover: "#ff9057" }, // hot accent = high energy
        frost: "#37d0c4", // cool accent = low energy
        danger: "#ff5470", // errors
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        eq: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        eq: "eq 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
