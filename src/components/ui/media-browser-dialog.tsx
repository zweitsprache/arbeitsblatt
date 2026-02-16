"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImagePlus, Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────

interface BlobImage {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

export interface MediaBrowserDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Called when user selects an existing image URL */
  onSelectUrl: (url: string) => void;
  /** Called when user selects a local file for upload */
  onSelectFile: (file: File) => void;
  /** Dialog title */
  title?: string;
  /** Accept pattern for the file input (default: "image/*") */
  accept?: string;
}

// ─── Component ───────────────────────────────────────────────

export function MediaBrowserDialog({
  open,
  onOpenChange,
  onSelectUrl,
  onSelectFile,
  title = "Bild auswählen",
  accept = "image/*",
}: MediaBrowserDialogProps) {
  const [images, setImages] = useState<BlobImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("browse");
  const loadedRef = useRef(false);

  const fetchImages = useCallback(async (loadCursor?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (loadCursor) params.set("cursor", loadCursor);

      const res = await fetch(`/api/upload/list?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();

      setImages((prev) =>
        loadCursor ? [...prev, ...data.images] : data.images
      );
      setCursor(data.cursor);
      setHasMore(data.hasMore);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load images when the dialog opens on the browse tab
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      fetchImages();
    }
    if (!open) {
      loadedRef.current = false;
      setSelectedUrl(null);
      setTab("browse");
    }
  }, [open, fetchImages]);

  const handleConfirm = useCallback(() => {
    if (selectedUrl) {
      onSelectUrl(selectedUrl);
      onOpenChange(false);
    }
  }, [selectedUrl, onSelectUrl, onOpenChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onSelectFile(file);
        onOpenChange(false);
      }
      e.target.value = "";
    },
    [onSelectFile, onOpenChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        onSelectFile(file);
        onOpenChange(false);
      }
    },
    [onSelectFile, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Bild aus Mediathek auswählen oder neue Datei hochladen
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="browse">Mediathek</TabsTrigger>
            <TabsTrigger value="upload">Hochladen</TabsTrigger>
          </TabsList>

          {/* ── Browse existing images ── */}
          <TabsContent value="browse" className="mt-3">
            {isLoading && images.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImagePlus className="h-8 w-8 mb-2" />
                <p className="text-sm">Noch keine Bilder vorhanden</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[360px]">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-1">
                    {images.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => setSelectedUrl(img.url)}
                        className={cn(
                          "relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:ring-2 hover:ring-primary/30",
                          selectedUrl === img.url
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.pathname}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {selectedUrl === img.url && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchImages(cursor)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Mehr laden
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Upload new file ── */}
          <TabsContent value="upload" className="mt-3">
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Datei hierher ziehen oder klicken
              </p>
              <p className="text-xs text-muted-foreground/70">
                JPG, PNG, GIF, WebP · max. 10 MB
              </p>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          {tab === "browse" && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedUrl}
            >
              Auswählen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
