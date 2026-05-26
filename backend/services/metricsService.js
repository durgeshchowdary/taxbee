const startedAt = Date.now();

const requestCounts = new Map();
const errorCounts = new Map();
const latency = {
  count: 0,
  totalMs: 0,
  maxMs: 0,
};
const jobLifecycleCounts = new Map();

const increment = (map, key, by = 1) => {
  map.set(key, (map.get(key) || 0) + by);
};

const toObject = (map) => Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));

export const recordRequestMetric = ({ method, route, statusCode, durationMs }) => {
  const routeKey = `${method} ${route || "unknown"}`;
  increment(requestCounts, routeKey);
  if (statusCode >= 400) increment(errorCounts, String(statusCode));
  latency.count += 1;
  latency.totalMs += durationMs;
  latency.maxMs = Math.max(latency.maxMs, durationMs);
};

export const recordJobMetric = ({ type, status }) => {
  increment(jobLifecycleCounts, `${type || "unknown"}:${status || "unknown"}`);
};

export const getInMemoryMetrics = () => ({
  uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  requests: toObject(requestCounts),
  errors: toObject(errorCounts),
  jobs: {
    lifecycle: toObject(jobLifecycleCounts),
  },
  latency: {
    count: latency.count,
    averageMs: latency.count ? Math.round(latency.totalMs / latency.count) : 0,
    maxMs: Math.round(latency.maxMs),
  },
});

export const resetMetricsForTest = () => {
  requestCounts.clear();
  errorCounts.clear();
  jobLifecycleCounts.clear();
  latency.count = 0;
  latency.totalMs = 0;
  latency.maxMs = 0;
};
