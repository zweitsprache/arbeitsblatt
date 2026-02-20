"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CoverProvider, useCoverEditor } from "@/store/cover-store";
import {
  CoverDocument,
  CoverElement,
  CoverTextElement,
  CoverImageElement,
  CoverRibbonElement,
  CoverFlagElement,
  COVER_WIDTH,
  COVER_HEIGHT,
  COVER_PAD,
} from "@/types/cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Save,
  Plus,
  Trash2,
  Copy,
  Type,
  ImagePlus,
  Flag,
  Award,
  Download,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  MousePointerClick,
  Eye,
} from "lucide-react";
import { useUpload } from "@/lib/use-upload";
import { authFetch } from "@/lib/auth-fetch";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";

// ─── Pastel color palette ────────────────────────────────────

const PASTEL_COLORS = [
  "#FFFFFF",
  "#F2DDE1", // Rose
  "#F2E2D4", // Peach
  "#F2EDDA", // Buttercup
  "#DAF0DC", // Mint
  "#D8E6F2", // Sky
  "#DED6EC", // Lavender
  "#EADAEE", // Lilac
  "#E4E4EC", // Cloud
];

// ─── Flag map ────────────────────────────────────────────────

const FLAG_MAP: Record<string, string> = {
  DE: "/key_visuals/flag_of_Germany.svg",
  CH: "/key_visuals/flag_of_Switzerland.svg",
  AT: "/key_visuals/flag_of_Germany.svg", // fallback
};

// ─── Canvas scale ────────────────────────────────────────────

