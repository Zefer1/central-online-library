import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import "./index.scss";

function SubmenuLivros() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className='submenu'>        
        <ul>
            {isAuthenticated ? (
              <li><Link to="/livros/cadastro">{t('submenu.registerBook')}</Link></li>
            ) : (
              <li><Link to="/login">{t('submenu.loginToRegister')}</Link></li>
            )}
        </ul>        
    </div>
  )
}

export default SubmenuLivros
