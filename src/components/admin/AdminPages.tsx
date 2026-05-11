"use client";

import React, { useState } from "react";
import { Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminPages() {
  const [pages, setPages] = useState([
    {
      id: "1",
      title: "Privacy Policy",
      slug: "privacy",
      updated: "2024-05-01",
    },
    {
      id: "2",
      title: "Terms of Service",
      slug: "terms",
      updated: "2024-05-01",
    },
    { id: "3", title: "About Us", slug: "about", updated: "2024-04-15" },
    { id: "4", title: "Contact", slug: "contact", updated: "2024-03-10" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage static content pages
          </p>
        </div>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((page) => (
          <Card
            key={page.id}
            className="card-elevated group relative hover:border-teal-500 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{page.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      /{page.slug}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated {page.updated}
                    </span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted"
                  >
                    <Edit className="w-4 h-4 text-foreground" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