/** Compute a scale so the 1190×1684 canvas fits in the available viewport */
function useCanvasScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.45);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 48;
      const h = el.clientHeight - 48;
      const s = Math.min(w / COVER_WIDTH, h / COVER_HEIGHT, 1);
      setScale(Math.max(0.15, s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  return scale;
}

// ─── Cover Canvas (visual preview) ──────────────────────────

function CoverCanvas({ scale }: { scale: number }) {
  const { state, dispatch } = useCoverEditor();
  const { elements, settings, selectedElementId } = state;

  // Drag state
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origTop: number;
    origLeft: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, el: CoverElement) => {
      if (!("top" in el)) return;
      e.stopPropagation();
      dispatch({ type: "SELECT_ELEMENT", payload: el.id });
      dragRef.current = {
        id: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origTop: (el as { top: number }).top,
        origLeft: (el as { left: number }).left,
      };
    },
    [dispatch]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.startX) / scale;
      const dy = (e.clientY - dragRef.current.startY) / scale;
      dispatch({
        type: "UPDATE_ELEMENT",
        payload: {
          id: dragRef.current.id,
          updates: {
            top: Math.round(dragRef.current.origTop + dy),
            left: Math.round(dragRef.current.origLeft + dx),
          },
        },
      });
    };
    const handleMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dispatch, scale]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        dispatch({ type: "SELECT_ELEMENT", payload: null });
      }
    },
    [dispatch]
  );

  const renderElement = (el: CoverElement) => {
    const isSelected = el.id === selectedElementId;
    const outline = isSelected ? "2px solid #3b82f6" : "none";

    switch (el.type) {
      case "text": {
        const t = el as CoverTextElement;
        return (
          <div
            key={el.id}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "SELECT_ELEMENT", payload: el.id });
            }}
            style={{
              position: "absolute",
              top: t.top,
              left: t.left,
              width: t.width > 0 ? t.width : "auto",
              maxWidth: COVER_WIDTH - t.left - COVER_PAD,
              fontFamily: t.fontFamily,
              fontSize: t.fontSize,
              fontWeight: t.fontWeight,
              color: t.color,
              textAlign: t.textAlign,
              textTransform: t.uppercase ? "uppercase" : "none",
              cursor: "move",
              outline,
              outlineOffset: 4,
              whiteSpace: "pre-wrap",
              lineHeight: 1.3,
              userSelect: "none",
            }}
          >
            {t.text}
          </div>
        );
      }
      case "image": {
        const img = el as CoverImageElement;
        return (
          <div
            key={el.id}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "SELECT_ELEMENT", payload: el.id });
            }}
            style={{
              position: "absolute",
              top: img.top,
              left: img.left,
              width: img.width,
              height: img.height,
              borderRadius: img.borderRadius,
              overflow: "hidden",
              border: img.showBorder ? "2px solid #CCCCCC" : "none",
              cursor: "move",
              outline,
              outlineOffset: 4,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: img.objectFit,
              }}
              draggable={false}
            />
          </div>
        );
      }
      case "ribbon": {
        const r = el as CoverRibbonElement;
        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "SELECT_ELEMENT", payload: el.id });
            }}
            style={{
              position: "absolute",
              top: 130,
              left: -110,
              width: 560,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: r.color,
              transform: "rotate(-45deg)",
              transformOrigin: "center center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              cursor: "pointer",
              outline,
              outlineOffset: 4,
            }}
          >
            <span
              style={{
                fontFamily: "Encode Sans, sans-serif",
                fontWeight: 500,
                fontSize: r.fontSize,
                color: r.textColor,
                textTransform: "uppercase",
                letterSpacing: 1,
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {r.text}
            </span>
          </div>
        );
      }
      case "flag": {
        const f = el as CoverFlagElement;
        const src = FLAG_MAP[f.variant] || FLAG_MAP.DE;
        return (
          <div
            key={el.id}
            onMouseDown={(e) => handleMouseDown(e, el)}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "SELECT_ELEMENT", payload: el.id });
            }}
            style={{
              position: "absolute",
              top: f.top,
              left: f.left,
              width: f.width,
              cursor: "move",
              outline,
              outlineOffset: 4,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={f.variant}
              style={{ width: "100%", height: "auto" }}
              draggable={false}
            />
          </div>
        );
      }
    }
  };

  return (
    <div
      onClick={handleCanvasClick}
      style={{
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        backgroundColor: settings.backgroundColor,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        borderRadius: 4,
      }}
    >
      {/* Logo */}
      {settings.showLogo && (
        <div style={{ position: "absolute", top: COVER_PAD, right: COVER_PAD }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lingostar_logo_and_brand_flat.svg"
            alt="Logo"
            width={227}
            height={53}
            draggable={false}
          />
        </div>
      )}

      {/* Render all elements */}
      {elements.map(renderElement)}

      {/* Footer */}
      {settings.showFooter && (
        <div
          style={{
            position: "absolute",
            bottom: COVER_PAD,
            left: COVER_PAD,
            right: COVER_PAD,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "Encode Sans, sans-serif",
            fontSize: 14,
            color: "#666666",
            lineHeight: 1.4,
            pointerEvents: "none",
          }}
        >
          <div>
            <div>{`© ${new Date().getFullYear()} lingostar | Marcel Allenspach`}</div>
            <div>Alle Rechte vorbehalten</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>{state.worksheetId ? state.worksheetId.toUpperCase().slice(0, 8) : "DRAFT"}</div>
            <div>
              {new Date().toLocaleDateString("de-CH", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Properties Panel ────────────────────────────────────────

function PropertiesPanel() {
  const t = useTranslations("coverEditor");
  const { state, dispatch } = useCoverEditor();
  const { elements, selectedElementId, settings } = state;

  const selectedElement = elements.find((e) => e.id === selectedElementId);

  const updateEl = useCallback(
    (updates: Partial<CoverElement>) => {
      if (!selectedElementId) return;
      dispatch({
        type: "UPDATE_ELEMENT",
        payload: { id: selectedElementId, updates },
      });
    },
    [dispatch, selectedElementId]
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Global settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("canvasSettings")}</h3>

          <div className="space-y-2">
            <Label className="text-xs">{t("backgroundColor")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {PASTEL_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-7 h-7 rounded border-2 transition-all cursor-pointer ${
                    settings.backgroundColor === c
                      ? "border-primary scale-110"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_SETTINGS",
                      payload: { backgroundColor: c },
                    })
                  }
                />
              ))}
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    payload: { backgroundColor: e.target.value },
                  })
                }
                className="w-7 h-7 rounded border-2 border-border cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("showLogo")}</Label>
            <Switch
              checked={settings.showLogo}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { showLogo: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("showFooter")}</Label>
            <Switch
              checked={settings.showFooter}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { showFooter: v } })
              }
            />
          </div>
        </div>

        <Separator />

        {/* Selected element properties */}
        {selectedElement ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("elementProperties")}</h3>
              <Badge variant="secondary" className="text-xs">
                {selectedElement.type}
              </Badge>
            </div>

            {selectedElement.type === "text" && (
              <TextProperties el={selectedElement as CoverTextElement} onUpdate={updateEl} />
            )}
            {selectedElement.type === "image" && (
              <ImageProperties el={selectedElement as CoverImageElement} onUpdate={updateEl} />
            )}
            {selectedElement.type === "ribbon" && (
              <RibbonProperties el={selectedElement as CoverRibbonElement} onUpdate={updateEl} />
            )}
            {selectedElement.type === "flag" && (
              <FlagProperties el={selectedElement as CoverFlagElement} onUpdate={updateEl} />
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t("selectElement")}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ─── Text Properties ─────────────────────────────────────────

function TextProperties({
  el,
  onUpdate,
}: {
  el: CoverTextElement;
  onUpdate: (u: Partial<CoverTextElement>) => void;
}) {
  const t = useTranslations("coverEditor");
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("text")}</Label>
        <textarea
          className="w-full rounded border border-border px-2 py-1.5 text-sm min-h-[60px] resize-y"
          value={el.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("fontFamily")}</Label>
          <Select
            value={el.fontFamily}
            onValueChange={(v) =>
              onUpdate({ fontFamily: v as "Encode Sans" | "Merriweather" })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Encode Sans">Encode Sans</SelectItem>
              <SelectItem value="Merriweather">Merriweather</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("fontSize")}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={el.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            min={8}
            max={120}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("fontWeight")}</Label>
          <Select
            value={String(el.fontWeight)}
            onValueChange={(v) => onUpdate({ fontWeight: Number(v) as 400 | 500 | 600 | 700 })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">Regular</SelectItem>
              <SelectItem value="500">Medium</SelectItem>
              <SelectItem value="600">Semibold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("textAlign")}</Label>
          <Select
            value={el.textAlign}
            onValueChange={(v) => onUpdate({ textAlign: v as "left" | "center" | "right" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t("left")}</SelectItem>
              <SelectItem value="center">{t("center")}</SelectItem>
              <SelectItem value="right">{t("right")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("color")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={el.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-8 h-8 rounded border border-border cursor-pointer"
            />
            <Input
              className="h-8 text-xs flex-1"
              value={el.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("width")}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={el.width}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            min={0}
            max={COVER_WIDTH}
            placeholder="auto"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("uppercase")}</Label>
        <Switch
          checked={el.uppercase}
          onCheckedChange={(v) => onUpdate({ uppercase: v })}
        />
      </div>
      <PositionFields top={el.top} left={el.left} onUpdate={onUpdate} />
    </div>
  );
}

// ─── Image Properties ────────────────────────────────────────

function ImageProperties({
  el,
  onUpdate,
}: {
  el: CoverImageElement;
  onUpdate: (u: Partial<CoverImageElement>) => void;
}) {
  const t = useTranslations("coverEditor");
  const { upload, isUploading } = useUpload();
  const [mediaBrowserOpen, setMediaBrowserOpen] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const result = await upload(file);
      onUpdate({ src: result.url });
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("imageSource")}</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setMediaBrowserOpen(true)}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5 mr-1" />
            )}
            {t("chooseImage")}
          </Button>
        </div>
        {el.src && (
          <div className="mt-2 rounded border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={el.src} alt="" className="w-full h-24 object-cover" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("width")}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={el.width}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            min={10}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("height")}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={el.height}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            min={10}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("borderRadius")}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={el.borderRadius}
            onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("objectFit")}</Label>
          <Select
            value={el.objectFit}
            onValueChange={(v) => onUpdate({ objectFit: v as "cover" | "contain" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showBorder")}</Label>
        <Switch
          checked={el.showBorder}
          onCheckedChange={(v) => onUpdate({ showBorder: v })}
        />
      </div>
      <PositionFields top={el.top} left={el.left} onUpdate={onUpdate} />

      <MediaBrowserDialog
        open={mediaBrowserOpen}
        onOpenChange={setMediaBrowserOpen}
        onSelectUrl={(url) => {
          onUpdate({ src: url });
          setMediaBrowserOpen(false);
        }}
        onSelectFile={async (file) => {
          setMediaBrowserOpen(false);
          await handleFileUpload(file);
        }}
        title={t("chooseImage")}
      />
    </div>
  );
}

// ─── Ribbon Properties ───────────────────────────────────────

function RibbonProperties({
  el,
  onUpdate,
}: {
  el: CoverRibbonElement;
  onUpdate: (u: Partial<CoverRibbonElement>) => void;
}) {
  const t = useTranslations("coverEditor");
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("text")}</Label>
        <Input
          className="h-8 text-xs"
          value={el.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("ribbonColor")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={el.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-8 h-8 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("textColor")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={el.textColor}
              onChange={(e) => onUpdate({ textColor: e.target.value })}
              className="w-8 h-8 rounded border border-border cursor-pointer"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t("fontSize")}</Label>
        <Input
          type="number"
          className="h-8 text-xs"
          value={el.fontSize}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          min={12}
          max={48}
        />
      </div>
    </div>
  );
}

// ─── Flag Properties ─────────────────────────────────────────

function FlagProperties({
  el,
  onUpdate,
}: {
  el: CoverFlagElement;
  onUpdate: (u: Partial<CoverFlagElement>) => void;
}) {
  const t = useTranslations("coverEditor");
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("flagVariant")}</Label>
        <Select
          value={el.variant}
          onValueChange={(v) => onUpdate({ variant: v as "DE" | "CH" | "AT" })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DE">🇩🇪 Deutschland</SelectItem>
            <SelectItem value="CH">🇨🇭 Schweiz</SelectItem>
            <SelectItem value="AT">🇦🇹 Österreich</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t("width")}</Label>
        <Input
          type="number"
          className="h-8 text-xs"
          value={el.width}
          onChange={(e) => onUpdate({ width: Number(e.target.value) })}
          min={24}
          max={240}
        />
      </div>
      <PositionFields top={el.top} left={el.left} onUpdate={onUpdate} />
    </div>
  );
}

