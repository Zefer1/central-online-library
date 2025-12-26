import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import SubmenuLivros from '../../components/SubmenuLivros/SubmenuLivros'
import { LivrosService } from '../../api/LivrosService'
import { useToast } from '../../components/Toast/ToastProvider'
import { PageTitle } from '../../components/PageTitle/PageTitle'
import "./index.scss"

const Livros = () => {
  const [livros, setLivros] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState('')
  const toast = useToast()

  async function getLivros(currentPage = page, currentQ = q, currentSort = sort, currentOrder = order, currentPageSize = pageSize) {
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
      const message = err?.response?.data?.error?.message || 'Erro ao carregar livros'
      setError(message)
      setLivros([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteLivro(id) {
    if (confirm(`Você realmente deseja remover o livro de ID: ${id}?`)) {
      try {
        const { message } = await LivrosService.deleteLivro(id)
        toast.push({ type: 'success', message })
        getLivros()
      } catch (err) {
        const message = err?.response?.data?.error?.message || 'Erro ao deletar livro'
        toast.push({ type: 'error', message })
      }
    }
  }

  useEffect(() => { 
    getLivros() 
  }, [])

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
          title="Escolha o seu livro"
          subtitle="Pesquise, ordene e navegue com paginação."
        />

        <form className='filter' onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Buscar por título ou editora"
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
            aria-label="Ordenar por"
          >
            <option value="created_at">Mais recentes</option>
            <option value="titulo">Título</option>
            <option value="editora">Editora</option>
            <option value="num_paginas">Páginas</option>
          </select>
          <select
            value={order}
            onChange={(e) => {
              const next = e.target.value
              setOrder(next)
              getLivros(1, q, sort, next, pageSize)
            }}
            aria-label="Ordem"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value)
              setPageSize(next)
              getLivros(1, q, sort, order, next)
            }}
            aria-label="Itens por página"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button type="submit">Buscar</button>
        </form>

        {loading ? (
          <div className="skeleton" aria-label="Carregando livros" aria-busy="true">
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
            <p className="skeleton__sr">Carregando livros...</p>
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
                      <small>ISBN: {l.isbn} • {l.num_paginas} páginas</small>
                    </div>
                    <div className='botoes'>
                      <Link className='btn edit' to={`/livros/edicao/${l.id}`}>✎</Link>
                      <button className='btn delete' type="button" onClick={()=>deleteLivro(l.id)}>🗑️</button>
                    </div>
                  </li>
                ))
              ) : (
                <p>Nenhum livro encontrado</p>
              )}
            </ul>

            <div className='pagination'>
              <button type="button" onClick={()=>goToPage(page-1)} disabled={page<=1}>Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button type="button" onClick={()=>goToPage(page+1)} disabled={page>=totalPages}>Próxima</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Livros