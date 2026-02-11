/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        hn: {
          orange: "#ff6600",
          bg: "#f6f6ef",
        },
      },
    },
  },
  plugins: [],
};
