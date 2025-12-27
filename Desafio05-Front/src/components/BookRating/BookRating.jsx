import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookRatingsService } from '../../api/BookRatingsService';
import { useToast } from '../Toast/ToastProvider';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import { getGuestKey } from '../../utils/guestKey';
import './index.scss';

const defaultSummary = { avg: 0, total: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

function normalizeSummary(summary) {
  if (!summary) return defaultSummary;
  const counts = { ...defaultSummary.counts, ...(summary.counts || {}) };
  return {
    avg: Number(summary.avg || 0),
    total: Number(summary.total || 0),
    counts,
  };
}

export function BookRating({ bookId }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [review, setReview] = useState('');
  const [open, setOpen] = useState(false);
  const fingerprint = useMemo(() => getGuestKey(), []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await BookRatingsService.getSummary(bookId);
      setSummary(normalizeSummary(data));
    } catch (err) {
      console.error(err);
      toast.push({ type: 'error', message: t('ratings.errors.load') });
    } finally {
      setLoading(false);
    }
  }, [bookId, t, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  async function submitRating() {
    if (!selectedRating) {
      toast.push({ type: 'error', message: t('ratings.errors.missingRating') });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { rating: selectedRating, review: review.trim() || undefined };
      // Always send ip_fingerprint so the backend can accept the rating even if the auth token is missing/invalid.
      payload.ip_fingerprint = fingerprint;
      await BookRatingsService.submitRating(bookId, payload);
      toast.push({ type: 'success', message: t('ratings.success') });
      await fetchSummary();
      setOpen(false);
    } catch (err) {
      const message = err?.response?.data?.error?.message || t('ratings.errors.submit');
      toast.push({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  }

  const histogram = [5, 4, 3, 2, 1].map((score) => {
    const count = summary.counts?.[score] || 0;
    const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
    return { score, count, pct };
  });

  const totalLabel = summary.total === 1
    ? t('ratings.totalOne')
    : t('ratings.totalMany', { count: summary.total });

  const selectedLabel = selectedRating
    ? t('ratings.selected', { value: selectedRating, suffix: selectedRating === 1 ? '' : 's' })
    : '';

  return (
    <section className="book-rating" aria-label={t('ratings.sectionLabel')}>
      <header className="book-rating__header">
        <div>
          <p className="book-rating__label">{t('ratings.summaryLabel')}</p>
          <div className="book-rating__meta">
            <strong className="book-rating__avg">{summary.avg.toFixed(1)}</strong>
            <span className="book-rating__total">{totalLabel}</span>
          </div>
        </div>
        <div className="book-rating__stars" aria-label={t('ratings.averageLabel', { value: summary.avg.toFixed(1) })}>
          {Array.from({ length: 5 }).map((_, idx) => {
            const filled = idx + 1 <= Math.round(summary.avg);
            return <span key={idx} aria-hidden="true">{filled ? '★' : '☆'}</span>;
          })}
        </div>
        <button type="button" className="book-rating__cta" onClick={() => setOpen(true)}>
          {t('ratings.action')}
        </button>
      </header>

      <div className="book-rating__histogram" aria-label={t('ratings.histogramLabel')}>
        {histogram.map((item) => (
          <div key={item.score} className="book-rating__bar" aria-label={t('ratings.count', { score: item.score, count: item.count })}>
            <span className="book-rating__bar-label">{item.score}★</span>
            <div className="book-rating__bar-track">
              <div className="book-rating__bar-fill" style={{ width: `${item.pct}%` }} />
            </div>
            <span className="book-rating__bar-count">{item.count}</span>
          </div>
        ))}
      </div>

      {open && (
        <div className="book-rating__modal" role="dialog" aria-modal="true" aria-label={t('ratings.modalTitle')}>
          <div className="book-rating__modal-body">
            <button type="button" className="book-rating__close" onClick={() => setOpen(false)} aria-label={t('ratings.close')}>
              ×
            </button>
            <h3>{t('ratings.modalTitle')}</h3>
            <p className="book-rating__hint">{t('ratings.hint')}</p>

            <div className="book-rating__selector" role="radiogroup" aria-label={t('ratings.selectorLabel')}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const score = idx + 1;
                const checked = score === selectedRating;
                return (
                  <button
                    key={score}
                    type="button"
                    className={`book-rating__star ${checked ? 'is-active' : ''}`}
                    onClick={() => setSelectedRating(score)}
                    role="radio"
                    aria-checked={checked}
                    aria-label={t('ratings.star', { value: score })}
                  >
                    {score <= selectedRating ? '★' : '☆'}
                  </button>
                );
              })}
            </div>

            {selectedLabel && (
              <p className="book-rating__hint" aria-live="polite">{selectedLabel}</p>
            )}

            <label className="book-rating__label" htmlFor="review-text">
              {t('ratings.reviewLabel')}
            </label>
            <textarea
              id="review-text"
              rows="4"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t('ratings.reviewPlaceholder')}
            />

            {!isAuthenticated && (
              <p className="book-rating__anon">{t('ratings.anonymousWarning')}</p>
            )}

            <div className="book-rating__actions">
              <button type="button" onClick={() => setOpen(false)} className="book-rating__secondary">
                {t('ratings.cancel')}
              </button>
              <button type="button" onClick={submitRating} disabled={submitting} className="book-rating__primary">
                {submitting ? t('ratings.submitting') : t('ratings.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="book-rating__loading">{t('ratings.loading')}</p>}
    </section>
  );
}
