import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import './index.scss';
import Landing from './views/Landing/Landing';
import Home from './views/Home/Home';
import Livros from './views/Livros/Livros';
import LivrosCadastro from './views/LivrosCadastro/LivrosCadastro';
import LivrosEdicao from './views/LivrosEdicao/LivrosEdicao';
import Login from './views/Login/Login';
import { ToastProvider } from './components/Toast/ToastProvider';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/livros",
    element: <Livros/>,
  },
  {
    path: "/livros/cadastro",
    element: (
      <RequireAuth>
        <LivrosCadastro />
      </RequireAuth>
    ),
  },
  {
    path: "/livros/edicao/:livroId",
    element: (
      <RequireAuth>
        <LivrosEdicao />
      </RequireAuth>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>,
)
