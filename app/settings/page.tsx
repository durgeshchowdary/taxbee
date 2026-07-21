"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "../_utils/notificationPreferences";

const preferenceList: { key: keyof NotificationPreferences; label: string }[] =
  [
    { key: "emailNotifications", label: "Email Notifications" },
    { key: "filingReminders", label: "Filing Reminders" },
    { key: "aiInsights", label: "AI Insights" },
    { key: "securityAlerts", label: "Security Alerts" },
    { key: "productUpdates", label: "Product Updates" },
  ];

export default function SettingsPage() {
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    filingReminders: true,
    aiInsights: true,
    securityAlerts: true,
    productUpdates: false,
  });

  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const result = await getNotificationPreferences();

      if (result.success) {
        setPrefs(result.data);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPreferences();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadPreferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);

      await updateNotificationPreferences(prefs);

      alert("Preferences updated successfully");
    } catch (err) {
      console.error("Failed to save preferences:", err);
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1220] text-white p-8">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-8 rounded-lg bg-yellow-500 px-4 py-2 text-black font-bold"
      >
        ← Dashboard
      </button>

      <h1 className="text-4xl font-bold mb-8">
        Notification Preferences
      </h1>

      <div className="max-w-2xl space-y-4">
        {preferenceList.map(({ key, label }) => (
          <div
            key={key}
            className="flex justify-between items-center rounded-xl bg-white/10 p-4"
          >
            <span>{label}</span>

            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => handleToggle(key)}
            />
          </div>
        ))}

        <button
          onClick={savePreferences}
          disabled={saving}
          className="rounded-xl bg-yellow-500 px-6 py-3 font-bold text-black"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </main>
  );
}