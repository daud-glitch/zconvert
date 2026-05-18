"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/app-helpers";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
  _count?: { conversions: number; bookmarks: number };
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/users?page=${page}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setUsers(data.data);
          setTotalPages(data.pagination?.totalPages || 1);
        } else {
          setUsers([]);
          setTotalPages(1);
        }
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load users";
        setError(message);
        setUsers([]);
        setLoading(false);
      });
  }, [page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const addUser = async () => {
    if (!newEmail) {
      setError("Email is required.");
      return;
    }
    if (!newEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setError(null);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add user");
      }
      loadUsers();
      setShowAdd(false);
      setNewEmail("");
      setNewName("");
      setNewRole("user");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add user";
      setError(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/users?id=${deleteConfirm}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 bg-sky-500 rounded-lg animate-pulse flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-sky-50 dark:bg-sky-950 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-sky-500" />
              </div>
              <h3 className="font-semibold text-lg">
                {searchQuery ? "No users found" : "No users yet"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first user to get started with team management."}
              </p>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setShowAdd(true)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add First User
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Conversions
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Bookmarks
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {(u.name || u.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {u.name || u.email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className={
                          u.role === "admin"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : ""
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {u._count?.conversions || 0}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {u._count?.bookmarks || 0}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-50 group-hover:opacity-100"
                        onClick={() => setDeleteConfirm(u.id)}
                        aria-label="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </div>
              Add New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email</Label>
              <Input
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                placeholder="John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              onClick={addUser}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this user? This action cannot be undone.
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
