"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { User, Mail, Lock, Loader2, Save, LogOut, ShieldCheck } from "lucide-react";

export function ProfileView() {
  const { currentUser, logout, refreshUser } = useApp();
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Please sign in</h2>
        <p className="text-muted-foreground">You need to be logged in to view your profile.</p>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Profile updated successfully!", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        await refreshUser();
      } else {
        setMessage({ text: data.error || "Update failed", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <Button variant="outline" className="text-destructive" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Update your name and email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {message && (
                <div className={`p-3 text-sm rounded-lg ${
                  message.type === "success" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  {message.text}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3">Change Password</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Required to change password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Privacy & Data Storage</h3>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  Your privacy is our priority. While we record conversion statistics for your history, 
                  <strong> your actual files never leave your browser's local storage (IndexedDB).</strong> 
                  We don't store your documents on our servers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
