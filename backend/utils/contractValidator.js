import { z } from "zod";

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body",
      data: {
        errors: result.error.flatten(),
      },
      code: "VALIDATION_ERROR",
    });
  }

  req.body = result.data;
  return next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      data: {
        errors: result.error.flatten(),
      },
      code: "VALIDATION_ERROR",
    });
  }

  req.query = result.data;
  return next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid route parameters",
      data: {
        errors: result.error.flatten(),
      },
      code: "VALIDATION_ERROR",
    });
  }

  req.params = result.data;
  return next();
};

export { z };