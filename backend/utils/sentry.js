import * as Sentry from "@sentry/node";

let initialized = false;

export const initSentry = () => {
  if (initialized) return;

  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN missing. Skipping initialization.");
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
  });

  initialized = true;

  console.log("Sentry initialized");
};

export const captureException = (error, context = {}) => {
  console.error(error);

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.error("Failed to send error to Sentry", err);
  }
};

export default Sentry;