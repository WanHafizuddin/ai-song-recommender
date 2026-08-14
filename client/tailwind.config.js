/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0f",
        surface: "#16161d",
        border: "#26262f",
        text: "#e5e7eb",
        muted: "#9ca3af",
        accent: { DEFAULT: "#6366f1", hover: "#4f46e5" },
      },
    },
  },
  plugins: [],
};
