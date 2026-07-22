import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        raised: 'var(--bg-raised)',
        overlay: 'var(--bg-overlay)',
        sunken: 'var(--bg-sunken)',
        hover: 'var(--bg-hover)',
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent-base)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          on: 'var(--accent-text-on-dark)',
        },
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        highlight: {
          bg: 'var(--highlight-bg)',
          border: 'var(--highlight-border)',
        },
      },
      fontFamily: {
        ui: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
        drawer: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
