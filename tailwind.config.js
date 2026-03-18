/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // These colors can be extended/overridden to match signoz.io's design system
      colors: {
        signoz: {
          primary: '#4E74F8',
          secondary: '#7B8AB8',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          // Background colors for dark mode (matching SigNoz style)
          bg: {
            ink: '#0B0C0E',
            base: '#121317',
            elevated: '#16181D',
            surface: '#1D1F27',
          },
          // Text colors
          text: {
            primary: '#C0C1C3',
            secondary: '#7B7D80',
            muted: '#52575E',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#C0C1C3',
            h1: {
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '2em',
              marginTop: '0',
              marginBottom: '0.8em',
              lineHeight: '1.2',
            },
            h2: {
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '1.5em',
              marginTop: '1.5em',
              marginBottom: '0.8em',
              lineHeight: '1.3',
            },
            h3: {
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '1.25em',
              marginTop: '1.3em',
              marginBottom: '0.6em',
            },
            h4: {
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '1.1em',
              marginTop: '1.2em',
              marginBottom: '0.5em',
            },
            p: {
              marginTop: '1em',
              marginBottom: '1em',
            },
            a: {
              color: '#4E74F8',
              textDecoration: 'underline',
              '&:hover': {
                color: '#6B8CFF',
              },
            },
            strong: {
              color: '#FFFFFF',
              fontWeight: '600',
            },
            em: {
              fontStyle: 'italic',
            },
            code: {
              color: '#E879F9',
              backgroundColor: '#1D1F27',
              padding: '0.2em 0.4em',
              borderRadius: '0.25em',
              fontSize: '0.875em',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#121317',
              color: '#C0C1C3',
              padding: '1em',
              borderRadius: '0.5em',
              overflow: 'auto',
              border: '1px solid #1D1F27',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              borderRadius: '0',
              fontSize: '0.875em',
            },
            ul: {
              listStyleType: 'disc',
              paddingLeft: '1.5em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: '1.5em',
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            blockquote: {
              borderLeftColor: '#4E74F8',
              borderLeftWidth: '4px',
              paddingLeft: '1em',
              fontStyle: 'italic',
              color: '#7B7D80',
            },
            hr: {
              borderColor: '#1D1F27',
              marginTop: '2em',
              marginBottom: '2em',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            th: {
              backgroundColor: '#16181D',
              color: '#FFFFFF',
              fontWeight: '600',
              padding: '0.75em',
              borderBottom: '2px solid #1D1F27',
            },
            td: {
              padding: '0.75em',
              borderBottom: '1px solid #1D1F27',
            },
            img: {
              borderRadius: '0.5em',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
