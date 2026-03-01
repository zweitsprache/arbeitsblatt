"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/auth/use-is-admin";
import { authFetch } from "@/lib/auth-fetch";
import { useTranslations } from "next-intl";

interface WorksheetScreenshotProps {
  worksheetId: string;
  blockId: string;
  courseId?: never;
  moduleId?: never;
  topicId?: never;
  lessonId?: never;
}

interface CourseScreenshotProps {
  courseId: string;
  moduleId: string;
  topicId: string;
  lessonId: string;
  blockId: string;
  worksheetId?: never;
}

type BlockScreenshotButtonProps = WorksheetScreenshotProps | CourseScreenshotProps;

export function BlockScreenshotButton(props: BlockScreenshotButtonProps) {
  const { blockId } = props;
  const isAdmin = useIsAdmin();
  const t = useTranslations("viewer");
  const [loading, setLoading] = useState(false);

  if (!isAdmin) return null;

  const handleScreenshot = async () => {
    setLoading(true);
    try {
      let url: string;
      let body: Record<string, string>;

      if ("worksheetId" in props && props.worksheetId) {
        url = `/api/worksheets/${props.worksheetId}/block-screenshot`;
        body = { blockId };
      } else if ("courseId" in props && props.courseId) {
        url = `/api/courses/${props.courseId}/block-screenshot`;
        body = {
          blockId,
          moduleId: props.moduleId,
          topicId: props.topicId,
          lessonId: props.lessonId,
        };
      } else {
        return;
      }

      const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Screenshot failed");
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `block-${blockId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("[BlockScreenshot]", err);
      alert(t("screenshotError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleScreenshot}
      disabled={loading}
      title={t("screenshotBlock")}
      className="absolute top-1 right-1 z-10 opacity-0 group-hover/block:opacity-100 transition-opacity rounded-md bg-background/80 border border-border shadow-sm p-1.5 hover:bg-accent cursor-pointer disabled:cursor-wait"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Camera className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
