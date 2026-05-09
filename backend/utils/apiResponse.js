export const ok = (res, { message = "OK", data = null, status = 200, meta } = {}) =>
  res.status(status).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });

export const fail = (
  res,
  { message = "Request failed", status = 500, data = null, code } = {}
) =>
  res.status(status).json({
    success: false,
    message,
    data,
    ...(code ? { code } : {}),
  });

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
