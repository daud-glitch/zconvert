"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Download, Trash2, Clock, FileIcon, Search, AlertCircle, HardDrive, Lock } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { formatBytes, formatDate, getCategoryIcon, getCategoryFromExt } from "@/lib/app-helpers";
import { type ConversionRecord } from "@/lib/app-types";
import { getFileLocally, deleteFileLocally } from "@/lib/storage";
import { Input } from "@/components/ui/input";

export function HistoryView() {
  const { currentUser } = useApp();
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableFiles, setAvailableFiles] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    if (!currentUser) {
      setIsLoading(false);
      setConversions([]);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch("/api/conversions?limit=100");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const records = data.data || [];
      setConversions(records);

      // Check which files are available in IndexedDB
      const availability: Record<string, boolean> = {};
      for (const record of records) {
        if (record.status === "completed") {
          const file = await getFileLocally(record.id);
          availability[record.id] = !!file;
        }
      }
      setAvailableFiles(availability);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const handleDownload = async (record: ConversionRecord) => {
    const stored = await getFileLocally(record.id);
    if (!stored) {
      alert("File is no longer available in your browser storage.");
      return;
    }

    const url = URL.createObjectURL(stored.data);
    const a = document.createElement("a");
    a.href = url;
    const baseName = record.fileName.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.${record.targetExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecord = async (id: string) => {
    // Note: This only deletes from IndexedDB in this demo, 
    // real implementation might need an API call to delete record from DB too
    await deleteFileLocally(id);
    setAvailableFiles(prev => ({ ...prev, [id]: false }));
  };

  const filteredConversions = conversions.filter(c => 
    c.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.originalExt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.targetExt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8 text-emerald-500" />
            Conversion History
          </h1>
          <p className="text-muted-foreground">Your last 100 conversions. Files are stored only in your browser.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversions..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Note:</strong> Converted files are saved in your browser's local storage (IndexedDB). 
            If you clear your browser data or use a different device, these files will not be available for redownload.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      ) : !currentUser ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold">Account Required</h3>
          <p className="text-muted-foreground max-w-sm">
            Please log in to your account to view and manage your conversion history. 
            History is only saved when you are authenticated.
          </p>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-emerald-500/20"
            onClick={() => {
              // We don't have direct access to setAuthDialogOpen here, 
              // but we can trigger a login view change if needed or just explain.
              // In this app, the header handles login.
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Go to Login
          </Button>
        </div>
      ) : filteredConversions.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No conversions found</h3>
          <p className="text-muted-foreground">Start converting files to see them here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredConversions.map((record) => (
            <Card key={record.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    record.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  }`}>
                    {getCategoryIcon(record.category, "w-6 h-6")}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">{record.fileName}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {record.originalExt} &rarr; {record.targetExt}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(record.createdAt)}
                      </span>
                      <span>{formatBytes(record.inputSize)} &rarr; {formatBytes(record.outputSize)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.status === "completed" ? (
                      availableFiles[record.id] ? (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleDownload(record)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Local copy deleted
                        </Badge>
                      )
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                    
                    {availableFiles[record.id] && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRecord(record.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
