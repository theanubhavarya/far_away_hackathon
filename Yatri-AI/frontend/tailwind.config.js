/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#050D1A',
          surface: '#0D1B2E',
          elevated: '#152236',
          overlay: '#1C2F47',
        },
        primary: {
          DEFAULT: '#3B9EFF',
          hover: '#5BAAFF',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#FBB040',
        },
        ai: '#00D9C0',
        disruption: '#F43F5E',
        transport: {
          train: '#3B9EFF',
          bus: '#10B981',
          flight: '#8B5CF6',
          cab: '#F59E0B',
          metro: '#EC4899',
          auto: '#F97316',
          walk: '#94A3B8',
        },
        text: {
          primary: '#E8F4FF',
          secondary: '#8BA3C7',
          muted: '#4E6B8A',
        },
        border: {
          DEFAULT: '#1E3352',
          hover: '#2D4E77',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      backgroundImage: {
        'journey-gradient': 'linear-gradient(135deg, #3B9EFF, #8B5CF6)',
        'accent-gradient': 'linear-gradient(135deg, #F59E0B, #D97706)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(59, 158, 255, 0.2)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-ai': '0 0 16px rgba(0, 217, 192, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'ai-pulse': 'ai-pulse 2s infinite',
        'disruption-pulse': 'disruption-pulse 1.5s infinite',
        'travel-dot': 'travel-dot 3s ease-in-out infinite',
        'skeleton': 'skeleton-shimmer 1.5s infinite',
        'fade-in-up': 'fade-in-up 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}
