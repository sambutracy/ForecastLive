module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#FF8C00',     // Dark orange - Forecast F1 primary
        secondary: '#15151E',   // Dark background
        accent: '#FFD700',      // Golden yellow - highlights
        background: '#0F0F23',  // Very dark blue
        card: '#1A1A2E',       // Dark card background
        orange: {
          400: '#FB923C',       // Light orange
          500: '#F97316',       // Medium orange
          600: '#EA580C',       // Darker orange
        },
        yellow: {
          400: '#FACC15',       // Light yellow
          500: '#EAB308',       // Medium yellow
          600: '#CA8A04',       // Darker yellow
        }
      },
      fontFamily: {
        'formula1': ['Formula1', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
