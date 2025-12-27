import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';
import { AuthProvider } from '../../auth/AuthContext';
import { ToastProvider } from '../../components/Toast/ToastProvider';

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
    },
  };
});

const axios = (await import('axios')).default;

describe('Register view', () => {
  it('shows friendly message when registration is disabled', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 403 } });

    render(
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter>
            <Register />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /regist(ar|er)/i }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/(Registration is disabled|O registo est[aá] desativado)/i);
  });
});
