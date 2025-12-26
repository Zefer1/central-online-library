import axios from 'axios';

import { getStoredToken } from '../auth/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = getStoredToken() || DEFAULT_TOKEN;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class LivrosService {
  static async getLivros({ page = 1, pageSize = 10, q = '', sort = 'created_at', order = 'desc', isbn = '', editora = '' } = {}) {
    const params = { page, pageSize, sort, order };
    if (q) params.q = q;
    if (isbn) params.isbn = isbn;
    if (editora) params.editora = editora;
    const response = await client.get('/livros', { params });
    return response.data;
  }

  static async getLivro(id) {
    const response = await client.get(`/livros/${id}`);
    return response.data;
  }

  static async createLivro(body) {
    const response = await client.post('/livros', body);
    return response.data;
  }

  static async updateLivro(id, body) {
    const response = await client.put(`/livros/${id}`, body);
    return response.data;
  }

  static async deleteLivro(id) {
    const response = await client.delete(`/livros/${id}`);
    return response.data;
  }
}