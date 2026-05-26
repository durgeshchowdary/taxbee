"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  eventType: string;
  fieldKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
  sourceType?: string;
  actorType?: string;
  confidence?: number | null;
  timestamp?: string;
  sourceDocumentId?: string | null;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function AuditTimelinePage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setStatus("loading");
        const res = await fetch("/api/audit-timeline");
        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 403) {
          setStatus("auth");
          setMessage(data.message || "Your session is not authorized.");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          setMessage(data.message || "Could not load audit timeline.");
          return;
        }

        const nextEvents = data.data?.events || data.events || [];
        setEvents(Array.isArray(nextEvents) ? nextEvents : []);
        setStatus(nextEvents.length ? "ready" : "empty");
      } catch {
        setStatus("error");
        setMessage("Backend is not reachable.");
      }
    };

    void loadTimeline();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300">TaxBee Trust Layer</p>
          <h1 className="mt-2 text-3xl font-bold">Audit Timeline</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Review important tax value changes, document extraction events, confirmations, overrides, and saved draft updates.
          </p>
        </div>

        {status === "loading" && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            Loading audit timeline...
          </div>
        )}

        {(status === "auth" || status === "error" || status === "empty") && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            {message || "No audit events have been recorded yet."}
          </div>
        )}

        {status === "ready" && (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Field</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/70">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-slate-300">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{event.eventType}</td>
                    <td className="px-4 py-3 text-slate-300">{event.fieldKey || "document"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatValue(event.oldValue)} {"->"} {formatValue(event.newValue)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {event.sourceType || "unknown"}
                      {event.sourceDocumentId ? ` (${event.sourceDocumentId})` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{event.actorType || "unknown"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {typeof event.confidence === "number" ? `${event.confidence}%` : "n/a"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
