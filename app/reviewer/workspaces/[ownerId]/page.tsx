"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ImportedField = {
  id: string;
  label: string;
  path: string;
  value: string;
  status: string;
  confidence?: number;
};

type ImportRecord = {
  id: string;
  documentType: string;
  fileName: string;
  reviewStatus: string;
  extractedFields?: ImportedField[];
};

type CommentReply = {
  id: string;
  actorUserId: string;
  comment: string;
  createdAt?: string;
};

type Comment = {
  id: string;
  fieldKey?: string;
  entityId?: string;
  comment: string;
  status: string;
  createdAt?: string;
  replies?: CommentReply[];
};

type ReviewAction = {
  id: string;
  importedDocumentId: string;
  fieldKey: string;
  fieldLabel: string;
  action: string;
  reason?: string;
  createdAt?: string;
};

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

type WorkspaceOption = {
  ownerUserId: string;
  ownerName?: string;
  ownerEmail?: string;
};

type WorkspaceData = {
  context?: {
    user?: { name?: string; email?: string };
    imports?: ImportRecord[];
    deductions?: Record<string, unknown>;
    auditTimeline?: { id: string; eventType: string; fieldKey?: string; timestamp?: string }[];
    taxIntelligence?: {
      calculationStatus?: { calculationStatus?: string; reason?: string };
      anomalies?: { flags?: { title?: string; severity?: string; message?: string }[] };
    };
  };
  comments?: Comment[];
  reviewActions?: ReviewAction[];
  summary?: WorkspaceSummary;
  permissions?: {
    reviewFields?: boolean;
    comment?: boolean;
    approve?: boolean;
  };
};

const headers = (): Record<string, string> => ({ "Content-Type": "application/json" });

