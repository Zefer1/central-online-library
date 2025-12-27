import Header from '../../components/Header/Header'
import { PageTitle } from '../../components/PageTitle/PageTitle'
import { useSettings } from '../../settings/SettingsContext'
import { useTranslation } from '../../i18n/useTranslation'
import './index.scss'

export default function Settings() {
  const { settings, setSetting, resetSettings } = useSettings()
  const { t } = useTranslation()

  return (
    <>
      <Header />
      <div className="page settings">
        <PageTitle
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />

        <section className="card settings__card" aria-label={t('settings.sectionLabel')}>
          <div className="settings__grid">
            <div className="field">
              <label htmlFor="theme">{t('settings.theme')}</label>
              <select
                id="theme"
                className="select"
                value={settings.theme}
                onChange={(e) => setSetting('theme', e.target.value)}
              >
                <option value="system">{t('settings.themeSystem')}</option>
                <option value="dark">{t('settings.themeDark')}</option>
                <option value="light">{t('settings.themeLight')}</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="language">{t('settings.language')}</label>
              <select
                id="language"
                className="select"
                value={settings.language}
                onChange={(e) => setSetting('language', e.target.value)}
              >
                <option value="pt">{t('settings.languagePt')}</option>
                <option value="en">{t('settings.languageEn')}</option>
              </select>
              <small className="muted settings__hint">{t('settings.languageHint')}</small>
            </div>

            <div className="field">
              <label htmlFor="pageSize">{t('settings.pageSize')}</label>
              <select
                id="pageSize"
                className="select"
                value={settings.pageSize}
                onChange={(e) => setSetting('pageSize', Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="defaultSort">{t('settings.defaultSort')}</label>
              <select
                id="defaultSort"
                className="select"
                value={settings.defaultSort}
                onChange={(e) => setSetting('defaultSort', e.target.value)}
              >
                <option value="newest">{t('settings.sortNewest')}</option>
                <option value="title">{t('settings.sortTitle')}</option>
                <option value="publisher">{t('settings.sortPublisher')}</option>
              </select>
            </div>

            <div className="field settings__toggle">
              <label htmlFor="reducedMotion">{t('settings.reducedMotion')}</label>
              <div className="settings__toggleRow">
                <input
                  id="reducedMotion"
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => setSetting('reducedMotion', e.target.checked)}
                />
                <span className="muted">{t('settings.reducedMotionHint')}</span>
              </div>
            </div>
          </div>

          <div className="settings__actions">
            <button type="button" className="btn btn--secondary" onClick={resetSettings}>
              {t('settings.reset')}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
