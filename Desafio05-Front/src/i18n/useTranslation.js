import { useCallback, useMemo } from 'react'
import { useSettings } from '../settings/SettingsContext'
import pt from './locales/pt.json'
import en from './locales/en.json'

const dictionaries = { pt, en }

function getByPath(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj)
}

function interpolate(template, vars) {
  if (!vars) return template
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value === undefined || value === null ? `{${key}}` : String(value)
  })
}

export function useTranslation() {
  let settings
  try {
    // Prefer SettingsProvider (reactive) when available.
    settings = useSettings().settings
  } catch {
    settings = null
  }

  const lang = settings?.language === 'en' ? 'en' : 'pt'

  const dict = useMemo(() => dictionaries[lang] || dictionaries.pt, [lang])

  const t = useCallback(
    (key, vars) => {
      const value = getByPath(dict, key) ?? getByPath(dictionaries.pt, key)
      if (typeof value !== 'string') return key
      return interpolate(value, vars)
    },
    [dict]
  )

  return { lang, t }
}
