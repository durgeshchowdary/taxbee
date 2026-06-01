const alerts = [];

export const createAlert = ({
  type,
  severity = "medium",
  title,
  message,
  metadata = {},
}) => {
  const alert = {
    id: String(Date.now()),
    type,
    severity,
    title,
    message,
    metadata,
    createdAt: new Date(),
    resolved: false,
  };

  alerts.unshift(alert);

  return alert;
};

export const getAlerts = () => alerts;

export const resolveAlert = (alertId) => {
  const alert = alerts.find(
    (a) => a.id === alertId
  );

  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date();
  }

  return alert;
};

export default {
  createAlert,
  getAlerts,
  resolveAlert,
};