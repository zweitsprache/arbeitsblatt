import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import archiver from "archiver";
import { PassThrough } from "stream";
import {
  readLogoAsPngDataUri,
  compressImageUrl,
  renderCoverPng,
  replaceEszett,
  renderToBuffer,
  GrammarTablePDF,
  TENSES,
} from "../grammar-table-pdf-v2/route";
import {
  VerbConjugationTable,
  GrammarTableSettings,
  VerbTense,
  TENSE_LABELS,
} from "@/types/grammar-table";
import {
  DEFAULT_BRAND_SETTINGS,
  BrandSettings,
} from "@/types/worksheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/worksheets/[id]/grammar-table-collection
 *
 * Generates a ZIP containing verb-conjugation assets for all locale × mode combinations:
 *   4 covers  — DE simplified, DE full, CH simplified, CH full  (PNG)
 *   4 PDFs    — DE simplified, DE full, CH simplified, CH full  (without title page)
 *
 * Loads shared data (auth, DB, logos, images) once, then renders 8 variants directly.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Validate worksheet exists and belongs to user
  const worksheet = await prisma.worksheet.findFirst({
    where: {
      id,
      userId,
    } as Parameters<typeof prisma.worksheet.findFirst>[0] extends {
      where?: infer W;
    }
      ? W
      : never,
  });

  if (!worksheet || worksheet.type !== "grammar-table") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blocksData = worksheet.blocks as unknown as {
    tableType?: string;
    tableData?: VerbConjugationTable[];
  } | null;

  if (blocksData?.tableType !== "verb-conjugation") {
    return NextResponse.json(
      { error: "Collection is only supported for verb-conjugation tables" },
      { status: 400 },
    );
  }

  const conjTablesUnsorted = blocksData?.tableData as VerbConjugationTable[];
  if (!Array.isArray(conjTablesUnsorted) || conjTablesUnsorted.length === 0) {
    return NextResponse.json(
      { error: "No conjugation data to export" },
      { status: 400 },
    );
  }

  const settings = (worksheet.settings ?? {}) as unknown as GrammarTableSettings;
  const brand = settings.brand || "edoomio";
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...settings.brandSettings,
  };

  const shortId = id.slice(0, 16);

  try {
    // ── Load shared assets once ──
    console.log("[Collection] Loading shared assets…");
    const [bigLogoDataUri, flagDE, flagCH, iconDataUri] = await Promise.all([
      readLogoAsPngDataUri("logo/lingostar_logo_and_brand_flat.svg", 800),
      readLogoAsPngDataUri("key_visuals/flag_of_Germany.svg", 200),
      readLogoAsPngDataUri("key_visuals/flag_of_Switzerland.svg", 200),
      brandSettings.logo
        ? readLogoAsPngDataUri(brandSettings.logo.replace(/^\//, ""), 200)
        : Promise.resolve(""),
    ]);

    // Compress cover images once
    const rawCoverImages = settings.coverImages ?? [];
    const compressedCoverImages = await Promise.all(
      rawCoverImages.map((url) =>
        url && url !== "" ? compressImageUrl(url, 400, 75) : Promise.resolve(url)
      )
    );
    const pdfSettings = { ...settings, coverImages: compressedCoverImages };

    // Sort verbs alphabetically
    const sortKey = (verb: string) => verb.replace(/^sich\s+/i, "");
    const conjTablesSorted = (settings.alphabeticalOrder ?? true)
      ? [...conjTablesUnsorted].sort((a, b) =>
          sortKey(a.input.verb).localeCompare(sortKey(b.input.verb), "de")
        )
      : conjTablesUnsorted;

    console.log("[Collection] Assets loaded. Generating 8 variants…");

    // ── Define all 8 variants ──
    type Variant = {
      locale: "DE" | "CH";
      simplified: boolean;
      format: "pdf" | "cover";
      filename: string;
    };

    const variants: Variant[] = [
      // Covers
      { locale: "DE", simplified: false, format: "cover", filename: `${shortId}_EX_cover_DE.png` },
      { locale: "DE", simplified: true,  format: "cover", filename: `${shortId}_cover_DE.png` },
      { locale: "CH", simplified: false, format: "cover", filename: `${shortId}_EX_cover_CH.png` },
      { locale: "CH", simplified: true,  format: "cover", filename: `${shortId}_cover_CH.png` },
      // PDFs (without title page)
      { locale: "DE", simplified: false, format: "pdf",   filename: `${shortId}_EX_DE.pdf` },
      { locale: "DE", simplified: true,  format: "pdf",   filename: `${shortId}_DE.pdf` },
      { locale: "CH", simplified: false, format: "pdf",   filename: `${shortId}_EX_CH.pdf` },
      { locale: "CH", simplified: true,  format: "pdf",   filename: `${shortId}_CH.pdf` },
    ];

    const files: { name: string; data: Buffer }[] = [];

    for (const variant of variants) {
      console.log(`[Collection] Generating ${variant.filename}…`);
      const isSwiss = variant.locale === "CH";
      const flagDataUri = isSwiss ? flagCH : flagDE;

      if (variant.format === "cover") {
        // ── Generate cover PNG ──
        const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;
        const activeTenses: VerbTense[] = variant.simplified
          ? TENSES.filter((t) => (settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false })[t])
          : [];
        const tenseLabel = variant.simplified
          ? activeTenses.map((t) => TENSE_LABELS[t].de).join(" · ") + " – 3. Person Singular Perfekt und Präteritum"
          : "Präsens · Perfekt · Präteritum";
        let coverSubtitle = "Verbkonjugation";
        let coverTenseInfo = `Indikativ | ${tenseLabel}`;
        if (isSwiss) {
          coverSubtitle = replaceEszett(coverSubtitle);
          coverTenseInfo = replaceEszett(coverTenseInfo);
        }

        const pngBuffer = await renderCoverPng({
          subtitle: coverSubtitle,
          title: pdfTitle,
          tenseInfo: coverTenseInfo,
          settings: isSwiss ? replaceEszett(pdfSettings) : pdfSettings,
          worksheetId: worksheet.id,
          bigLogoDataUri,
          flagDataUri,
          ribbonLabel: variant.simplified ? "Kompakte Version" : "Ausführliche Version",
          ribbonColor: variant.simplified ? "#4A3D55" : "#3A6570",
        });

        files.push({ name: variant.filename, data: Buffer.from(pngBuffer) });
      } else {
        // ── Generate PDF ──
        const conjTables = isSwiss ? replaceEszett(conjTablesSorted) : conjTablesSorted;
        const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;
        const variantSettings = isSwiss ? replaceEszett(pdfSettings) : pdfSettings;

        const buffer = Buffer.from(
          await renderToBuffer(
            React.createElement(GrammarTablePDF, {
              title: pdfTitle,
              tables: conjTables,
              settings: variantSettings,
              brand,
              worksheetId: worksheet.id,
              bigLogoDataUri,
              iconDataUri,
              simplified: variant.simplified,
              simplifiedTenses: settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false },
              showIrregularHighlights: settings.showIrregularHighlights ?? false,
              includeTitlePage: false,
            })
          )
        );

        files.push({ name: variant.filename, data: buffer });
      }
      console.log(`[Collection] ✓ ${variant.filename} (${(files[files.length - 1].data.length / 1024).toFixed(0)} KB)`);
    }

    // ── Build ZIP ──
    // We must start consuming the output stream BEFORE calling finalize(),
    // otherwise the PassThrough backpressures archiver and finalize() never resolves.
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    // Start collecting chunks immediately (before finalize)
    const collectPromise = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      passthrough.on("data", (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      passthrough.on("end", () => resolve(Buffer.concat(chunks)));
      passthrough.on("error", reject);
    });

    for (const file of files) {
      archive.append(file.data, { name: file.name });
    }

    archive.finalize(); // don't await — let it write concurrently while we read
    const zipBuffer = await collectPromise;

    const zipFilename = `${shortId}_collection.zip`;
    console.log(`[Collection] ✓ ZIP ready: ${zipFilename} (${(zipBuffer.length / 1024).toFixed(0)} KB, ${files.length} files)`);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    console.error("[Collection] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Collection generation failed: ${message}` },
      { status: 500 },
    );
  }
}
