import { useState } from "react";
import { upload as blobUpload } from "@vercel/blob/client";

interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
}

interface UseUploadReturn {
  upload: (file: File) => Promise<UploadResult>;
  deleteFile: (url: string) => Promise<void>;
  isUploading: boolean;
  error: string | null;
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      // Client-side upload: bypasses server body size limit
      const blob = await blobUpload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: file.size > 4 * 1024 * 1024, // Use multipart for files > 4MB
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (url: string): Promise<void> => {
    try {
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      throw err;
    }
  };

  return { upload, deleteFile, isUploading, error };
}
