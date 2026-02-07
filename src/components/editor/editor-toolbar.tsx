"use client";

import React, { useState } from "react";
import { useEditor } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  Printer,
  Monitor,
  Globe,
  Download,
  Eye,
  Undo2,
  Redo2,
  Settings,
  Link,
  Copy,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

export function EditorToolbar() {
  const { state, dispatch, save } = useEditor();
  const [showOnlinePreview, setShowOnlinePreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadPdf = async () => {
    if (!state.worksheetId) {
      alert("Please save the worksheet first");
      return;
    }
    try {
      const res = await fetch(`/api/worksheets/${state.worksheetId}/pdf`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`PDF generation failed: ${err.error}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    }
  };

  const shareUrl = state.slug
    ? `${window.location.origin}/worksheet/${state.slug}`
    : null;

  const handlePublish = async () => {
    const willPublish = !state.published;
    dispatch({ type: "SET_PUBLISHED", payload: willPublish });
    // Auto-save after toggling published state
    // We need to save with the new published value, so we do it manually
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.worksheetId ? "PUT" : "POST";
      const url = state.worksheetId
        ? `/api/worksheets/${state.worksheetId}`
        : "/api/worksheets";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          blocks: state.blocks,
          settings: state.settings,
          published: willPublish,
        }),
      });
      const data = await res.json();
      if (!state.worksheetId && data.id) {
        dispatch({
          type: "LOAD_WORKSHEET",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            blocks: data.blocks,
            settings: data.settings,
            published: data.published,
          },
        });
        window.history.replaceState(null, "", `/editor/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Publish save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="h-14 border-b border-border bg-background flex items-center px-4 gap-2 shrink-0">
        {/* Title */}
        <Input
          value={state.title}
          onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
          className="max-w-[280px] h-8 font-medium"
          placeholder="Worksheet title..."
        />

        {state.isDirty && (
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
            Unsaved
          </Badge>
        )}

        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={state.viewMode === "print" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "print" })}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            variant={state.viewMode === "online" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() =>
              dispatch({ type: "SET_VIEW_MODE", payload: "online" })
            }
          >
            <Monitor className="h-3.5 w-3.5" />
            Online
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Online Preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowOnlinePreview(true)}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview online worksheet</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={save}
              disabled={state.isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {state.isSaving ? "Saving..." : "Save"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save worksheet (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={state.published ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={handlePublish}
              disabled={state.isSaving}
            >
              <Globe className="h-3.5 w-3.5" />
              {state.published ? "Published" : "Publish"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {state.published
              ? "Click to unpublish"
              : "Publish & create shareable link"}
          </TooltipContent>
        </Tooltip>

        {state.published && shareUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Link className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{shareUrl}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleDownloadPdf}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download PDF</TooltipContent>
        </Tooltip>
      </div>

      {/* Online Preview Dialog */}
      <Dialog open={showOnlinePreview} onOpenChange={setShowOnlinePreview}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Online Preview</DialogTitle>
              {state.published && shareUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(shareUrl, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in new tab
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30">
            <WorksheetViewer
              title={state.title}
              blocks={state.blocks}
              settings={state.settings}
              mode="online"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
