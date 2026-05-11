"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { categoryColors } from "@/lib/app-constants";
import { getCategoryIcon } from "@/lib/app-helpers";

export function AdminCategories() {
  const [categories, setCategories] = useState([
    { id: "image", name: "Images", formats: 42, active: true },
    { id: "audio", name: "Audio", formats: 18, active: true },
    { id: "document", name: "Documents", formats: 15, active: true },
    { id: "archive", name: "Archives", formats: 12, active: true },
    { id: "data", name: "Data", formats: 20, active: true },
    { id: "ebook", name: "E-Books", formats: 8, active: true },
    { id: "presentation", name: "Presentations", formats: 6, active: false },
    { id: "font", name: "Fonts", formats: 5, active: false },
  ]);

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage supported file categories
          </p>
        </div>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="card-elevated">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${
                    categoryColors[cat.id] || "bg-gray-500"
                  } rounded-xl flex items-center justify-center text-white`}
                >
                  {getCategoryIcon(cat.id, "w-5 h-5")}
                </div>
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {cat.formats} formats supported
                  </p>
                </div>
              </div>
              <Switch
                checked={cat.active}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
