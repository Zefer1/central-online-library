import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { SettingsProvider } from '../../settings/SettingsContext'
import { AuthProvider } from '../../auth/AuthContext'
import Settings from './Settings'

describe('Settings view', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-reduced-motion')
  })

  it('persists theme to localStorage and applies data-theme', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <Settings />
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const theme = screen.getByLabelText('Tema')
    fireEvent.change(theme, { target: { value: 'light' } })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('col_settings_v1')).toContain('"theme":"light"')
  })

  it('persists pageSize to localStorage', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <Settings />
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    const pageSize = screen.getByLabelText('Itens por página')
    fireEvent.change(pageSize, { target: { value: '20' } })

    expect(localStorage.getItem('col_settings_v1')).toContain('"pageSize":20')
  })
})
