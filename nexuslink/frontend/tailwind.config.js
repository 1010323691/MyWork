/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      colors: {
        // OpenAI minimal light theme - off-white/cream background
        background: '#FAFAF9', // stone-50: warm off-white
        'background-secondary': '#F5F5F4', // stone-100
        foreground: '#1C1917', // stone-900
        primary: {
          DEFAULT: '#FFFFFF',
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        secondary: '#78716C',
        accent: {
          DEFAULT: '#B45309', // amber-700
          hover: '#D97706', // amber-600
        },
        muted: '#E7E5E4',
        border: '#E7E5E4',
        'border-light': '#F5F5F4',
        destructive: '#DC2626',
        ring: '#D6D3D1',
        // Status colors
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
