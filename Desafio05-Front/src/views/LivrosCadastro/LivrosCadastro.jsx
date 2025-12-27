import { useState } from 'react'
import Header from '../../components/Header/Header'
import SubmenuLivros from '../../components/SubmenuLivros/SubmenuLivros'
import { LivrosService } from '../../api/LivrosService'
import { BookForm } from '../../components/BookForm/BookForm'
import { useToast } from '../../components/Toast/ToastProvider'
import { useTranslation } from '../../i18n/useTranslation'
import "./index.scss"

const LivrosCadastro = () => {
  const [loading, setLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const toast = useToast()
  const { t } = useTranslation()

  const createLivro = async (livro) => {
    setLoading(true)
    try {
      await LivrosService.createLivro(livro)
      toast.push({ type: 'success', message: t('bookForm.created') })
      setFormKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header/>
      <SubmenuLivros/>
      <div className='page livrosCadastro'>
        <BookForm key={formKey} onSubmit={createLivro} submitting={loading} title={t('bookForm.createTitle')} />
      </div>
    </>
  )
}

export default LivrosCadastro