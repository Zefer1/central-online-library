import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import SubmenuLivros from '../../components/SubmenuLivros/SubmenuLivros';
import { LivrosService } from '../../api/LivrosService';
import { BookRating } from '../../components/BookRating/BookRating';
import { useTranslation } from '../../i18n/useTranslation';
import { useToast } from '../../components/Toast/ToastProvider';
import { useAuth } from '../../auth/AuthContext';
import './index.scss';

export default function BookDetail() {
  const { livroId } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiUpdatedAt, setAiUpdatedAt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const canRegenerate = isAuthenticated || !import.meta.env.PROD;

  function cleanAiSummary(text) {
    if (!text) return '';
    let s = String(text).trim();

    // Noise reduction: remove obvious metadata phrases already displayed elsewhere.
    s = s.replace(/\b(Editora|Publisher)\s*:\s*[^.]*\.?\s*/gi, '');
    s = s.replace(/\b(Páginas|Pages)\s*:\s*[^.]*\.?\s*/gi, '');
    s = s.replace(/\bISBN\s*:\s*[^.]*\.?\s*/gi, '');
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await LivrosService.getLivro(livroId);
        setBook(data);
        setAiSummary(data.ai_summary || '');
        setAiUpdatedAt(data.ai_summary_updated_at || '');
        setError('');
      } catch (err) {
        const message = err?.response?.data?.error?.message || t('errors.loadBook');
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [livroId, t]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await LivrosService.generateAiSummary(livroId, { force: !!aiSummary });
      const nextSummary = response?.data?.ai_summary || '';
      setAiSummary(nextSummary);
      setAiUpdatedAt(response?.data?.ai_summary_updated_at || '');
      toast.push({ type: 'success', message: t('bookDetail.aiSummaryTitle') });
    } catch (err) {
      const message = err?.response?.data?.error?.message || t('bookDetail.aiSummaryError');
      setAiError(message);
      toast.push({ type: 'error', message });
    } finally {
      setAiLoading(false);
    }
  };

  const cleanedSummary = cleanAiSummary(aiSummary);
  const hasMeaningfulSummary = cleanedSummary.trim().length >= 20;

  return (
    <>
      <Header />
      <SubmenuLivros />
      <div className="page book-detail">
        <div className="book-detail__header">
          <h1>{book?.titulo || t('books.title')}</h1>
          <p className="book-detail__subtitle">{t('books.subtitle')}</p>
          <div className="book-detail__links">
            <Link to="/livros" className="book-detail__link">{t('books.backToList')}</Link>
            <Link to={`/livros/edicao/${livroId}`} className="book-detail__link">{t('books.edit')}</Link>
          </div>
        </div>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="book-detail__grid">
            <div className="book-detail__card">
              <h2>{t('bookForm.title')}</h2>
              <p className="book-detail__line">{t('bookDetail.publisher', { editora: book.editora })}</p>
              <p className="book-detail__line">{t('bookDetail.pages', { pages: book.num_paginas })}</p>
              <p className="book-detail__line">ISBN: {book.isbn}</p>
              <p className="book-detail__muted">{t('bookDetail.id', { id: book.id })}</p>
            </div>
            <div className="book-detail__card">
              <h2>{t('bookDetail.aiSummaryTitle')}</h2>
              <p className="book-detail__muted">{t('bookDetail.aiSummaryHelper')}</p>

              {hasMeaningfulSummary ? (
                <>
                  <p className="book-detail__summary">{cleanedSummary}</p>
                  {aiUpdatedAt && <p className="book-detail__muted">{new Date(aiUpdatedAt).toLocaleString()}</p>}
                </>
              ) : (
                <p className="book-detail__muted">{t('bookDetail.aiSummaryUnavailable')}</p>
              )}
              {aiError && <p className="error">{aiError}</p>}

              {(!hasMeaningfulSummary || canRegenerate) && (
                <button
                  type="button"
                  className="book-detail__link"
                  onClick={generateAiSummary}
                  disabled={aiLoading}
                >
                  {aiLoading
                    ? t('bookDetail.aiSummaryLoading')
                    : hasMeaningfulSummary
                      ? t('bookDetail.aiSummaryRegenerate')
                      : t('bookDetail.aiSummaryGenerate')}
                </button>
              )}
            </div>
            <BookRating bookId={livroId} />
          </div>
        )}
      </div>
    </>
  );
}
