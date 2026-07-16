import { apiFetch } from "./authClient";

export interface NotificationPreferences {
  emailNotifications: boolean;
  filingReminders: boolean;
  aiInsights: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
}

export const getNotificationPreferences = async () => {
  const res = await apiFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/notification-preferences`
  );

  return res.json();
};

export const updateNotificationPreferences = async (
  data: NotificationPreferences
) => {
  const res = await apiFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/notification-preferences`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return res.json();
};