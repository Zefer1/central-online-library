import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import "./index.scss";

function SubmenuLivros() {
  const { isAuthenticated } = useAuth();

  return (
    <div className='submenu'>        
        <ul>
            {isAuthenticated ? (
              <li><Link to="/livros/cadastro">Cadastrar Livro</Link></li>
            ) : (
              <li><Link to="/login">Login para cadastrar</Link></li>
            )}
        </ul>        
    </div>
  )
}

export default SubmenuLivros
