/* zod схемээр body/query шалгах. Алдаа гарвал 400 + талбар тус бүрийн тайлбар. */
import { badRequest } from '../lib/httpError.js';

function run(schema, data, next, assign) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const details = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!details[key]) details[key] = issue.message;
    }
    return next(badRequest('Оруулсан утга буруу байна', details));
  }
  assign(parsed.data);
  next();
}

export const validateBody = (schema) => (req, res, next) =>
  run(schema, req.body ?? {}, next, (v) => {
    req.valid = v;
  });

export const validateQuery = (schema) => (req, res, next) =>
  run(schema, req.query ?? {}, next, (v) => {
    req.validQuery = v;
  });
