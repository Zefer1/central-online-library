import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../../components/Header/Header'
import SubmenuLivros from '../../components/SubmenuLivros/SubmenuLivros'
import { LivrosService } from '../../api/LivrosService'
import { BookForm } from '../../components/BookForm/BookForm'
import { useToast } from '../../components/Toast/ToastProvider'
import "./index.scss"

const LivrosEdicao = () => {
  const { livroId } = useParams()
  const [livro, setLivro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data } = await LivrosService.getLivro(livroId)
        setLivro(data)
        setError('')
      } catch (err) {
        const message = err?.response?.data?.error?.message || 'Erro ao carregar livro'
        setError(message)
        setLivro(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [livroId])

  const saveEdit = async (body) => {
    setSaving(true)
    try {
      const { message } = await LivrosService.updateLivro(livroId, body)
      toast.push({ type: 'success', message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header/>
      <SubmenuLivros/>
      <div className='page livrosCadastro'>
        {loading ? (
          <p>Carregando...</p>
        ) : error ? (
          <p className='error'>{error}</p>
        ) : (
          <BookForm
            initialValue={livro}
            onSubmit={saveEdit}
            submitting={saving}
            title={`Edição do Livro #${livro?.id}`}
          />
        )}
      </div>
    </>
  )
}

export default LivrosEdicao
