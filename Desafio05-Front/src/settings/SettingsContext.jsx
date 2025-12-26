import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'col_settings_v1'

const defaultSettings = {
  theme: 'system',
  language: 'pt',
  pageSize: 10,
  defaultSort: 'newest',
  reducedMotion: false,
}

function safeParseSettings(value) {
  try {
    if (!value) return null
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null

    const next = { ...defaultSettings }

    if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
      next.theme = parsed.theme
    }

    if (parsed.language === 'pt' || parsed.language === 'en') {
      next.language = parsed.language
    }

    if ([10, 20, 50].includes(parsed.pageSize)) {
      next.pageSize = parsed.pageSize
    }

    if (['newest', 'title', 'publisher'].includes(parsed.defaultSort)) {
      next.defaultSort = parsed.defaultSort
    }

    if (typeof parsed.reducedMotion === 'boolean') {
      next.reducedMotion = parsed.reducedMotion
    }

    return next
  } catch {
    return null
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(themeSetting) {
  if (themeSetting === 'light' || themeSetting === 'dark') return themeSetting
  return getSystemTheme()
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const fromStorage = safeParseSettings(localStorage.getItem(STORAGE_KEY))
    return fromStorage || defaultSettings
  })

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Apply reduced motion + language
  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false')
    el.setAttribute('lang', settings.language)
  }, [settings.reducedMotion, settings.language])

  // Apply theme, and follow system theme changes when using 'system'
  useEffect(() => {
    const el = document.documentElement

    const apply = () => {
      const resolved = resolveTheme(settings.theme)
      el.setAttribute('data-theme', resolved)
    }

    apply()

    if (settings.theme !== 'system' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => apply()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [settings.theme])

  const api = useMemo(() => {
    function setSetting(key, value) {
      setSettings((prev) => ({ ...prev, [key]: value }))
    }

    function resetSettings() {
      setSettings(defaultSettings)
    }

    return {
      settings,
      setSetting,
      resetSettings,
    }
  }, [settings])

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
