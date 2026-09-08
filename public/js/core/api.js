/* ==========================================================================
   api.js — /api хүсэлтийн нимгэн бүрхүүл. Алдааг Error болгож шиднэ.
   ========================================================================== */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: { accept: 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new ApiError(0, 'Network error');
  }

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Error (${res.status})`, data?.details);
  }
  return data;
}

export const get = (path) => request(path);

/* ---- Нөөцүүд ------------------------------------------------------------ */
export const getCategories = () => get('/tours').then((d) => d.categories);
export const getGallery = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return get(`/gallery${q ? `?${q}` : ''}`).then((d) => d.photos);
};
export const getSettings = () => get('/settings').then((d) => d.settings);
export const getTour = (slug) => get(`/tours/${encodeURIComponent(slug)}`).then((d) => d.tour);
