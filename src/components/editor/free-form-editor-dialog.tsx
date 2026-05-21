"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useEditor } from "@/store/editor-store";
import { useTranslations } from "next-intl";
import { FreeFormBlock, FreeFormScene, applyBrandOverrides, normalizeFreeFormScene } from "@/types/worksheet";
import { FreeFormEditorShell } from "./free-form-editor-shell";

const FreeFormCanvas = dynamic(
  () => import("./free-form-canvas").then((module) => module.FreeFormCanvas),
  { ssr: false },
);

type FreeFormEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: FreeFormBlock;
  onChange: (updates: Partial<FreeFormBlock>) => void;
};

export function FreeFormPreview({ scene, title, defaultTextFontFamily }: { scene: FreeFormScene; title?: string; defaultTextFontFamily?: string }) {
  const normalizedScene = React.useMemo(() => normalizeFreeFormScene(scene), [scene]);
  const previewWidth = 560;
  const previewHeight = Math.max(180, Math.round((normalizedScene.height / Math.max(normalizedScene.width, 1)) * previewWidth));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        <span>{title || "Free Form"}</span>
        <span>Preview</span>
      </div>
      <div className="overflow-auto bg-slate-100 p-3">
        <div className="mx-auto w-fit rounded-md border border-slate-200 bg-white shadow-sm">
          <FreeFormCanvas scene={normalizedScene} width={previewWidth} height={previewHeight} defaultFontFamily={defaultTextFontFamily} />
        </div>
      </div>
    </div>
  );
}

export function FreeFormEditorDialog({ open, onOpenChange, block, onChange }: FreeFormEditorDialogProps) {
  const { state } = useEditor();
  const t = useTranslations("blockRenderer");
  const resolvedBrand = React.useMemo(
    () => applyBrandOverrides(state.brandProfile, state.settings.brandOverrides),
    [state.brandProfile, state.settings.brandOverrides],
  );
  const defaultTextFontFamily = resolvedBrand.bodyFont?.trim() || state.settings.fontFamily;
  const brandFontStylesheetUrl = resolvedBrand.googleFontsUrl?.trim() || "";
  const [fontVersion, setFontVersion] = React.useState(0);

  React.useEffect(() => {
    if (!open || !brandFontStylesheetUrl || typeof document === "undefined") {
      return;
    }

    let cancelled = false;
    const selector = `link[data-free-form-font="${CSS.escape(brandFontStylesheetUrl)}"]`;
    let link = document.head.querySelector<HTMLLinkElement>(selector);

    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = brandFontStylesheetUrl;
      link.setAttribute("data-free-form-font", brandFontStylesheetUrl);
      document.head.appendChild(link);
    }

    const waitForLink = () => new Promise<void>((resolve) => {
      if (!link) {
        resolve();
        return;
      }

      const done = () => resolve();
      if (link.sheet) {
        resolve();
        return;
      }

      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
    });

    const waitForFont = async () => {
      await waitForLink();

      if (typeof document !== "undefined" && "fonts" in document) {
        await Promise.allSettled([
          document.fonts.load(`16px ${defaultTextFontFamily}`),
          document.fonts.ready,
        ]);
      }

      if (!cancelled) {
        setFontVersion((current) => current + 1);
      }
    };

    void waitForFont();

    return () => {
      cancelled = true;
    };
  }, [brandFontStylesheetUrl, defaultTextFontFamily, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none overflow-hidden p-0 sm:max-w-none [&_button[data-slot=button]]:h-8 [&_button[data-slot=select-trigger]]:h-8 [&_input[data-slot=input]]:h-8" showCloseButton>
        <DialogTitle className="sr-only">{t("freeFormPanelTitle")}</DialogTitle>
        <FreeFormEditorShell
          block={{ ...block, scene: normalizeFreeFormScene(block.scene) }}
          brandProfile={resolvedBrand}
          defaultTextFontFamily={defaultTextFontFamily}
          fontVersion={fontVersion}
          onChange={onChange}
        />
      </DialogContent>
    </Dialog>
  );
}