const metrics = {
  apiRequests: 0,
  errors: 0,
  jobsProcessed: 0,
  emailsQueued: 0,
  paymentsProcessed: 0,
};

export const incrementMetric = (name, amount = 1) => {
  metrics[name] = (metrics[name] || 0) + amount;
  return metrics[name];
};

export const getMetrics = () => {
  return {
    ...metrics,
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  };
};

export const resetMetrics = () => {
  Object.keys(metrics).forEach((key) => {
    metrics[key] = 0;
  });

  return getMetrics();
};

export default {
  incrementMetric,
  getMetrics,
  resetMetrics,
};