export default function ReviewerWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ ownerId: string }>();
  const ownerId = params.ownerId;
  const [data, setData] = useState<WorkspaceData>({});
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [fieldKey, setFieldKey] = useState("");
  const [comment, setComment] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [actionReason, setActionReason] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Loading workspace...");

  const load = useCallback(async () => {
    try {
      const [workspaceRes, listRes] = await Promise.all([
        fetch(`/api/collaboration/workspaces/${ownerId}`, { headers: headers() }),
        fetch("/api/collaboration/workspaces", { headers: headers() }),
      ]);
      const next = await workspaceRes.json().catch(() => ({}));
      const list = await listRes.json().catch(() => ({}));
      if (!workspaceRes.ok) {
        setStatus(next.message || "Could not load reviewer workspace.");
        return;
      }
      setData(next.data || {});
      setWorkspaces(list.data?.workspaces || []);
      setStatus("");
    } catch {
      setStatus("Backend is not reachable.");
    }
  }, [ownerId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (ownerId) void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ownerId, load]);

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const res = await fetch("/api/collaboration/comments", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ workspaceOwnerId: ownerId, fieldKey, comment, entityType: "tax_field" }),
    });
    const next = await res.json().catch(() => ({}));
    setStatus(next.message || (res.ok ? "Comment added." : "Could not add comment."));
    if (res.ok) {
      setFieldKey("");
      setComment("");
      await load();
    }
  };

  const setCommentStatus = async (id: string, nextStatus: "open" | "resolved") => {
    const res = await fetch(`/api/collaboration/comments/${id}/status`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status: nextStatus }),
    });
    const next = await res.json().catch(() => ({}));
    setStatus(next.message || (res.ok ? "Comment updated." : "Could not update comment."));
    if (res.ok) await load();
  };

  const replyToComment = async (id: string) => {
    const res = await fetch(`/api/collaboration/comments/${id}/replies`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ comment: replyText[id] || "" }),
    });
    const next = await res.json().catch(() => ({}));
    setStatus(next.message || (res.ok ? "Reply added." : "Could not add reply."));
    if (res.ok) {
      setReplyText((current) => ({ ...current, [id]: "" }));
      await load();
    }
  };

  const fieldAction = async (docId: string, field: ImportedField, action: string) => {
    const key = `${docId}:${field.path}`;
    const res = await fetch(`/api/collaboration/workspaces/${ownerId}/fields/actions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        importedDocumentId: docId,
        fieldKey: field.path,
        action,
        reason: actionReason[key] || "",
      }),
    });
    const next = await res.json().catch(() => ({}));
    setStatus(next.message || (res.ok ? "Review action recorded." : "Could not record action."));
    if (res.ok) {
      setActionReason((current) => ({ ...current, [key]: "" }));
      await load();
    }
  };

  const context = data.context;
  const imports = context?.imports || [];
  const comments = data.comments || [];
  const deductions = context?.deductions || {};
  const summary = data.summary;
  const permissions = data.permissions || {};

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300">Reviewer Workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{context?.user?.name || context?.user?.email || "Taxpayer"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Review Mongo-backed documents, extracted fields, deductions, audit history, and comments.
            </p>
          </div>
          <select
            value={ownerId}
            onChange={(event) => router.push(`/reviewer/workspaces/${event.target.value}`)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
          >
            <option value={ownerId}>{context?.user?.email || "Current workspace"}</option>
            {workspaces
              .filter((workspace) => workspace.ownerUserId !== ownerId)
              .map((workspace) => (
                <option key={workspace.ownerUserId} value={workspace.ownerUserId}>
                  {workspace.ownerName || workspace.ownerEmail || workspace.ownerUserId}
                </option>
              ))}
          </select>
        </div>

        {status && <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{status}</div>}

        <section className="grid gap-3 md:grid-cols-5">
          {[
            ["Docs pending", summary?.documentsPendingReview ?? 0],
            ["Fields pending", summary?.extractedFieldsPendingConfirmation ?? 0],
            ["Open comments", summary?.unresolvedComments ?? 0],
            ["Missing docs", summary?.missingDocuments?.length ?? 0],
            ["Anomalies", summary?.anomaliesRequiringReview ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <div className="mt-2 text-2xl font-bold text-yellow-300">{value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Calculation Status</h2>
          <p className="mt-2 text-sm text-slate-300">
            {context?.taxIntelligence?.calculationStatus?.calculationStatus || "unknown"} |{" "}
            {context?.taxIntelligence?.calculationStatus?.reason || "No calculation message available."}
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Imported Documents</h2>
          <div className="mt-4 space-y-4">
            {imports.length === 0 && <p className="text-sm text-slate-300">No imported documents are visible.</p>}
            {imports.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="font-semibold">{doc.fileName}</div>
                <div className="text-sm text-slate-400">{doc.documentType} | {doc.reviewStatus}</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(doc.extractedFields || []).slice(0, 12).map((field) => {
                    const key = `${doc.id}:${field.path}`;
                    return (
                      <div key={field.id} className="rounded border border-white/10 bg-black/20 p-3 text-sm">
                        <button type="button" onClick={() => setFieldKey(field.path)} className="w-full text-left">
                          <div className="font-semibold">{field.label}</div>
                          <div className="text-slate-300">{field.value || "empty"}</div>
                          <div className="text-xs text-slate-500">{field.path} | {field.status} | {field.confidence ?? "n/a"}%</div>
                        </button>
                        <input
                          value={actionReason[key] || ""}
                          onChange={(event) => setActionReason((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder="Reason for reject, flag, or correction"
                          className="mt-3 w-full rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-xs outline-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!permissions.approve}
                            onClick={() => void fieldAction(doc.id, field, "approved")}
                            className="rounded bg-green-400 px-2 py-1 text-xs font-semibold text-black disabled:opacity-40"
                          >
                            Approve
                          </button>
                          {["rejected", "flagged", "correction_requested"].map((action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={!permissions.reviewFields}
                              onClick={() => void fieldAction(doc.id, field, action)}
                              className="rounded border border-yellow-300/40 px-2 py-1 text-xs font-semibold text-yellow-100 disabled:opacity-40"
                            >
                              {action === "correction_requested" ? "Request correction" : action}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Deductions</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {Object.keys(deductions).length === 0 && <p>No deductions are visible.</p>}
              {Object.entries(deductions).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-white/10 py-2">
                  <span>{key}</span>
                  <span>{String(value || "empty")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Review Actions</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {(data.reviewActions || []).slice(0, 10).map((action) => (
                <div key={action.id} className="border-b border-white/10 py-2">
                  <div className="font-semibold text-white">{action.action} | {action.fieldLabel || action.fieldKey}</div>
                  <div className="text-xs text-slate-500">{action.reason || "No reason supplied"}</div>
                </div>
              ))}
              {!(data.reviewActions || []).length && <p>No reviewer actions yet.</p>}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Comments</h2>
          <form onSubmit={addComment} className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              value={fieldKey}
              onChange={(event) => setFieldKey(event.target.value)}
              placeholder="field key"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none"
            />
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Leave a review comment"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none"
              required
            />
            <button type="submit" disabled={!permissions.comment} className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">
              Comment
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {comments.length === 0 && <p className="text-sm text-slate-300">No comments yet.</p>}
            {comments.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <div className="text-sm font-semibold">{item.fieldKey || "Workspace"}</div>
                    <p className="mt-1 text-sm text-slate-300">{item.comment}</p>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.status} | {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void setCommentStatus(item.id, item.status === "open" ? "resolved" : "open")}
                    className="rounded border border-green-400/40 px-3 py-1.5 text-sm text-green-200"
                  >
                    {item.status === "open" ? "Resolve" : "Reopen"}
                  </button>
                </div>
                <div className="mt-3 space-y-2 border-l border-white/10 pl-3">
                  {(item.replies || []).map((reply) => (
                    <div key={reply.id} className="text-sm text-slate-300">
                      <div>{reply.comment}</div>
                      <div className="text-xs text-slate-500">{reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ""}</div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={replyText[item.id] || ""}
                      onChange={(event) => setReplyText((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="Reply"
                      className="min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-xs outline-none"
                    />
                    <button type="button" onClick={() => void replyToComment(item.id)} className="rounded border border-white/10 px-2 py-1 text-xs">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
