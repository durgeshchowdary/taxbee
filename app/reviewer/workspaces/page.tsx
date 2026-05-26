"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadSession } from "@/app/_utils/authSession";

type WorkspaceSummary = {
  documentsPendingReview: number;
  extractedFieldsPendingConfirmation: number;
  unresolvedComments: number;
  missingDocuments: string[];
  anomaliesRequiringReview: number;
  reviewActions?: {
    approved: number;
    rejected: number;
    flagged: number;
    correctionRequested: number;
  };
};

type Workspace = {
  id: string;
  ownerUserId: string;
  ownerName?: string;
  ownerEmail?: string;
  role: string;
  status: string;
  summary?: WorkspaceSummary;
};

export default function ReviewerWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [status, setStatus] = useState("Loading shared workspaces...");

  const load = useCallback(async () => {
    const session = await loadSession();
    if (!session) {
      setStatus("Sign in to view shared workspaces.");
      return;
    }
    if (session.requiresVerification) {
      setStatus("Please verify your email before opening shared workspaces.");
      return;
    }
    if (!session.allowedPortals.includes("reviewer")) {
      setStatus("Your account does not have reviewer workspace access.");
      return;
    }

    try {
      const res = await fetch("/api/collaboration/workspaces");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.message || "Could not load shared workspaces.");
        return;
      }
      setWorkspaces(data.data?.workspaces || []);
      setStatus("");
    } catch {
      setStatus("Backend is not reachable.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300">Reviewer</p>
          <h1 className="mt-2 text-3xl font-bold">Shared Tax Workspaces</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Open accepted taxpayer workspaces shared with your account.
          </p>
        </div>

        {status && <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{status}</div>}

        <div className="space-y-3">
          {workspaces.length === 0 && !status && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              No accepted shared workspaces are available.
            </div>
          )}
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="flex flex-col justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4 md:flex-row md:items-center">
              <div>
                <div className="font-semibold">{workspace.ownerName || workspace.ownerEmail || workspace.ownerUserId}</div>
                <div className="text-sm text-slate-400">
                  {workspace.ownerEmail || "No email"} | {workspace.role} | {workspace.status}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2 py-1 text-yellow-100">
                    {workspace.summary?.documentsPendingReview ?? 0} docs pending
                  </span>
                  <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-1 text-sky-100">
                    {workspace.summary?.extractedFieldsPendingConfirmation ?? 0} fields pending
                  </span>
                  <span className="rounded-full border border-red-300/30 bg-red-300/10 px-2 py-1 text-red-100">
                    {workspace.summary?.unresolvedComments ?? 0} comments open
                  </span>
                  <span className="rounded-full border border-purple-300/30 bg-purple-300/10 px-2 py-1 text-purple-100">
                    {workspace.summary?.anomaliesRequiringReview ?? 0} anomalies
                  </span>
                  {Boolean(workspace.summary?.missingDocuments?.length) && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-slate-200">
                      missing {workspace.summary?.missingDocuments.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/reviewer/workspaces/${workspace.ownerUserId}`}
                className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
