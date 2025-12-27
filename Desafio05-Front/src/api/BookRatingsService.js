import { client } from './LivrosService';

export class BookRatingsService {
  static async getSummary(bookId) {
    const res = await client.get(`/api/books/${bookId}/ratings/summary`);
    return res.data?.data;
  }

  static async listRatings(bookId, { page = 1, pageSize = 5 } = {}) {
    const res = await client.get(`/api/books/${bookId}/ratings`, { params: { page, pageSize } });
    return res.data;
  }

  static async submitRating(bookId, payload) {
    const res = await client.post(`/api/books/${bookId}/ratings`, payload);
    return res.data;
  }

  static async updateRating(bookId, payload) {
    const res = await client.put(`/api/books/${bookId}/ratings`, payload);
    return res.data;
  }
}
