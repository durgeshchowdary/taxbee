import { apiFetch } from "./authClient";

export interface NotificationPreferences {
  emailNotifications: boolean;
  filingReminders: boolean;
  aiInsights: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
}

const endpoint = "/api/notification-preferences";

export const getNotificationPreferences = async () => {
  const res = await apiFetch(endpoint);
  return res.json();
};

export const updateNotificationPreferences = async (
  data: NotificationPreferences
) => {
  const res = await apiFetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
};