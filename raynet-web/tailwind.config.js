export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: { recursive: ["Recursive", "cursive"], inter: ["Inter", "sans-serif"] },
      colors: {
        'ray-violet': '#000000',
        'photon-teal': '#5f5f5f'
      }
    }
  },
  plugins: []
};
