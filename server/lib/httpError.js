/* Хяналттай HTTP алдаа — client рүү зөвхөн энэ мессеж очно. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (m = 'Буруу хүсэлт', d) => new HttpError(400, m, d);
export const unauthorized = (m = 'Нэвтрэх шаардлагатай') => new HttpError(401, m);
export const forbidden = (m = 'Зөвшөөрөлгүй') => new HttpError(403, m);
export const notFound = (m = 'Олдсонгүй') => new HttpError(404, m);
export const tooMany = (m = 'Хэт олон хүсэлт') => new HttpError(429, m);
