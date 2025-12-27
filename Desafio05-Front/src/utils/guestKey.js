const STORAGE_KEY = 'col_guest_key';

export function getGuestKey() {
  if (typeof window === 'undefined') return 'guest-server';

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch (_err) {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
