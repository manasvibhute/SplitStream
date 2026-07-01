module.exports = {
  content: ["./index.html", "./client/src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        mint: "#2fbf71",
        coral: "#ef6f6c",
        saffron: "#f4b942",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 32, 42, 0.10)",
      },
    },
  },
  plugins: [],
};
