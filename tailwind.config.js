/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        red: {
          DEFAULT: '#ff0000',
          light: '#ff4d4d',
          dark: '#cc0000',
          glow: 'rgba(255, 0, 0, 0.3)',
        },
        success: '#00ff88',
        warning: '#ffaa00',
        error: '#ff0044',
        info: '#0088ff',
      },
      fontFamily: {
        sans: ['Inter Tight', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
      },
      fontSize: {
        'display': ['56px', { lineHeight: '1.1', fontWeight: '700' }],
        'display-sm': ['42px', { lineHeight: '1.2', fontWeight: '700' }],
        'display-xs': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'metric': ['48px', { lineHeight: '1', fontWeight: '600' }],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'glow-red': '0 0 20px rgba(255, 0, 0, 0.3), 0 0 40px rgba(255, 0, 0, 0.2)',
        'glow-red-lg': '0 0 40px rgba(255, 0, 0, 0.4), 0 0 80px rgba(255, 0, 0, 0.2)',
        'glow-success': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-warning': '0 0 20px rgba(255, 170, 0, 0.3)',
        'glow-error': '0 0 20px rgba(255, 0, 68, 0.3)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 0, 0, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 0, 0, 0.4), 0 0 60px rgba(255, 0, 0, 0.2)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin-slow 60s linear infinite",
      },
      transitionTimingFunction: {
        'neural': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse': 'cubic-bezier(0.68, -0.15, 0.265, 1.15)',
        'command': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'flow': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snap': 'cubic-bezier(0.9, 0.1, 0.1, 0.9)',
        'elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
