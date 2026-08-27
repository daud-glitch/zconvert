"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  LifeBuoy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/app-helpers";

interface ContactMessage {
  id: string;
  name: string | null;
  email: string;
  kind: string;
  sourceExt: string | null;
  targetExt: string | null;
  message: string;
  ipAddress: string | null;
  status: string;
  createdAt: string;
}

const KIND_LABELS: Record<string, string> = {
  general: "General",
  "broken-convert": "Broken convert",
  privacy: "Privacy",
  billing: "Account",
};

function statusBadge(status: string) {
  if (status === "new") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[10px] h-5">
        New
      </Badge>
    );
  }
  if (status === "resolved") {
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border border-blue-200 text-[10px] h-5">
        Resolved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-[10px] h-5">
      Read
    </Badge>
  );
}

export function AdminSupport() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newCount, setNewCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/support?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");

      setMessages(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.pagination?.totalPages || 1);
      setNewCount(typeof data.newCount === "number" ? data.newCount : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const updateStatus = async (id: string, status: string) => {
    try {
      setError(null);
      const res = await fetch("/api/admin/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
      if (selected?.id === id) {
        setSelected({ ...selected, status });
      }
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (msg.status === "new") {
      await updateStatus(msg.id, "read");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/support?id=${deleteConfirm}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDeleteConfirm(null);
      if (selected?.id === deleteConfirm) setSelected(null);
      loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const filtered = messages.filter((m) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      m.email.toLowerCase().includes(q) ||
      (m.name || "").toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q) ||
      m.kind.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support</h2>
          <p className="text-sm text-muted-foreground">
            Contact form reports, feedback, and issues
            {newCount > 0 ? (
              <span className="ml-2 text-emerald-600 font-medium">
                · {newCount} new
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 bg-card border-border/50"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40 h-11 bg-card border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4">Topic</th>
                <th className="px-6 py-4">Preview</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-10 bg-muted/50 animate-pulse rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <LifeBuoy className="w-8 h-8 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">No messages yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      msg.status === "new" ? "bg-emerald-500/[0.03]" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {msg.status === "new" ? (
                          <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold truncate">
                            {msg.name || "(no name)"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {msg.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold tracking-tighter bg-muted/50"
                      >
                        {KIND_LABELS[msg.kind] || msg.kind}
                      </Badge>
                      {msg.kind === "broken-convert" &&
                      (msg.sourceExt || msg.targetExt) ? (
                        <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                          {msg.sourceExt || "?"} → {msg.targetExt || "?"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <p className="truncate text-muted-foreground">
                        {msg.message}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {statusBadge(msg.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(msg.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => openMessage(msg)}
                          aria-label="View message"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500"
                          onClick={() => setDeleteConfirm(msg.id)}
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Support message</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">From</div>
                  <div className="font-medium">
                    {selected.name || "(no name)"}
                  </div>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-emerald-600 hover:underline text-xs"
                  >
                    {selected.email}
                  </a>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Topic
                  </div>
                  <div className="font-medium">
                    {KIND_LABELS[selected.kind] || selected.kind}
                  </div>
                  {selected.kind === "broken-convert" ? (
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      {selected.sourceExt || "?"} → {selected.targetExt || "?"}
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Status
                  </div>
                  {statusBadge(selected.status)}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Received
                  </div>
                  <div className="text-sm">{formatDate(selected.createdAt)}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1.5">
                  Message
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selected.message}
                </div>
              </div>

              {selected.ipAddress ? (
                <p className="text-[11px] text-muted-foreground font-mono">
                  IP: {selected.ipAddress}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selected && selected.status !== "resolved" ? (
              <Button
                variant="outline"
                onClick={() => updateStatus(selected.id, "resolved")}
                className="sm:mr-auto"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark resolved
              </Button>
            ) : null}
            {selected && selected.status === "resolved" ? (
              <Button
                variant="outline"
                onClick={() => updateStatus(selected.id, "read")}
                className="sm:mr-auto"
              >
                Reopen
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete message</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this support message? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
