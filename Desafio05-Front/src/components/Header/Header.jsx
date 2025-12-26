import React from 'react';
import { Link } from 'react-router-dom';
import logo from "../../assets/logo.png";
import { useAuth } from '../../auth/AuthContext';
import "./index.scss";

function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className='header'>
      <div className='header__inner container'>
        <Link to="/" className="header__brand" aria-label="Ir para a landing page">
          <img src={logo} alt="Biblioteca Central Online Logo" />
          <span>Central Online Library</span>
        </Link>

        <nav className="header__nav" aria-label="Navegação principal">
          <ul className="header__links">
            <li><Link className="header__link" to="/livros">Livros</Link></li>
            {isAuthenticated ? (
              <li><Link className="header__link" to="/settings">Definições</Link></li>
            ) : null}
            {!isAuthenticated ? (
              <li><Link className="btn btn--primary header__cta" to="/login">Login</Link></li>
            ) : (
              <li>
                <button type="button" className="btn btn--secondary header__cta" onClick={logout}>
                  Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header