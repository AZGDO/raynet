export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: { recursive: ["Recursive", "cursive"], inter: ["Inter", "sans-serif"] },
      colors: {
        'ray-violet': '#7A5CFA',
        'photon-teal': '#00D9C5'
      }
    }
  },
  plugins: []
};
