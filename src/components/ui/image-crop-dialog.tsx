"use client";

import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RotateCw, ZoomIn, RectangleHorizontal } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

export interface CropResult {
  /** The cropped image as a Blob */
  blob: Blob;
  /** Object URL for immediate preview (caller should revoke when done) */
  url: string;
}

export interface ImageCropDialogProps {
  /** Image source URL to crop */
  imageSrc: string | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Called with the cropped result when user confirms */
  onCropComplete: (result: CropResult) => void;
  /** Aspect ratio for the crop area (default: undefined = free) */
  aspect?: number;
  /** Whether to show aspect ratio presets in the dialog (default: true) */
  showAspectPresets?: boolean;
  /** Dialog title */
  title?: string;
  /** Output image format */
  outputType?: "image/png" | "image/jpeg" | "image/webp";
  /** Output quality 0-1 (for jpeg/webp, default: 0.92) */
  outputQuality?: number;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Create a cropped image from a source URL and pixel-area.
 */
async function getCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  outputType: string = "image/png",
  quality: number = 0.92
): Promise<CropResult> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      },
      outputType,
      quality
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Component ───────────────────────────────────────────────

export function ImageCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onCropComplete,
  aspect,
  showAspectPresets = true,
  title = "Bild zuschneiden",
  outputType = "image/png",
  outputQuality = 0.92,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAspect, setActiveAspect] = useState<number | undefined>(aspect);

  // Sync with prop when dialog opens
  React.useEffect(() => {
    if (open) setActiveAspect(aspect);
  }, [open, aspect]);

  const onCropCompleteInternal = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const result = await getCroppedImage(
        imageSrc,
        croppedAreaPixels,
        outputType,
        outputQuality
      );
      onCropComplete(result);
      onOpenChange(false);
    } catch {
      // silently fail
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, outputType, outputQuality, onCropComplete, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset state when closing
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Bildbereich auswählen und zuschneiden
          </DialogDescription>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full aspect-square bg-black/90 rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={activeAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropCompleteInternal}
          />
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {/* Aspect ratio presets */}
          {showAspectPresets && (
            <div className="flex items-center gap-3">
              <RectangleHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <Label className="text-xs w-10 shrink-0">Format</Label>
              <div className="flex gap-1 flex-1">
                {([
                  { label: "Frei", value: undefined },
                  { label: "1:1", value: 1 },
                  { label: "16:9", value: 16 / 9 },
                  { label: "4:3", value: 4 / 3 },
                  { label: "3:4", value: 3 / 4 },
                  { label: "9:16", value: 9 / 16 },
                ] as const).map((preset) => (
                  <Button
                    key={preset.label}
                    variant={activeAspect === preset.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs px-1 h-7"
                    onClick={() => setActiveAspect(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Label className="text-xs w-10 shrink-0">Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <Label className="text-xs w-10 shrink-0">Drehen</Label>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={([v]) => setRotation(v)}
              className="flex-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? "Wird zugeschnitten…" : "Zuschneiden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
