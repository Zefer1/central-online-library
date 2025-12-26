import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Livros from './Livros';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { AuthProvider } from '../../auth/AuthContext';

vi.mock('../../api/LivrosService', () => {
  const data = [
    { id: 1, titulo: 'Clean Code', num_paginas: 464, isbn: '978', editora: 'PH' },
    { id: 2, titulo: 'Refactoring', num_paginas: 448, isbn: '979', editora: 'AW' },
  ];
  return {
    LivrosService: {
      getLivros: vi.fn().mockResolvedValue({ data, pagination: { page: 1, totalPages: 1, total: 2, pageSize: 10 } }),
      deleteLivro: vi.fn().mockResolvedValue({ message: 'ok' }),
    },
  };
});

const { LivrosService } = await import('../../api/LivrosService');

describe('Livros view', () => {
  beforeEach(() => {
    window.confirm = vi.fn().mockReturnValue(true);
    window.alert = vi.fn();
  });

  it('renders list from service', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <Livros />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(LivrosService.getLivros).toHaveBeenCalled());
    expect(await screen.findByText(/Clean Code/)).toBeInTheDocument();
    expect(screen.getByText(/Refactoring/)).toBeInTheDocument();
  });

  it('deletes after confirmation', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <Livros />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    );

    await screen.findByText(/Clean Code/);
    fireEvent.click(screen.getAllByRole('button', { name: '🗑️' })[0]);
    await waitFor(() => expect(LivrosService.deleteLivro).toHaveBeenCalled());
  });
});
