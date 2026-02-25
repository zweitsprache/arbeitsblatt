"use client";

import React from "react";
import {
  DEFAULT_BRAND_SETTINGS,
  BRAND_FONTS,
} from "@/types/worksheet";
import { EBookCoverSettings, EBookSettings, PopulatedEBookChapter } from "@/types/ebook";

interface EBookViewerProps {
  title: string;
  chapters: PopulatedEBookChapter[];
  coverSettings: EBookCoverSettings;
  settings: EBookSettings;
  mode: "print" | "online";
}

/**
 * Renders only the cover page and table of contents for the e-book.
 * Individual content PDFs are generated separately and merged by the PDF API route.
 */
export function EBookViewer({
  title,
  chapters,
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

  // Build TOC entries (no page numbers)
  const tocEntries: { chapterTitle: string; itemTitle: string }[] = [];
  chapters.forEach((chapter) => {
    chapter.items.forEach((itemRef) => {
      tocEntries.push({
        chapterTitle: chapter.title,
        itemTitle: itemRef.title,
      });
    });
  });

  // Print mode — only cover + TOC
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
              justify-content: flex-start;
              padding: 8px 0;
              border-bottom: 1px dotted #ccc;
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

      {/* Table of Contents — no page numbers */}
      {settings.showToc && (
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
              <span style={{ color: "#666", fontSize: "10pt", marginRight: "8px" }}>
                {entry.chapterTitle} ·
              </span>
              <span>{entry.itemTitle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
