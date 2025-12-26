import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';
import logo from '../../assets/logo.png';
import './index.scss';

export default function Landing() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="landing">
      <Header />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__content">
            <p className="hero__badge">Central Online Library</p>
            <h1 id="hero-title">Organize, pesquise e gerencie livros sem complicação</h1>
            <p className="hero__subtitle">
              Uma biblioteca online com autenticação, paginação, filtros e persistência em Postgres.
              Pensada para ser rápida, simples e segura.
            </p>

            <div className="hero__actions" aria-label="Ações principais">
              <Link className="btn btn--primary" to="/login">Entrar</Link>
              <Link className="btn btn--secondary" to="/livros">Ver catálogo</Link>
              <button className="btn btn--ghost" type="button" onClick={scrollToFeatures}>
                Saber mais
              </button>
            </div>

            <dl className="hero__stats" aria-label="Destaques">
              <div className="stat">
                <dt>Busca</dt>
                <dd>rápida</dd>
              </div>
              <div className="stat">
                <dt>Paginação</dt>
                <dd>nativa</dd>
              </div>
              <div className="stat">
                <dt>Auth</dt>
                <dd>JWT</dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__card">
              <img className="hero__logo" src={logo} alt="" />
              <div className="hero__cardTitle">Seu catálogo em um só lugar</div>
              <div className="hero__cardText">
                Cadastre livros com ISBN único, edite com segurança e encontre tudo com filtros.
              </div>
              <div className="hero__cardChips">
                <span className="chip">Postgres</span>
                <span className="chip">React</span>
                <span className="chip">API</span>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="features" aria-labelledby="features-title">
          <div className="sectionTitle">
            <h2 id="features-title">Feito para o dia a dia</h2>
            <p>O essencial para gerir uma biblioteca com fluidez.</p>
          </div>

          <div className="features__grid">
            <article className="feature" aria-label="Pesquisa e filtros">
              <h3>Pesquisa e filtros</h3>
              <p>Filtre por editora/ISBN, pesquise por texto e ordene resultados.</p>
            </article>
            <article className="feature" aria-label="Paginação">
              <h3>Paginação</h3>
              <p>Mais performance e melhor UX com paginação e tamanhos de página.</p>
            </article>
            <article className="feature" aria-label="Persistência">
              <h3>Persistência</h3>
              <p>Dados persistidos em Postgres, com bootstrap/seed no arranque.</p>
            </article>
            <article className="feature" aria-label="Validação e erros">
              <h3>Validação e erros</h3>
              <p>Validação no backend e respostas consistentes para falhas e sucesso.</p>
            </article>
            <article className="feature" aria-label="Autenticação">
              <h3>Autenticação</h3>
              <p>Login com JWT e rotas protegidas para criação e edição de livros.</p>
            </article>
            <article className="feature" aria-label="Toasts">
              <h3>Feedback instantâneo</h3>
              <p>Toasts para sucesso/erro, mantendo o utilizador informado.</p>
            </article>
          </div>
        </section>

        <section className="how" aria-labelledby="how-title">
          <div className="sectionTitle">
            <h2 id="how-title">Como funciona</h2>
            <p>Em três passos rápidos.</p>
          </div>

          <ol className="how__steps">
            <li>
              <strong>Entre</strong>
              <span>Use a página de login para obter o token.</span>
            </li>
            <li>
              <strong>Explore</strong>
              <span>Veja o catálogo e use busca, filtros e ordenação.</span>
            </li>
            <li>
              <strong>Gerencie</strong>
              <span>Cadastre e edite livros (rotas protegidas).</span>
            </li>
          </ol>

          <div className="how__cta">
            <Link className="btn btn--primary" to="/livros/cadastro">Cadastrar um livro</Link>
            <Link className="btn btn--secondary" to="/livros">Abrir catálogo</Link>
          </div>
        </section>

        <section className="finalCta" aria-label="Chamada final">
          <div className="finalCta__box">
            <h2>Pronto para começar?</h2>
            <p>Faça login e comece a gerir sua biblioteca agora.</p>
            <div className="finalCta__actions">
              <Link className="btn btn--primary" to="/login">Entrar</Link>
              <Link className="btn btn--ghost" to="/livros">Ver livros</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" aria-label="Rodapé">
        <div className="footer__inner">
          <div className="footer__brand">
            <img src={logo} alt="Biblioteca Central Online" />
            <span>Central Online Library</span>
          </div>

          <nav className="footer__links" aria-label="Links">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }}>Features</a>
            <Link to="/livros">Livros</Link>
            <Link to="/login">Login</Link>
          </nav>

          <div className="footer__copy">© {currentYear} Central Online Library</div>
        </div>
      </footer>
    </div>
  );
}
