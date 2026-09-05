/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: '#0077B6',
        dolphin: '#00B4D8',
        aqua: '#48CAE4',
        mist: '#F1FAFD',
        navy: '#0B1F33',
        coral: '#FF6B4A',
        success: '#16A085',
      },
      fontFamily: {
        heading: ['Poppins', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        dolphin: '12px',
      },
    },
  },
  plugins: [],
};

