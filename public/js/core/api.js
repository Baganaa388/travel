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
    throw new ApiError(0, 'Сүлжээнд холбогдож чадсангүй');
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
    throw new ApiError(res.status, data?.error || `Алдаа гарлаа (${res.status})`, data?.details);
  }
  return data;
}

export const get = (path) => request(path);

export const post = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

/* ---- Нөөцүүд ------------------------------------------------------------ */
export const getTours = () => get('/tours').then((d) => d.tours);
export const getTour = (slug) => get(`/tours/${encodeURIComponent(slug)}`).then((d) => d.tour);
export const getGallery = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return get(`/gallery${q ? `?${q}` : ''}`).then((d) => d.photos);
};
export const getSettings = () => get('/settings').then((d) => d.settings);

export const sendChat = (body) => post('/chat/messages', body);
export const pollChat = (token, after) =>
  get(`/chat/messages?token=${encodeURIComponent(token)}&after=${after}`);
