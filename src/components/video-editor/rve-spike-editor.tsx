"use client";

import React from "react";
import { ReactVideoEditor } from "@/app/reactvideoeditor/pro/components/react-video-editor";
import { HttpRenderer } from "@/app/reactvideoeditor/pro/utils/http-renderer";
import type { CustomTheme } from "@/app/reactvideoeditor/pro/hooks/use-extended-theme-switcher";
import { DEFAULT_OVERLAYS } from "@/app/constants";
import { worksheetBlocksToRveOverlays } from "@/lib/worksheet-to-rve-overlays";
import { SPIKE_SAMPLE_WORKSHEET_BLOCKS } from "@/components/video-editor/spike-sample-worksheet-blocks";
import { BRAND_FONTS } from "@/types/worksheet";
import "@/app/reactvideoeditor/pro/styles.css";
import "@/app/reactvideoeditor/pro/styles.utilities.css";

const AVAILABLE_THEMES: CustomTheme[] = [
  {
    id: "rve",
    name: "RVE",
    className: "rve",
    color: "#3E8AF5",
  },
];

const SPIKE_PROJECT_ID = "ArbeitsblattWorksheetBlocksMvpV1";
const DEFAULT_VIDEO_BRAND = "edoomio";

export function RveSpikeEditor() {
  const brandFonts = BRAND_FONTS[DEFAULT_VIDEO_BRAND] ?? BRAND_FONTS.edoomio;
  const mappedOverlays = React.useMemo(
    () =>
      worksheetBlocksToRveOverlays(SPIKE_SAMPLE_WORKSHEET_BLOCKS, {
        fps: 30,
        headingSeconds: 3,
        textSeconds: 4,
        imageSeconds: 5,
      }),
    []
  );

  const ssrRenderer = React.useMemo(
    () =>
      new HttpRenderer("/api/latest/ssr", {
        type: "ssr",
        entryPoint: "/api/latest/ssr",
      }),
    []
  );

  return (
    <div className="h-full w-full min-h-0">
      <ReactVideoEditor
        projectId={SPIKE_PROJECT_ID}
        defaultOverlays={(mappedOverlays.length > 0 ? mappedOverlays : DEFAULT_OVERLAYS) as never}
        defaultBrandSettings={{
          brandKey: DEFAULT_VIDEO_BRAND,
          bodyFont: brandFonts.bodyFont,
          primaryColor: brandFonts.primaryColor,
        }}
        fps={30}
        renderer={ssrRenderer}
        disabledPanels={[]}
        availableThemes={AVAILABLE_THEMES}
        defaultTheme="dark"
        showDefaultThemes
        sidebarWidth="clamp(320px, 24vw, 500px)"
        sidebarIconWidth="57.6px"
        showIconTitles={false}
      />
    </div>
  );
}
