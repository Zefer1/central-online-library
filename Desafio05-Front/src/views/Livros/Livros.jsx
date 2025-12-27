import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import SubmenuLivros from '../../components/SubmenuLivros/SubmenuLivros'
import { LivrosService } from '../../api/LivrosService'
import { useToast } from '../../components/Toast/ToastProvider'
import { PageTitle } from '../../components/PageTitle/PageTitle'
import { useSettings } from '../../settings/SettingsContext'
import { useTranslation } from '../../i18n/useTranslation'
import "./index.scss"

function mapDefaultSort(defaultSort) {
  switch (defaultSort) {
    case 'title':
      return { sort: 'titulo', order: 'asc' }
    case 'publisher':
      return { sort: 'editora', order: 'asc' }
    case 'newest':
    default:
      return { sort: 'created_at', order: 'desc' }
  }
}

const Livros = () => {
  const { settings } = useSettings()
  const { t } = useTranslation()
  const [livros, setLivros] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => settings.pageSize)
  const [q, setQ] = useState('')
  const initialSort = mapDefaultSort(settings.defaultSort)
  const [sort, setSort] = useState(() => initialSort.sort)
  const [order, setOrder] = useState(() => initialSort.order)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState('')
  const toast = useToast()

  const qRef = useRef(q)
  useEffect(() => {
    qRef.current = q
  }, [q])

  const getLivros = useCallback(async (currentPage = page, currentQ = q, currentSort = sort, currentOrder = order, currentPageSize = pageSize) => {
    try {
      setLoading(true)
      setError('')
      const { data, pagination } = await LivrosService.getLivros({
        page: currentPage,
        pageSize: currentPageSize,
        q: currentQ,
        sort: currentSort,
        order: currentOrder,
      })
      setLivros(data)
      setTotalPages(pagination?.totalPages || 1)
      setPage(pagination?.page || currentPage)
    } catch (err) {
      const message = err?.response?.data?.error?.message || t('errors.loadBooks')
      setError(message)
      setLivros([])
    } finally {
      setLoading(false)
    }
  }, [order, page, pageSize, q, sort, t])

  const deleteLivro = useCallback(async (id) => {
    if (confirm(t('books.deleteConfirm', { id }))) {
      try {
        const { message } = await LivrosService.deleteLivro(id)
        toast.push({ type: 'success', message })
        getLivros()
      } catch (err) {
        const message = err?.response?.data?.error?.message || t('errors.deleteBook')
        toast.push({ type: 'error', message })
      }
    }
  }, [getLivros, t, toast])

  useEffect(() => {
    getLivros()
  }, [getLivros])

  useEffect(() => {
    const nextPageSize = settings.pageSize
    const next = mapDefaultSort(settings.defaultSort)
    setPageSize(nextPageSize)
    setSort(next.sort)
    setOrder(next.order)
    // Keep the current query without re-running on every keystroke.
    getLivros(1, qRef.current, next.sort, next.order, nextPageSize)
  }, [getLivros, settings.defaultSort, settings.pageSize])

  const handleSearch = (e) => {
    e.preventDefault()
    getLivros(1, q, sort, order, pageSize)
  }

  const goToPage = (nextPage) => {
    const target = Math.min(Math.max(nextPage, 1), totalPages)
    if (target === page) return
    getLivros(target, q, sort, order, pageSize)
  }

  return (
    <>
      <Header/>
      <SubmenuLivros/>
      <div className='page livros'>
        <PageTitle
          title={t('books.title')}
          subtitle={t('books.subtitle')}
        />

        <form className='filter' onSubmit={handleSearch}>
          <input
            type="search"
            placeholder={t('books.searchPlaceholder')}
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value
              setSort(next)
              getLivros(1, q, next, order, pageSize)
            }}
            aria-label={t('books.sortByAria')}
          >
            <option value="created_at">{t('books.recent')}</option>
            <option value="titulo">{t('settings.sortTitle')}</option>
            <option value="editora">{t('books.publisher')}</option>
            <option value="num_paginas">{t('books.pages')}</option>
          </select>
          <select
            value={order}
            onChange={(e) => {
              const next = e.target.value
              setOrder(next)
              getLivros(1, q, sort, next, pageSize)
            }}
            aria-label={t('books.orderAria')}
          >
            <option value="desc">{t('books.desc')}</option>
            <option value="asc">{t('books.asc')}</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value)
              setPageSize(next)
              getLivros(1, q, sort, order, next)
            }}
            aria-label={t('books.itemsPerPageAria')}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button type="submit">{t('books.search')}</button>
        </form>

        {loading ? (
          <div className="skeleton" aria-label={t('books.loadingAria')} aria-busy="true">
            <div className="skeleton__grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton__card">
                  <div className="skeleton__line skeleton__line--title" />
                  <div className="skeleton__line" />
                  <div className="skeleton__line skeleton__line--short" />
                  <div className="skeleton__actions">
                    <div className="skeleton__pill" />
                    <div className="skeleton__pill" />
                  </div>
                </div>
              ))}
            </div>
            <p className="skeleton__sr">{t('books.loading')}</p>
          </div>
        ) : error ? (
          <p className='error'>{error}</p>
        ) : (
          <>
            <ul>
              {livros && livros.length > 0 ? (
                livros.map(l => (
                  <li key={l.id}>
                    <div>
                      <strong>{l.titulo}</strong> <span>{l.editora}</span>
                      <small>{t('books.isbnLine', { isbn: l.isbn, pages: l.num_paginas })}</small>
                    </div>
                    <div className='botoes'>
                      <Link className='btn details' to={`/livros/detalhe/${l.id}`} aria-label={t('books.details')}>
                        {t('books.details')}
                      </Link>
                      <Link className='btn edit' to={`/livros/edicao/${l.id}`}>✎</Link>
                      <button className='btn delete' type="button" onClick={()=>deleteLivro(l.id)}>🗑️</button>
                    </div>
                  </li>
                ))
              ) : (
                <p>{t('books.noneFound')}</p>
              )}
            </ul>

            <div className='pagination'>
              <button type="button" onClick={()=>goToPage(page-1)} disabled={page<=1}>{t('books.previous')}</button>
              <span>{t('books.pageOf', { page, total: totalPages })}</span>
              <button type="button" onClick={()=>goToPage(page+1)} disabled={page>=totalPages}>{t('books.next')}</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Livros