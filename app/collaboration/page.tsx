"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Permissions = {
  viewDocuments: boolean;
  reviewFields: boolean;
  comment: boolean;
  approve: boolean;
  editDraft: boolean;
  viewAuditTimeline: boolean;
};

type Access = {
  id: string;
  reviewerEmail: string;
  role: string;
  status: string;
  permissions: Permissions;
  invitedAt?: string;
};

type Comment = {
  id: string;
  fieldKey?: string;
  entityType?: string;
  comment: string;
  status: string;
  createdAt?: string;
  replies?: { id: string; actorUserId: string; comment: string; createdAt?: string }[];
};

type ReviewAction = {
  id: string;
  fieldKey: string;
  fieldLabel?: string;
  action: string;
  reason?: string;
  createdAt?: string;
};

const defaultPermissions: Permissions = {
  viewDocuments: true,
  reviewFields: true,
  comment: true,
  approve: false,
  editDraft: false,
  viewAuditTimeline: true,
};

export default function CollaborationPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ca");
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [access, setAccess] = useState<Access[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewActions, setReviewActions] = useState<ReviewAction[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Loading collaboration access...");
  const [saving, setSaving] = useState(false);

  const headers = (): Record<string, string> => {
    return { "Content-Type": "application/json" };
  };

  const load = useCallback(async () => {
    try {
      const [accessRes, commentsRes] = await Promise.all([
        fetch("/api/collaboration/access", { headers: headers() }),
        fetch("/api/collaboration/comments", { headers: headers() }),
      ]);
      const accessData = await accessRes.json().catch(() => ({}));
      const commentsData = await commentsRes.json().catch(() => ({}));

      if (!accessRes.ok) {
        setStatus(accessData.message || "Could not load collaboration access.");
        return;
      }

      setAccess(accessData.data?.owned || []);
      setComments(commentsData.data?.comments || []);
      setReviewActions(commentsData.data?.reviewActions || []);
      setStatus("");
    } catch {
      setStatus("Backend is not reachable.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/collaboration/invite", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ reviewerEmail: email, role, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(data.message || (res.ok ? "Invite saved." : "Invite failed."));
      if (res.ok) {
        setEmail("");
        await load();
      }
    } catch {
      setStatus("Backend is not reachable.");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/collaboration/access/${id}/revoke`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(data.message || (res.ok ? "Access revoked." : "Could not revoke access."));
    if (res.ok) await load();
  };

  const togglePermission = (key: keyof Permissions) => {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  };

  const replyToComment = async (id: string) => {
    const res = await fetch(`/api/collaboration/comments/${id}/replies`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ comment: replyText[id] || "" }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(data.message || (res.ok ? "Reply added." : "Could not add reply."));
    if (res.ok) {
      setReplyText((current) => ({ ...current, [id]: "" }));
      await load();
    }
  };

  const updateCommentStatus = async (id: string, nextStatus: "open" | "resolved") => {
    const res = await fetch(`/api/collaboration/comments/${id}/status`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json().catch(() => ({}));
    setStatus(data.message || (res.ok ? "Comment updated." : "Could not update comment."));
    if (res.ok) await load();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-300">TaxBee Collaboration</p>
          <h1 className="mt-2 text-3xl font-bold">CA / Reviewer Access</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Invite a reviewer and control exactly what they can see or change in your tax workspace.
          </p>
        </div>

        {status && <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">{status}</div>}

        <form onSubmit={invite} className="rounded-lg border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_160px]">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="ca@example.com"
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none"
              required
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none"
            >
              <option value="ca">CA</option>
              <option value="reviewer">Reviewer</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.keys(permissions).map((key) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={permissions[key as keyof Permissions]}
                  onChange={() => togglePermission(key as keyof Permissions)}
                />
                <span>{key}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {saving ? "Inviting..." : "Invite Reviewer"}
          </button>
        </form>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Workspace Access</h2>
          <div className="mt-4 space-y-3">
            {access.length === 0 && <p className="text-sm text-slate-300">No reviewers invited yet.</p>}
            {access.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border border-white/10 bg-slate-900 p-4 md:flex-row md:items-center">
                <div>
                  <div className="font-semibold">{item.reviewerEmail}</div>
                  <div className="text-sm text-slate-400">
                    {item.role} · {item.status} · {item.invitedAt ? new Date(item.invitedAt).toLocaleString() : ""}
                  </div>
                </div>
                {item.status !== "revoked" && (
                  <button
                    type="button"
                    onClick={() => void revoke(item.id)}
                    className="rounded border border-red-400/40 px-3 py-1.5 text-sm text-red-200"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Reviewer Comments</h2>
          <div className="mt-4 space-y-3">
            {comments.length === 0 && <p className="text-sm text-slate-300">No review comments yet.</p>}
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <div className="text-sm font-semibold">{comment.fieldKey || comment.entityType || "Workspace"}</div>
                    <p className="mt-1 text-sm text-slate-300">{comment.comment}</p>
                    <div className="mt-2 text-xs text-slate-500">{comment.status}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void updateCommentStatus(comment.id, comment.status === "open" ? "resolved" : "open")}
                    className="rounded border border-green-400/40 px-3 py-1.5 text-sm text-green-200"
                  >
                    {comment.status === "open" ? "Mark resolved" : "Reopen"}
                  </button>
                </div>
                <div className="mt-3 space-y-2 border-l border-white/10 pl-3">
                  {(comment.replies || []).map((reply) => (
                    <div key={reply.id} className="text-sm text-slate-300">
                      <div>{reply.comment}</div>
                      <div className="text-xs text-slate-500">{reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ""}</div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={replyText[comment.id] || ""}
                      onChange={(event) => setReplyText((current) => ({ ...current, [comment.id]: event.target.value }))}
                      placeholder="Reply to reviewer"
                      className="min-w-0 flex-1 rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-xs outline-none"
                    />
                    <button type="button" onClick={() => void replyToComment(comment.id)} className="rounded border border-white/10 px-2 py-1 text-xs">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Reviewer Field Feedback</h2>
          <div className="mt-4 space-y-3">
            {reviewActions.length === 0 && <p className="text-sm text-slate-300">No field feedback yet.</p>}
            {reviewActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="text-sm font-semibold">{action.action} | {action.fieldLabel || action.fieldKey}</div>
                <p className="mt-1 text-sm text-slate-300">{action.reason || "No reason supplied."}</p>
                <div className="mt-2 text-xs text-slate-500">{action.createdAt ? new Date(action.createdAt).toLocaleString() : ""}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
