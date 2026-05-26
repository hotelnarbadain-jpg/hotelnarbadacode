/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#091935',
          blue: '#2f66eb',
          soft: '#f3f6fb',
          border: '#d9e1ee',
          text: '#13233d',
          muted: '#6f7f99',
        },
      },
      boxShadow: {
        soft: '0 8px 20px rgba(17, 41, 84, 0.08)',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
