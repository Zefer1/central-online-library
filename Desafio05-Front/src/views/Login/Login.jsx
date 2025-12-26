import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast/ToastProvider';
import './index.scss';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/livros';

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      toast.push({ type: 'success', message: 'Login efetuado' });
      navigate(from, { replace: true });
    } catch (err) {
      const message = err?.response?.data?.error?.message || err.message || 'Erro no login';
      toast.push({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="page login">
        <PageTitle title="Login" subtitle="Entre para cadastrar e editar livros." />
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </div>
    </>
  );
}
