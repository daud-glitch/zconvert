"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type ViewType } from "@/lib/formats";
import { type FormatsData } from "@/lib/app-types";
import { categoryColors, categoryBorderColors } from "@/lib/app-constants";
import { getCategoryFromExt, getCategoryIcon } from "@/lib/app-helpers";
import { Breadcrumb } from "@/components/common/Breadcrumb";

export function FormatsView({
  navigate,
}: {
  navigate: (view: ViewType) => void;
}) {
  const [data, setData] = useState<FormatsData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/formats")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center text-white">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading formats...</p>
      </div>
    );
  }

  const categories = Object.entries(data.grouped);
  const filteredCategories =
    activeCategory === "all"
      ? categories
      : categories.filter(([key]) => key === activeCategory);

  const filteredFormats = filteredCategories.flatMap(([, group]) =>
    group.formats.filter(
      (f) =>
        !searchQuery ||
        f.ext.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", view: "converter" },
          { label: "Supported Formats" },
        ]}
        navigate={navigate}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supported Formats</h1>
        <p className="text-muted-foreground mt-1">
          {data.totalFormats} input formats &middot; {data.totalConversions}{" "}
          conversion pairs
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search formats..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory("all")}
        >
          All ({data.totalFormats})
        </Button>
        {categories
          .filter(([, group]) => group.count > 0)
          .map(([key, group]) => (
            <Button
              key={key}
              variant={activeCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(key)}
              className={
                activeCategory === key
                  ? `${categoryColors[key]} text-white hover:${categoryColors[key]} border-0`
                  : ""
              }
            >
              {getCategoryIcon(key)}
              <span className="ml-1.5">{group.meta.label}</span>
              <Badge variant="secondary" className="ml-1.5 text-xs h-5 px-1.5">
                {group.count}
              </Badge>
            </Button>
          ))}
      </div>

      <Separator />

      {/* Formats Grid */}
      {filteredFormats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No formats found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Try adjusting your search query or category filter to find what
            you&apos;re looking for.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFormats.map((format) => {
            const catKey = format.category;
            const meta = data.grouped[catKey]?.meta;
            return (
              <Card
                key={`${format.category}-${format.ext}`}
                className="overflow-hidden"
              >
                <CardContent className="p-0">
                  <div
                    className={`flex items-start gap-3 p-4 border-l-4 ${categoryBorderColors[catKey] || "border-l-gray-500"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                        categoryColors[catKey] || "bg-gray-500"
                      }`}
                    >
                      {getCategoryIcon(catKey)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">
                          .{format.ext}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {meta?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {format.targetFormats.map((t) => {
                          const tCat = getCategoryFromExt(t);
                          return (
                            <a
                              key={t}
                              href={`/conversions/${t}`}
                              className={`text-xs px-1.5 py-0.5 rounded font-mono uppercase cursor-pointer transition-opacity hover:opacity-80 ${
                                categoryColors[tCat]
                                  ? `${categoryColors[tCat]} text-white`
                                  : "bg-muted"
                              }`}
                            >
                              {t}
                            </a>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => navigate("converter")}
                        >
                          Convert Now
                        </Button>
                        <a href={`/conversions/${format.ext}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                          >
                            Details <ArrowRight className="w-3 h-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
