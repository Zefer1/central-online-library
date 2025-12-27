import axios from 'axios';

import { getStoredToken } from '../auth/AuthContext';

const RUNTIME_API_URL =
  typeof window !== 'undefined' && window.__APP_CONFIG__ && typeof window.__APP_CONFIG__.API_URL === 'string'
    ? window.__APP_CONFIG__.API_URL
    : '';

const BASE_URL = RUNTIME_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_TOKEN = import.meta.env.VITE_API_TOKEN || '';

export const client = axios.create({
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

  static async generateAiSummary(id, { force = false } = {}) {
    const response = await client.post(`/api/books/${id}/ai-summary`, null, {
      params: { force },
    });
    return response.data;
  }
}