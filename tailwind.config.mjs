/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './templates/**/*.html',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          DEFAULT: '#5865F2',
          bg: '#313338',
          panel: '#2B2D31',
          hover: '#3F4147',
          hover_light: '#4E5058',
          active: '#404249',
          blurple: '#5865F2',
          blurple_hover: '#4752C4',
          text: '#DBDEE1',
          muted: '#949BA4',
          danger: '#DA373C'
        },
        discordHover: '#4752C4'
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'Helvetica Neue', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
