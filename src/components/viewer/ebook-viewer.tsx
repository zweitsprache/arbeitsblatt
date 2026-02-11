"use client";

import React from "react";
import {
  WorksheetBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
  DEFAULT_BRAND_SETTINGS,
  BRAND_FONTS,
} from "@/types/worksheet";
import { EBookCoverSettings, EBookSettings, PopulatedEBookChapter } from "@/types/ebook";
import { ViewerBlockRenderer } from "./viewer-block-renderer";

interface WorksheetData {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
}

interface EBookViewerProps {
  title: string;
  chapters: PopulatedEBookChapter[];
  worksheets: Map<string, WorksheetData>;
  coverSettings: EBookCoverSettings;
  settings: EBookSettings;
  mode: "print" | "online";
}

export function EBookViewer({
  title,
  chapters,
  worksheets,
  coverSettings,
  settings,
  mode,
}: EBookViewerProps) {
  const brandFonts = BRAND_FONTS[settings.brand || "edoomio"];
  const fontFamily = brandFonts.bodyFont;
  const headlineFont = brandFonts.headlineFont;
  const fontUrl = brandFonts.googleFontsUrl;

  const brandSettings = {
    ...DEFAULT_BRAND_SETTINGS[settings.brand || "edoomio"],
    ...settings.brandSettings,
  };

  // Calculate TOC entries with page numbers
  // Cover = page 1, TOC = page 2 (could be multiple pages), then worksheets
  const tocEntries: { chapterTitle: string; worksheetTitle: string; page: number }[] = [];
  let currentPage = 3; // Start after cover (1) and TOC (2)

  chapters.forEach((chapter) => {
    chapter.worksheets.forEach((wsRef) => {
      const ws = worksheets.get(wsRef.id);
      if (ws) {
        tocEntries.push({
          chapterTitle: chapter.title,
          worksheetTitle: ws.title,
          page: currentPage,
        });
        // Estimate pages per worksheet (rough: 1 page per 3 blocks)
        currentPage += Math.max(1, Math.ceil(ws.blocks.length / 3));
      }
    });
  });

  // Format page number based on settings
  const formatPageNumber = (pageNum: number) => {
    if (settings.pageNumberFormat === "roman") {
      const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
      return romanNumerals[pageNum - 1] || String(pageNum);
    }
    if (settings.pageNumberFormat === "dash") {
      return `- ${pageNum} -`;
    }
    return String(pageNum);
  };

  if (mode !== "print") {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto py-8 px-4 max-w-3xl">
          <div className="bg-background rounded-xl shadow-sm border p-8">
            <h1 className="text-2xl font-bold mb-4">{title}</h1>
            <p className="text-muted-foreground">
              E-Book with {chapters.length} chapters
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Print mode
  return (
    <div className="min-h-screen bg-white">
      {/* Styles */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { margin: 0; size: A4; }
            html, body { margin: 0; padding: 0; }
            body { 
              font-family: ${fontFamily}; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            h1, h2, h3, h4, h5, h6 { 
              font-family: ${headlineFont}; 
              font-weight: ${brandFonts.headlineWeight}; 
            }
            .page-break { page-break-after: always; break-after: page; }
            .ebook-cover {
              width: 210mm;
              height: 297mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 40mm 30mm;
              box-sizing: border-box;
            }
            .ebook-toc {
              width: 210mm;
              min-height: 297mm;
              padding: 30mm;
              box-sizing: border-box;
            }
            .ebook-toc-entry {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dotted #ccc;
            }
            .ebook-worksheet {
              width: 210mm;
              min-height: 297mm;
              padding: 20mm 25mm;
              box-sizing: border-box;
            }
            .ebook-chapter-header {
              font-size: 10pt;
              color: #666;
              margin-bottom: 8px;
            }
            .worksheet-block { break-inside: avoid; page-break-inside: avoid; }
            .worksheet-block-text { break-inside: auto; page-break-inside: auto; }
            .ebook-footer {
              position: fixed;
              bottom: 15mm;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 9pt;
              color: #666;
            }
          `,
        }}
      />

      {/* Cover Page */}
      <div
        className="ebook-cover"
        style={{
          backgroundColor: coverSettings.backgroundColor,
          color: coverSettings.textColor,
        }}
      >
        {coverSettings.coverImage && (
          <img
            src={coverSettings.coverImage}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "40%",
              objectFit: "contain",
              marginBottom: "30mm",
            }}
          />
        )}
        <h1
          style={{
            fontSize: "32pt",
            fontWeight: "bold",
            marginBottom: "10mm",
            fontFamily: headlineFont,
          }}
        >
          {coverSettings.title || title}
        </h1>
        {coverSettings.subtitle && (
          <p style={{ fontSize: "16pt", marginBottom: "15mm", opacity: 0.8 }}>
            {coverSettings.subtitle}
          </p>
        )}
        {coverSettings.author && (
          <p style={{ fontSize: "12pt", opacity: 0.7 }}>{coverSettings.author}</p>
        )}
        {coverSettings.showLogo && brandSettings.logo && (
          <img
            src={brandSettings.logo}
            alt=""
            style={{ height: "15mm", marginTop: "20mm" }}
          />
        )}
      </div>
      <div className="page-break" />

      {/* Table of Contents */}
      {settings.showToc && (
        <>
          <div className="ebook-toc">
            <h2
              style={{
                fontSize: "20pt",
                fontWeight: "bold",
                marginBottom: "15mm",
                fontFamily: headlineFont,
              }}
            >
              {settings.tocTitle || "Table of Contents"}
            </h2>
            {tocEntries.map((entry, idx) => (
              <div key={idx} className="ebook-toc-entry">
                <div>
                  <span style={{ color: "#666", fontSize: "10pt" }}>
                    {entry.chapterTitle} ·{" "}
                  </span>
                  <span>{entry.worksheetTitle}</span>
                </div>
                <span>{formatPageNumber(entry.page)}</span>
              </div>
            ))}
          </div>
          <div className="page-break" />
        </>
      )}

      {/* Worksheets */}
      {chapters.map((chapter) => (
        <React.Fragment key={chapter.id}>
          {chapter.worksheets.map((wsRef, wsIdx) => {
            const ws = worksheets.get(wsRef.id);
            if (!ws) return null;

            const visibleBlocks = ws.blocks.filter(
              (b) => b.visibility === "both" || b.visibility === "print"
            );

            return (
              <React.Fragment key={wsRef.id}>
                <div className="ebook-worksheet" style={{ fontSize: settings.fontSize }}>
                  <div className="ebook-chapter-header">{chapter.title}</div>
                  <h2
                    style={{
                      fontSize: "16pt",
                      fontWeight: "bold",
                      marginBottom: "10mm",
                      fontFamily: headlineFont,
                    }}
                  >
                    {ws.title}
                  </h2>
                  <div className="space-y-6">
                    {visibleBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={`worksheet-block worksheet-block-${block.type}`}
                      >
                        <ViewerBlockRenderer
                          block={block}
                          mode="print"
                          primaryColor={brandFonts.primaryColor}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Page break after each worksheet except the last */}
                {wsIdx < chapter.worksheets.length - 1 && (
                  <div className="page-break" />
                )}
              </React.Fragment>
            );
          })}
          <div className="page-break" />
        </React.Fragment>
      ))}
    </div>
  );
}
