import { FlowSettings, AccentColorOption } from './types'

/**
 * Flow-IDE Settings Applier
 * Applies visual theme, accent colors, UI scale, compact mode, and reduce motion/glow preferences
 * to the document root element dynamically in real time.
 */

const ACCENT_COLOR_MAP: Record<AccentColorOption, { main: string; bright: string; dim: string; focus: string }> = {
  blue: {
    main: '#3b82f6',
    bright: '#5fa3ff',
    dim: 'rgba(59, 130, 246, 0.2)',
    focus: '#3b82f6',
  },
  orange: {
    main: '#f59e0b',
    bright: '#ffb13d',
    dim: 'rgba(245, 158, 11, 0.2)',
    focus: '#f59e0b',
  },
  purple: {
    main: '#a855f7',
    bright: '#c084fc',
    dim: 'rgba(168, 85, 247, 0.2)',
    focus: '#a855f7',
  },
  green: {
    main: '#2fd18b',
    bright: '#10b981',
    dim: 'rgba(47, 209, 139, 0.2)',
    focus: '#2fd18b',
  },
}

export function applySettingsToDOM(settings: FlowSettings) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const root = document.documentElement
  const body = document.body
  const app = settings.appearance

  // 1. Theme
  let effectiveTheme = app.theme
  if (app.theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  root.setAttribute('data-theme', effectiveTheme)

  // 2. Accent Color
  const accent = ACCENT_COLOR_MAP[app.accentColor] || ACCENT_COLOR_MAP.blue
  root.style.setProperty('--color-accent', accent.main)
  root.style.setProperty('--color-accent-blue', accent.bright)
  root.style.setProperty('--color-accent-dim', accent.dim)
  root.style.setProperty('--color-border-focus', accent.focus)

  // 3. Interface Scale
  const scaleRatio = (app.uiScale || 100) / 100
  root.style.setProperty('--ui-scale', String(scaleRatio))
  root.style.fontSize = `${app.uiScale || 100}%`

  // 4. Compact Mode
  if (app.compactMode) {
    root.classList.add('compact-mode')
    body.classList.add('compact-mode')
  } else {
    root.classList.remove('compact-mode')
    body.classList.remove('compact-mode')
  }

  // 5. Reduce Motion & Animations (strips all animations AND glow effects across UI)
  if (app.reduceMotion) {
    root.classList.add('reduce-motion')
    body.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
    body.classList.remove('reduce-motion')
  }
}