// ─── Position helper ─────────────────────────────────────────

function PositionFields({
  top,
  left,
  onUpdate,
}: {
  top: number;
  left: number;
  onUpdate: (u: { top?: number; left?: number }) => void;
}) {
  const t = useTranslations("coverEditor");
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs">{t("positionTop")}</Label>
        <Input
          type="number"
          className="h-8 text-xs"
          value={top}
          onChange={(e) => onUpdate({ top: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t("positionLeft")}</Label>
        <Input
          type="number"
          className="h-8 text-xs"
          value={left}
          onChange={(e) => onUpdate({ left: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

// ─── Element list (left sidebar) ─────────────────────────────

function ElementList() {
  const t = useTranslations("coverEditor");
  const { state, dispatch, addTextElement, addRibbon, addFlag, duplicateElement } = useCoverEditor();
  const { elements, selectedElementId } = state;
  const [mediaBrowserOpen, setMediaBrowserOpen] = useState(false);
  const { upload } = useUpload();
  const { addImageElement } = useCoverEditor();

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newEls = [...elements];
    [newEls[index - 1], newEls[index]] = [newEls[index], newEls[index - 1]];
    dispatch({ type: "REORDER_ELEMENTS", payload: newEls });
  };

  const moveDown = (index: number) => {
    if (index >= elements.length - 1) return;
    const newEls = [...elements];
    [newEls[index], newEls[index + 1]] = [newEls[index + 1], newEls[index]];
    dispatch({ type: "REORDER_ELEMENTS", payload: newEls });
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-3.5 w-3.5" />;
      case "image":
        return <ImagePlus className="h-3.5 w-3.5" />;
      case "ribbon":
        return <Award className="h-3.5 w-3.5" />;
      case "flag":
        return <Flag className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const labelFor = (el: CoverElement) => {
    switch (el.type) {
      case "text":
        return (el as CoverTextElement).text.slice(0, 30) || "Text";
      case "image":
        return "Image";
      case "ribbon":
        return (el as CoverRibbonElement).text || "Ribbon";
      case "flag":
        return `Flag (${(el as CoverFlagElement).variant})`;
      default:
        return "Element";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-background">
        <h3 className="text-sm font-semibold mb-2">{t("elements")}</h3>
        <div className="flex flex-wrap gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={addTextElement}>
                <Type className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("addText")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMediaBrowserOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("addImage")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={addRibbon}>
                <Award className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("addRibbon")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addFlag("DE")}>
                <Flag className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("addFlag")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {elements.map((el, i) => (
            <div
              key={el.id}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                el.id === selectedElementId
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "hover:bg-muted border border-transparent"
              }`}
              onClick={() => dispatch({ type: "SELECT_ELEMENT", payload: el.id })}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
              {iconFor(el.type)}
              <span className="flex-1 truncate">{labelFor(el)}</span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveUp(i);
                  }}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveDown(i);
                  }}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateElement(el.id);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  className="p-0.5 hover:bg-destructive/10 text-destructive rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_ELEMENT", payload: el.id });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <MediaBrowserDialog
        open={mediaBrowserOpen}
        onOpenChange={setMediaBrowserOpen}
        onSelectUrl={(url) => {
          addImageElement(url);
          setMediaBrowserOpen(false);
        }}
        onSelectFile={async (file) => {
          setMediaBrowserOpen(false);
          try {
            const result = await upload(file);
            addImageElement(result.url);
          } catch (err) {
            console.error("Upload error:", err);
          }
        }}
        title={t("addImage")}
      />
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────

function CoverToolbar() {
  const t = useTranslations("coverEditor");
  const { state, dispatch, save } = useCoverEditor();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPng = async () => {
    if (!state.worksheetId) {
      // Save first
      await save();
    }
    if (!state.worksheetId) return;
    setDownloading(true);
    try {
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/cover-png`, {
        method: "POST",
      });
      if (!res.ok) {
        console.error("PNG generation failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.title || "cover"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border-b bg-background px-4 py-2 flex items-center gap-3">
      <Input
        className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto max-w-md"
        value={state.title}
        onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
        placeholder={t("untitledCover")}
      />

      <div className="ml-auto flex items-center gap-2">
        {state.isDirty && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {t("unsaved")}
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PNG
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("downloadPng")}</TooltipContent>
        </Tooltip>

        <Button
          size="sm"
          onClick={save}
          disabled={state.isSaving || !state.isDirty}
          className="gap-1.5"
        >
          {state.isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Inner editor (inside provider) ─────────────────────────

function CoverEditorInner({ initialData }: { initialData?: CoverDocument }) {
  const { dispatch } = useCoverEditor();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scale = useCanvasScale(canvasContainerRef);

  // Load initial data on mount
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          elements: initialData.elements,
          settings: initialData.settings,
          published: initialData.published,
        },
      });
    }
  }, [initialData, dispatch]);

  return (
    <div className="flex flex-col h-full">
      <CoverToolbar />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar — element list */}
        <div className="w-64 border-r bg-background flex flex-col shrink-0">
          <ElementList />
        </div>

        {/* Center — canvas preview */}
        <div
          ref={canvasContainerRef}
          className="flex-1 bg-muted/40 overflow-auto flex items-start justify-center p-6"
        >
          <div
            style={{
              width: COVER_WIDTH * scale,
              height: COVER_HEIGHT * scale,
            }}
          >
            <CoverCanvas scale={scale} />
          </div>
        </div>

        {/* Right sidebar — properties panel */}
        <div className="w-72 border-l bg-background flex flex-col shrink-0">
          <div className="p-3 border-b">
            <h3 className="text-sm font-semibold">
              <Eye className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              Properties
            </h3>
          </div>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Public component ────────────────────────────────────────

export function CoverEditor({ initialData }: { initialData?: CoverDocument }) {
  return (
    <TooltipProvider delayDuration={300}>
      <CoverProvider>
        <CoverEditorInner initialData={initialData} />
      </CoverProvider>
    </TooltipProvider>
  );
}
