import { StrictMode } from 'react'
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
import BookDetail from './views/BookDetail/BookDetail';
import Login from './views/Login/Login';
import Register from './views/Register/Register';
import Settings from './views/Settings/Settings';
import { ToastProvider } from './components/Toast/ToastProvider';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { SettingsProvider } from './settings/SettingsContext';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/livros/detalhe/:livroId",
    element: <BookDetail />,
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
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/settings",
    element: (
      <RequireAuth>
        <Settings />
      </RequireAuth>
    ),
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
