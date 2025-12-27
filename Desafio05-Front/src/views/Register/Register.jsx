import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast/ToastProvider';
import { useTranslation } from '../../i18n/useTranslation';
import './index.scss';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const { t } = useTranslation();

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/livros';

  const onSubmit = async (e) => {
    e.preventDefault();

    setRegistrationDisabled(false);

    if (password !== confirmPassword) {
      toast.push({ type: 'error', message: t('errors.passwordMismatch') });
      return;
    }

    setLoading(true);
    try {
      await register({ username, password });
      toast.push({ type: 'success', message: t('register.success') });
      navigate(from, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setRegistrationDisabled(true);
        toast.push({ type: 'error', message: t('errors.registrationDisabled') });
      } else {
        const message = err?.response?.data?.error?.message || err.message || t('errors.register');
        toast.push({ type: 'error', message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="page register">
        <PageTitle title={t('register.title')} subtitle={t('register.subtitle')} />
        <form onSubmit={onSubmit}>
          {registrationDisabled ? (
            <div className="register__banner" role="alert">
              {t('errors.registrationDisabled')}
            </div>
          ) : null}
          <div className="form-group">
            <label htmlFor="username">{t('register.username')}</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('register.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('register.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? t('register.signingUp') : t('register.signUp')}
          </button>

          <p className="register__footer">
            {t('register.haveAccount')}{' '}
            <Link to="/login">{t('register.signInLink')}</Link>
          </p>
        </form>
      </div>
    </>
  );
}
