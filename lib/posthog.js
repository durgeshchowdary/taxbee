import posthog from "posthog-js";

let initialized = false;

export const initPostHog = () => {
  if (initialized) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!key) {
    console.warn("PostHog key missing");
    return;
  }

  posthog.init(key, {
    api_host: "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
  });

  initialized = true;
};

export const trackEvent = (event, properties = {}) => {
  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.error("PostHog tracking failed", error);
  }
};

export default posthog;