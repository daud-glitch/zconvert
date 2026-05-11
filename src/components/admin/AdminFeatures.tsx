"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function AdminFeatures() {
  const [features, setFeatures] = useState([
    {
      id: "1",
      name: "Batch Conversions",
      desc: "Allow users to convert multiple files at once",
      enabled: true,
    },
    {
      id: "2",
      name: "Advanced Options",
      desc: "Show options like resizing and quality",
      enabled: true,
    },
    {
      id: "3",
      name: "Cloud Storage",
      desc: "Integrate with Drive/Dropbox",
      enabled: false,
    },
    {
      id: "4",
      name: "URL Import",
      desc: "Import files directly from links",
      enabled: true,
    },
    {
      id: "5",
      name: "API Access",
      desc: "Allow API key generation",
      enabled: false,
    },
  ]);

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Features</h2>
          <p className="text-sm text-muted-foreground">
            Toggle application features
          </p>
        </div>
      </div>

      <Card className="card-elevated overflow-hidden border border-border">
        <div className="divide-y divide-border">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div>
                <h4 className="font-medium">{feature.name}</h4>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
              <Switch
                checked={feature.enabled}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
