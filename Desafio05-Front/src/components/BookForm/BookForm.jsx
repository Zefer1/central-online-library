import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import './index.scss';

const emptyBook = { titulo: '', num_paginas: '', isbn: '', editora: '' };

export function BookForm({ initialValue = emptyBook, onSubmit, submitting = false, title }) {
  const [livro, setLivro] = useState(initialValue);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    setLivro(initialValue || emptyBook);
  }, [initialValue]);

  const handleChange = (field) => (e) => {
    setLivro((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...livro,
        num_paginas: Number(livro.num_paginas),
      });
    } catch (err) {
      const message = err?.response?.data?.error?.message || err.message || t('errors.saveBook');
      setError(message);
    }
  };

  return (
    <div className="book-form card">
      {title && <h1>{title}</h1>}
      <form onSubmit={handleSubmit}>
        <div className='form-group'>
          <label htmlFor="titulo">{t('bookForm.title')}</label>
          <input
            id="titulo"
            type="text"
            value={livro.titulo}
            onChange={handleChange('titulo')}
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor="num_paginas">{t('bookForm.pages')}</label>
          <input
            id="num_paginas"
            type="number"
            value={livro.num_paginas}
            onChange={handleChange('num_paginas')}
            required
            min={1}
          />
        </div>
        <div className='form-group'>
          <label htmlFor="isbn">{t('bookForm.isbn')}</label>
          <input
            id="isbn"
            type="text"
            value={livro.isbn}
            onChange={handleChange('isbn')}
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor="editora">{t('bookForm.publisher')}</label>
          <input
            id="editora"
            type="text"
            value={livro.editora}
            onChange={handleChange('editora')}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? t('bookForm.saving') : t('bookForm.save')}
        </button>
      </form>
    </div>
  );
}
