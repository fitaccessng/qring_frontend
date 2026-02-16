export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          500: "#2456f5",
          600: "#1d46d1",
          700: "#1637a9"
        },
        success: "#1f9d62",
        warning: "#d97706",
        danger: "#dc2626"
      },
      fontFamily: {
        heading: ["Sora", "ui-sans-serif", "sans-serif"],
        body: ["Manrope", "ui-sans-serif", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px -15px rgba(12, 23, 62, 0.25)"
      }
    }
  },
  plugins: []
};
