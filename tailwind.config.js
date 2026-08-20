/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // University / Primary colors
        primary: {
          DEFAULT: '#0B3C5D', // Deep Navy / University Blue
          dark: '#082d47',
          light: '#1d557f',
        },
        secondary: {
          DEFAULT: '#328CC1', // Professional Blue / Purple Accent
          dark: '#246b95',
          light: '#53a5d2',
        },
        accent: {
          DEFAULT: '#A91D22', // Anurag Red
          dark: '#851418',
          light: '#c83f44',
        },
        neutral: {
          navy: '#1D2731', // Very dark blue/gray for headers/texts
          gold: '#D9B310', // University Gold for priority/star highlights
        },
        // Standard Semantic Status Colors
        status: {
          success: '#10B981', // Green for Registered
          warning: '#F59E0B', // Gold for Top Priority
          error: '#EF4444',   // Red for Urgent / Important
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
