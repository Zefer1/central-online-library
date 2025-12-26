import Header from '../../components/Header/Header'
import { PageTitle } from '../../components/PageTitle/PageTitle'
import { useSettings } from '../../settings/SettingsContext'
import './index.scss'

export default function Settings() {
  const { settings, setSetting, resetSettings } = useSettings()

  return (
    <>
      <Header />
      <div className="page settings">
        <PageTitle
          title="Definições"
          subtitle="Preferências guardadas no seu navegador."
        />

        <section className="card settings__card" aria-label="Preferências">
          <div className="settings__grid">
            <div className="field">
              <label htmlFor="theme">Tema</label>
              <select
                id="theme"
                className="select"
                value={settings.theme}
                onChange={(e) => setSetting('theme', e.target.value)}
              >
                <option value="system">Sistema</option>
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="language">Idioma</label>
              <select
                id="language"
                className="select"
                value={settings.language}
                onChange={(e) => setSetting('language', e.target.value)}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
              </select>
              <small className="muted settings__hint">(Ainda não traduz todo o UI — guarda a preferência.)</small>
            </div>

            <div className="field">
              <label htmlFor="pageSize">Itens por página</label>
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
              <label htmlFor="defaultSort">Ordenação padrão</label>
              <select
                id="defaultSort"
                className="select"
                value={settings.defaultSort}
                onChange={(e) => setSetting('defaultSort', e.target.value)}
              >
                <option value="newest">Mais recentes</option>
                <option value="title">Título</option>
                <option value="publisher">Editora</option>
              </select>
            </div>

            <div className="field settings__toggle">
              <label htmlFor="reducedMotion">Reduzir animações</label>
              <div className="settings__toggleRow">
                <input
                  id="reducedMotion"
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) => setSetting('reducedMotion', e.target.checked)}
                />
                <span className="muted">Desliga transições/animações sempre que possível.</span>
              </div>
            </div>
          </div>

          <div className="settings__actions">
            <button type="button" className="btn btn--secondary" onClick={resetSettings}>
              Repor padrões
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
