import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-primary',
    'text-primary',
    'hover:bg-primary/90',
    'text-xl',
    'flex',
    'bg-red-500',
    'text-4xl',
    'font-bold',
    'text-blue-600',
    'text-5xl',
    'mb-4',
    'mb-12',
    'space-y-8',
    'grid',
    'gap-6',
    'md:grid-cols-3',
    'flex',
    'items-center',
    'mr-2',
    'h-5',
    'w-5',
    'list-disc',
    'pl-5',
    'space-y-2',
    'mt-12',
    'text-center',
    'text-muted-foreground',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        headline: ['var(--font-literata)', 'Literata', 'Georgia', 'serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#a855f7',
          600: '#9333ea',
          900: '#581c87',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        sacred: {
          saffron: '#FF9933',
          lotus: '#E91E63',
          peacock: '#4DD0E1',
          sandalwood: '#FFEAA7',
        },
        semantic: {
          bhagavatam: '#9333ea',
          vishnu: '#3b82f6',
          lalita: '#ec4899',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      spacing: {
        section: '5rem',
        card: '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        'card-hover': '0 4px 12px rgba(147, 51, 234, 0.15)',
        modal: '0 20px 40px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;