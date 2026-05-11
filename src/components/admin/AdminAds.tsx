"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function AdminAds() {
  const [ads, setAds] = useState([
    {
      id: "1",
      title: "Header Banner",
      location: "Top of Page",
      type: "Display",
      active: true,
    },
    {
      id: "2",
      title: "Sidebar Square",
      location: "Right Sidebar",
      type: "Native",
      active: true,
    },
    {
      id: "3",
      title: "Footer Ad",
      location: "Bottom of Page",
      type: "Display",
      active: false,
    },
    {
      id: "4",
      title: "In-Content Banner",
      location: "Between Conversion Steps",
      type: "Responsive",
      active: true,
    },
  ]);

  const toggleAd = (id: string) => {
    setAds((prev) =>
      prev.map((ad) => (ad.id === id ? { ...ad, active: !ad.active } : ad)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ad Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage advertisement placements and visibility
          </p>
        </div>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Placement
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Ad Title</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ads.map((ad) => (
                <tr key={ad.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{ad.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {ad.location}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="text-[10px]">
                      {ad.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Switch
                      checked={ad.active}
                      onCheckedChange={() => toggleAd(ad.id)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
