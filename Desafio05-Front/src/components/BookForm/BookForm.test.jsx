import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BookForm } from './BookForm';

const sample = { titulo: 'Foo', num_paginas: 100, isbn: '123', editora: 'Bar' };

describe('BookForm', () => {
  it('submits parsed book data', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<BookForm initialValue={sample} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Baz' } });
    fireEvent.change(screen.getByLabelText(/Número de Páginas/i), { target: { value: '321' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ titulo: 'Baz', num_paginas: 321 });
  });

  it('shows error message when submit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    render(<BookForm initialValue={sample} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

    await screen.findByText(/boom/i);
  });
});
