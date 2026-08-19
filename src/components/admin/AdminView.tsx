"use client";

import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AdminTab } from "@/lib/app-types";
import { adminNavItems } from "@/lib/app-constants";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { AdminOverview } from "./AdminOverview";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminUsers } from "./AdminUsers";
import { AdminFormats } from "./AdminFormats";
import { AdminCategories } from "./AdminCategories";
import { AdminFeatures } from "./AdminFeatures";
import { AdminLinks } from "./AdminLinks";
import { AdminPages } from "./AdminPages";
import { AdminAds } from "./AdminAds";
import { AdminSettings } from "./AdminSettings";
// import { AdminDatabase } from "./AdminDatabase";
import { useApp } from "@/lib/app-context";

export function AdminView() {
  const { setCurrentView: navigate, logout, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const adminUser = currentUser
    ? { name: currentUser.name ?? null, email: currentUser.email }
    : null;

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  return (
    <div className="space-y-0">
      <Breadcrumb
        items={[{ label: "Home", view: "converter" }, { label: "Admin" }]}
        navigate={navigate}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24">
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              Manage your converter instance
            </p>

            {adminUser && (
              <div className="mb-6 p-3 rounded-xl border border-border bg-card flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold border border-emerald-500/20">
                    {adminUser.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">
                      {adminUser.name || "Administrator"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {adminUser.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs h-8 opacity-90 hover:opacity-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
                </Button>
              </div>
            )}

            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {adminNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === item.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "analytics" && <AdminAnalytics />}
          {activeTab === "users" && <AdminUsers />}
          {activeTab === "categories" && <AdminCategories />}
          {activeTab === "formats" && <AdminFormats />}
          {activeTab === "features" && <AdminFeatures />}
          {activeTab === "links" && <AdminLinks />}
          {activeTab === "pages" && <AdminPages />}
          {activeTab === "ads" && <AdminAds />}
          // {activeTab === "database" && <AdminDatabase />}
          {activeTab === "settings" && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}
