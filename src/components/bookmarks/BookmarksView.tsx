"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, ArrowRightLeft, Search, ExternalLink, Lock } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { type BookmarkRecord } from "@/lib/app-types";
import { readJsonResponse } from "@/lib/http-json";
import { getCategoryIcon } from "@/lib/app-helpers";
import { categoryLightBg, categoryTextColors } from "@/lib/app-constants";
import { Input } from "@/components/ui/input";

export function BookmarksView() {
  const { currentUser, setCurrentView, openAuth } = useApp();
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchBookmarks = async () => {
      if (!currentUser) {
        if (!cancelled) {
          setIsLoading(false);
          setBookmarks([]);
        }
        return;
      }
      try {
        if (!cancelled) {
          setIsLoading(true);
          setBookmarks([]);
        }
        const res = await fetch("/api/bookmarks", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await readJsonResponse<{
          data?: BookmarkRecord[];
          bookmarks?: BookmarkRecord[];
        }>(res);
        if (!cancelled) {
          setBookmarks(data.data || data.bookmarks || []);
        }
      } catch (err) {
        console.error("Failed to fetch bookmarks:", err);
        if (!cancelled) setBookmarks([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void fetchBookmarks();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  const filteredBookmarks = bookmarks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.inputExt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.outputExt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="w-8 h-8 text-amber-500" />
            Your Bookmarks
          </h1>
          <p className="text-muted-foreground">Save your favorite conversion pairs for quick access.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search bookmarks..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      ) : !currentUser ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold">Account Required</h3>
          <p className="text-muted-foreground max-w-sm">
            Please log in to your account to save and manage your conversion bookmarks. 
            Bookmarks are synced across your devices when you are logged in.
          </p>
          <Button 
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-amber-500/20"
            onClick={() => openAuth("login")}
          >
            Sign in / Sign up
          </Button>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No bookmarks yet</h3>
          <p className="text-muted-foreground">Save conversion pairs from the converter to see them here.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setCurrentView("converter")}
          >
            Go to Converter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bookmark) => (
            <Card key={bookmark.id} className="group hover:shadow-md transition-all border-border hover:border-amber-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${categoryLightBg[bookmark.category] || 'bg-muted'} ${categoryTextColors[bookmark.category] || 'text-foreground'}`}>
                    {getCategoryIcon(bookmark.category, "w-6 h-6")}
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(bookmark.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <h3 className="font-bold text-lg mb-1">{bookmark.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="font-mono text-[10px]">{bookmark.inputExt.toUpperCase()}</Badge>
                  <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono text-[10px]">{bookmark.outputExt.toUpperCase()}</Badge>
                </div>

                <Button 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  onClick={() => setCurrentView("converter")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Use this pair
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
