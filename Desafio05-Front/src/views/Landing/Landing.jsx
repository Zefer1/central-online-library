import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import logo from '../../assets/logo.png';
import { useTranslation } from '../../i18n/useTranslation';
import './index.scss';

export default function Landing() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const { t } = useTranslation();

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <Header />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__content">
            <p className="hero__badge">Central Online Library</p>
            <h1 id="hero-title">{t('landing.heroTitle')}</h1>
            <p className="hero__subtitle">
              {t('landing.heroSubtitle')}
            </p>

            <div className="hero__actions" aria-label={t('landing.actionsLabel')}>
              <Link className="btn btn--primary" to="/login">{t('landing.ctaSignIn')}</Link>
              <Link className="btn btn--secondary" to="/livros">{t('landing.ctaSeeCatalog')}</Link>
              <button className="btn btn--ghost" type="button" onClick={scrollToFeatures}>
                {t('landing.ctaLearnMore')}
              </button>
            </div>

            <dl className="hero__stats" aria-label={t('landing.highlightsLabel')}>
              <div className="stat">
                <dt>{t('landing.statSearch')}</dt>
                <dd>{t('landing.statSearchValue')}</dd>
              </div>
              <div className="stat">
                <dt>{t('landing.statPagination')}</dt>
                <dd>{t('landing.statPaginationValue')}</dd>
              </div>
              <div className="stat">
                <dt>Auth</dt>
                <dd>JWT</dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__card">
              <img className="hero__logo" src={logo} alt="" />
              <div className="hero__cardTitle">{t('landing.cardTitle')}</div>
              <div className="hero__cardText">
                {t('landing.cardText')}
              </div>
              <div className="hero__cardChips">
                <span className="chip">Postgres</span>
                <span className="chip">React</span>
                <span className="chip">API</span>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="features" aria-labelledby="features-title">
          <div className="sectionTitle">
            <h2 id="features-title">{t('landing.featuresTitle')}</h2>
            <p>{t('landing.featuresSubtitle')}</p>
          </div>

          <div className="features__grid">
            <article className="feature" aria-label={t('landing.featureSearchTitle')}>
              <h3>{t('landing.featureSearchTitle')}</h3>
              <p>{t('landing.featureSearchText')}</p>
            </article>
            <article className="feature" aria-label={t('landing.featurePaginationTitle')}>
              <h3>{t('landing.featurePaginationTitle')}</h3>
              <p>{t('landing.featurePaginationText')}</p>
            </article>
            <article className="feature" aria-label={t('landing.featurePersistenceTitle')}>
              <h3>{t('landing.featurePersistenceTitle')}</h3>
              <p>{t('landing.featurePersistenceText')}</p>
            </article>
            <article className="feature" aria-label={t('landing.featureValidationTitle')}>
              <h3>{t('landing.featureValidationTitle')}</h3>
              <p>{t('landing.featureValidationText')}</p>
            </article>
            <article className="feature" aria-label={t('landing.featureAuthTitle')}>
              <h3>{t('landing.featureAuthTitle')}</h3>
              <p>{t('landing.featureAuthText')}</p>
            </article>
            <article className="feature" aria-label="Toasts">
              <h3>{t('landing.featureToastsTitle')}</h3>
              <p>{t('landing.featureToastsText')}</p>
            </article>
          </div>
        </section>

        <section className="how" aria-labelledby="how-title">
          <div className="sectionTitle">
            <h2 id="how-title">{t('landing.howTitle')}</h2>
            <p>{t('landing.howSubtitle')}</p>
          </div>

          <ol className="how__steps">
            <li>
              <strong>{t('landing.howStep1Title')}</strong>
              <span>{t('landing.howStep1Text')}</span>
            </li>
            <li>
              <strong>{t('landing.howStep2Title')}</strong>
              <span>{t('landing.howStep2Text')}</span>
            </li>
            <li>
              <strong>{t('landing.howStep3Title')}</strong>
              <span>{t('landing.howStep3Text')}</span>
            </li>
          </ol>

          <div className="how__cta">
            <Link className="btn btn--primary" to="/livros/cadastro">{t('landing.howCtaRegister')}</Link>
            <Link className="btn btn--secondary" to="/livros">{t('landing.howCtaOpenCatalog')}</Link>
          </div>
        </section>

        <section className="finalCta" aria-label={t('landing.finalAria')}>
          <div className="finalCta__box">
            <h2>{t('landing.finalTitle')}</h2>
            <p>{t('landing.finalSubtitle')}</p>
            <div className="finalCta__actions">
              <Link className="btn btn--primary" to="/login">{t('landing.finalCtaSignIn')}</Link>
              <Link className="btn btn--ghost" to="/livros">{t('landing.finalCtaSeeBooks')}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" aria-label={t('landing.footerLabel')}>
        <div className="footer__inner">
          <div className="footer__brand">
            <img src={logo} alt={t('landing.footerLogoAlt')} />
            <span>Central Online Library</span>
          </div>

          <nav className="footer__links" aria-label={t('landing.footerLinksLabel')}>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }}>{t('landing.footerFeatures')}</a>
            <Link to="/livros">{t('nav.books')}</Link>
            <Link to="/login">{t('nav.login')}</Link>
          </nav>

          <div className="footer__copy">© {currentYear} Central Online Library</div>
        </div>
      </footer>
    </div>
  );
}
