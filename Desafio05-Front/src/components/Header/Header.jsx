import { Link } from 'react-router-dom';
import logo from "../../assets/logo.png";
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import "./index.scss";

function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className='header'>
      <div className='header__inner container'>
        <Link to="/" className="header__brand" aria-label={t('nav.goToLanding')}>
          <img src={logo} alt={t('nav.logoAlt')} />
          <span>Central Online Library</span>
        </Link>

        <nav className="header__nav" aria-label={t('nav.mainNavLabel')}>
          <ul className="header__links">
            <li><Link className="header__link" to="/livros">{t('nav.books')}</Link></li>
            {isAuthenticated ? (
              <li><Link className="header__link" to="/settings">{t('nav.settings')}</Link></li>
            ) : null}
            {!isAuthenticated ? (
              <>
                <li><Link className="btn btn--secondary header__cta" to="/register">{t('nav.register')}</Link></li>
                <li><Link className="btn btn--primary header__cta" to="/login">{t('nav.login')}</Link></li>
              </>
            ) : (
              <li>
                <button type="button" className="btn btn--secondary header__cta" onClick={logout}>
                  {t('nav.logout')}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header