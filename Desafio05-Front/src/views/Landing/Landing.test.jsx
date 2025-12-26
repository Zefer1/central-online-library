import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';
import { AuthProvider } from '../../auth/AuthContext';
import { ToastProvider } from '../../components/Toast/ToastProvider';

describe('Landing page', () => {
  it('renders hero and main CTAs', () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <Landing />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Organize, pesquise e gerencie livros/i })).toBeInTheDocument();

    const actions = screen.getByLabelText(/Ações principais/i);
    expect(within(actions).getByRole('link', { name: /Entrar/i })).toBeInTheDocument();
    expect(within(actions).getByRole('link', { name: /Ver catálogo/i })).toBeInTheDocument();
  });

  it('renders features section', () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <Landing />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Feito para o dia a dia/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Paginação$/i })).toBeInTheDocument();
  });
});
