import { PostHog } from "posthog-node";

let client = null;

export const getPostHog = () => {
  if (client) return client;

  const apiKey = process.env.POSTHOG_API_KEY;

  if (!apiKey) {
    console.warn("PostHog API key missing");
    return null;
  }

  client = new PostHog(apiKey, {
    host: "https://app.posthog.com",
  });

  return client;
};

export const captureEvent = async (
  distinctId,
  event,
  properties = {}
) => {
  try {
    const posthog = getPostHog();

    if (!posthog) return;

    await posthog.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    console.error("PostHog capture failed", error);
  }
};