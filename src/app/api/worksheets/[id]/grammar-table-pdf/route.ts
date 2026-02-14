import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import {
  AdjectiveDeclinationTable,
  VerbConjugationTable,
  CaseSection,
  GrammarTableSettings,
  GrammarTableType,
  CASE_LABELS,
  TENSE_LABELS,
  GrammatikalFall,
  VerbTense,
  CONJUGATION_ROWS,
  StaticRowDef,
  PersonKey,
} from "@/types/grammar-table";
import { DEFAULT_BRAND_SETTINGS, BrandSettings, BRAND_FONTS, Brand } from "@/types/worksheet";
import fs from "fs";
import path from "path";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Replace brand template variables in header/footer HTML */
function replaceVariables(html: string, brandSettings: BrandSettings): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  return html
    .replace(/\{current_date\}/g, dateStr)
    .replace(/\{current_year\}/g, String(now.getFullYear()))
    .replace(/\{organization\}/g, brandSettings.organization || "")
    .replace(/\{teacher\}/g, brandSettings.teacher || "");
}

// ─── Gap-based table constants (matching v2 Verbkonjugation style) ──────────
const CELL_GAP = 1.5;        // pt – white gap between cells
const GROUP_GAP = CELL_GAP * 3; // pt – wider gap between gender column groups

// Gender background colours
const GENDER_COLORS: Record<string, string> = {
  maskulin: "#F2E2D4",    // Peach
  neutrum: "#D8E6F2",     // Sky
  feminin: "#F2EDDA",     // Buttercup
  plural: "#DAF0DC",      // Mint
};
const NOTES_BG = "#E4E4EC"; // Cloud

/**
 * Build HTML for a single case table – gap-based style (no borders,
 * white space between coloured cells) matching the v2 Verbkonjugation PDF.
 */
function renderCaseTable(
  caseSection: CaseSection,
  settings: GrammarTableSettings,
): string {
  if (!caseSection.groups || caseSection.groups.length === 0) {
    return "";
  }

  const hasPreps = (caseSection.case === "akkusativ" || caseSection.case === "dativ") && settings.showPrepositions;
  const hasNotes = (caseSection.case === "nominativ" || caseSection.case === "genitiv") && settings.showNotes;
  const showLastColumn = hasPreps || hasNotes;

  // Calculate total rows for this case (for preposition rowspan)
  let totalRows = 0;
  for (const group of caseSection.groups) {
    totalRows += group.articleRows?.length ?? 1;
  }
  // +2 for the two header rows
  const totalRowsIncHeaders = totalRows + 2;

  // Shared cell style (no borders – gaps come from border-spacing on white bg)
  const cell = (bg: string, extra = "") =>
    `background-color:${bg};padding:3pt 6pt;text-align:left;font-size:9pt;${extra}`;

  let rows = "";
  let globalRowIndex = 0;
  const totalGroups = caseSection.groups.length;
  let groupIdx = 0;

  for (const group of caseSection.groups) {
    const articleRows = group.articleRows ?? [];
    const rowCount = articleRows.length || 1;
    const isLastGroup = groupIdx === totalGroups - 1;

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const row = articleRows[rowIdx];
      const isFirstRowInGroup = rowIdx === 0;
      const isGlobalFirstRow = globalRowIndex === 0;
      const isLastRow = globalRowIndex === totalRows - 1;

      const getCell = (gender: "maskulin" | "neutrum" | "feminin") => {
        const shared = group.shared?.[gender] || { adjective: "", noun: "" };
        return { article: row?.[gender] || "", adjective: shared.adjective, noun: shared.noun };
      };

      const pluralCell = {
        article: row?.plural || "",
        adjective: row?.pluralOverride?.adjective || group.shared?.plural?.adjective || "",
        noun: row?.pluralOverride?.noun || group.shared?.plural?.noun || "",
      };

      rows += `<tr>`;

      // Gender data cells
      (["maskulin", "neutrum", "feminin"] as const).forEach((gender) => {
        const c = getCell(gender);
        const bg = GENDER_COLORS[gender];
        const cornerBL = (isLastRow && gender === "maskulin") ? "border-bottom-left-radius:3px;" : "";
        rows += `<td style="${cell(bg, cornerBL)}">${escapeHtml(c.article)}</td>`;
        if (isFirstRowInGroup) {
          rows += `<td rowspan="${rowCount}" style="${cell(bg)}">${escapeHtml(c.adjective)}</td>`;
          rows += `<td rowspan="${rowCount}" style="${cell(bg)}">${escapeHtml(c.noun)}</td>`;
        }
      });

      // Plural
      const pBg = GENDER_COLORS.plural;
      rows += `<td style="${cell(pBg)}">${escapeHtml(pluralCell.article)}</td>`;
      if (isFirstRowInGroup) {
        const cornerBR = (!showLastColumn && isLastGroup) ? "border-bottom-right-radius:3px;" : "";
        rows += `<td rowspan="${rowCount}" style="${cell(pBg)}">${escapeHtml(pluralCell.adjective)}</td>`;
        rows += `<td rowspan="${rowCount}" style="${cell(pBg, cornerBR)}">${escapeHtml(pluralCell.noun)}</td>`;
      }

      // Prepositions (akkusativ/dativ)
      if (showLastColumn && isGlobalFirstRow && hasPreps) {
        rows += `<td rowspan="${totalRows}" style="${cell(NOTES_BG, "vertical-align:top;font-size:8pt;border-bottom-right-radius:3px;")}">`;
        if (caseSection.prepositionHeading) {
          rows += `<div style="font-weight:700;margin-bottom:4px;">${escapeHtml(caseSection.prepositionHeading)}</div>`;
        }
        if (caseSection.prepositions) {
          for (const p of caseSection.prepositions) {
            rows += `<div style="margin-bottom:2px;">${escapeHtml(p)}</div>`;
          }
        }
        rows += `</td>`;
      }

      // Notes (nominativ/genitiv)
      if (showLastColumn && !hasPreps && isFirstRowInGroup) {
        const notesBRR = isLastGroup ? "border-bottom-right-radius:3px;" : "";
        rows += `<td rowspan="${rowCount}" style="${cell(NOTES_BG, "vertical-align:top;font-size:8pt;" + notesBRR)}">${escapeHtml(group.note || "")}</td>`;
      }

      rows += `</tr>`;
      globalRowIndex++;
    }
    groupIdx++;
  }

  // Column widths
  const colWidth = "6.67%";
  const lastColHeader = hasPreps ? "Präpositionen" : hasNotes ? "Anmerkungen" : "";

  return `
    <div style="margin-bottom:12mm;">
      <div style="font-size:11pt;font-weight:700;margin-bottom:2mm;color:#000;text-align:left;">${CASE_LABELS[caseSection.case].de}</div>
      <div style="background-color:#ffffff;">
      <table style="border-collapse:separate;border-spacing:${CELL_GAP}pt;width:100%;table-layout:fixed;border-radius:4px;overflow:hidden;">
        <colgroup>
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          ${showLastColumn ? `<col style="width:${Number(colWidth.replace('%','')) * 3}%">` : ''}
        </colgroup>
        <thead>
          <tr>
            <th colspan="3" style="${cell(GENDER_COLORS.maskulin, "font-weight:700;font-size:9pt;border-top-left-radius:3px;")}">Maskulin</th>
            <th colspan="3" style="${cell(GENDER_COLORS.neutrum, "font-weight:700;font-size:9pt;")}">Neutrum</th>
            <th colspan="3" style="${cell(GENDER_COLORS.feminin, "font-weight:700;font-size:9pt;")}">Feminin</th>
            <th colspan="3" style="${cell(GENDER_COLORS.plural, "font-weight:700;font-size:9pt;"+ (showLastColumn ? '' : 'border-top-right-radius:3px;'))}">Plural</th>
            ${showLastColumn ? `<th style="${cell(NOTES_BG, "font-weight:700;font-size:9pt;border-top-right-radius:3px;")}">${lastColHeader}</th>` : ''}
          </tr>
          <tr>
            ${["Artikel","Adjektiv","Nomen","Artikel","Adjektiv","Nomen","Artikel","Adjektiv","Nomen","Artikel","Adjektiv","Nomen"].map((h, i) => {
              const genderIdx = Math.floor(i / 3);
              const genders = ["maskulin", "neutrum", "feminin", "plural"] as const;
              const bg = GENDER_COLORS[genders[genderIdx]];
              return `<th style="${cell(bg, "font-weight:600;font-size:7pt;")}">${h}</th>`;
            }).join('')}
            ${showLastColumn ? `<th style="${cell(NOTES_BG)}"></th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

/**
 * Build HTML for a verb conjugation table
 */
function renderConjugationTable(
  tableData: VerbConjugationTable,
  settings: GrammarTableSettings,
): string {
  const tenses: VerbTense[] = ["praesens", "perfekt", "praeteritum"];
  const hasSeparablePrefix = tableData.isSeparable && !!tableData.separablePrefix;
  const isReflexive = tableData.isReflexive || false;
  
  // Get static rows split by section
  const singularRows = CONJUGATION_ROWS.filter(r => r.section === "singular");
  const pluralRows = CONJUGATION_ROWS.filter(r => r.section === "plural");
  
  // Calculate columns per tense:
  // - Perfekt: 2 columns (aux | partizip) or 3 if reflexive (aux | reflexive | partizip)
  // - Präsens/Präteritum:
  //   - 1 column if not separable and not reflexive (main)
  //   - 2 columns if separable XOR reflexive (main | prefix) or (main | reflexive)
  //   - 3 columns if separable AND reflexive (main | reflexive | prefix)
  const getColsForTense = (tense: VerbTense) => {
    if (tense === "perfekt") {
      return isReflexive ? 3 : 2;
    }
    // Präsens/Präteritum
    if (hasSeparablePrefix && isReflexive) return 3;
    if (hasSeparablePrefix || isReflexive) return 2;
    return 1;
  };
  
  const totalTenseCols = tenses.reduce((sum, t) => sum + getColsForTense(t), 0);
  const totalCols = 3 + totalTenseCols; // 3 base + tense cols
  
  // Column widths - each tense gets equal share of remaining space
  const col1Width = "6.5%"; // Person
  const col2Width = "6.5%"; // Formality
  const col3Width = "9.5%"; // Pronoun
  const remainingWidth = 77.5; // 100% - 22.5% for base cols
  const tenseWidth = remainingWidth / tenses.length; // Equal width per tense
  
  // Get column widths as array for a tense
  // For 3 columns: Präsens/Präteritum = 50%/25%/25%, Perfekt = 25%/25%/50%
  // For 2 columns: 50%/50%
  // For 1 column: 100%
  const getColWidths = (tense: VerbTense): string[] => {
    const cols = getColsForTense(tense);
    if (cols === 3) {
      if (tense === "perfekt") {
        // aux | reflexive | partizip = 25%/25%/50%
        return [
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.50}%`,
        ];
      } else {
        // main | reflexive | prefix = 50%/25%/25%
        return [
          `${tenseWidth * 0.50}%`,
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.25}%`,
        ];
      }
    } else if (cols === 2) {
      return [
        `${tenseWidth * 0.50}%`,
        `${tenseWidth * 0.50}%`,
      ];
    } else {
      return [`${tenseWidth}%`];
    }
  };
  
  // Tense colors - very light earth tones
  const tenseColors = {
    praesens: "#F2E2D4",   // Peach
    perfekt: "#D8E6F2",    // Sky
    praeteritum: "#DAF0DC", // Mint
  };
  
  // Shared cell builder (gap-based, no borders)
  const cell = (bg: string, extra = "") =>
    `background-color:${bg};padding:3pt 6pt;text-align:left;font-size:9pt;${extra}`;
  const baseBg = NOTES_BG; // #f2f2f2 for person/formality/pronoun cells
  
  // Helper function to render a data row using static definition and AI conjugations
  const renderDataRow = (rowDef: StaticRowDef, isLastRow = false) => {
    let rowHtml = `<tr>`;
    const personDisplay = `${rowDef.person}. Person`;
    const blr = isLastRow ? "border-bottom-left-radius:3px;" : "";
    
    // Static labels
    rowHtml += `<td style="${cell(baseBg, "font-size:7pt;" + blr)}">${escapeHtml(personDisplay)}</td>`;
    rowHtml += `<td style="${cell(baseBg, "font-size:7pt;color:#666;")}">${escapeHtml(rowDef.formality || "")}</td>`;
    rowHtml += `<td style="${cell(baseBg, "font-weight:600;")}">${escapeHtml(rowDef.pronoun)}</td>`;
    
    // Get conjugations for this person from AI data
    const conjugations = tableData.conjugations?.[rowDef.personKey];
    
    tenses.forEach((tense) => {
      const tenseData = conjugations?.[tense];
      const isLastTense = isLastRow && tense === "praeteritum";
      
      if (tense === "perfekt") {
        const aux = tenseData?.auxiliary || "";
        const refl = tenseData?.reflexive || "";
        const part = tenseData?.partizip || "";
        
        if (isReflexive) {
          rowHtml += `<td style="${cell(tenseColors.perfekt)}">${escapeHtml(aux)}</td>`;
          rowHtml += `<td style="${cell(tenseColors.perfekt)}">${escapeHtml(refl)}</td>`;
          rowHtml += `<td style="${cell(tenseColors.perfekt)}">${escapeHtml(part)}</td>`;
        } else {
          rowHtml += `<td style="${cell(tenseColors.perfekt)}">${escapeHtml(aux)}</td>`;
          rowHtml += `<td style="${cell(tenseColors.perfekt)}">${escapeHtml(part)}</td>`;
        }
      } else {
        const main = tenseData?.main || "";
        const refl = tenseData?.reflexive || "";
        const prefix = tenseData?.prefix || "";
        const bgColor = tense === "praesens" ? tenseColors.praesens : tenseColors.praeteritum;
        
        if (hasSeparablePrefix && isReflexive) {
          rowHtml += `<td style="${cell(bgColor)}">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="${cell(bgColor)}">${escapeHtml(refl)}</td>`;
          rowHtml += `<td style="${cell(bgColor, isLastTense ? 'border-bottom-right-radius:3px;' : '')}">${escapeHtml(prefix)}</td>`;
        } else if (hasSeparablePrefix) {
          rowHtml += `<td style="${cell(bgColor)}">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="${cell(bgColor, isLastTense ? 'border-bottom-right-radius:3px;' : '')}">${escapeHtml(prefix)}</td>`;
        } else if (isReflexive) {
          rowHtml += `<td style="${cell(bgColor)}">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="${cell(bgColor, isLastTense ? 'border-bottom-right-radius:3px;' : '')}">${escapeHtml(refl)}</td>`;
        } else {
          rowHtml += `<td style="${cell(bgColor, isLastTense ? 'border-bottom-right-radius:3px;' : '')}">${escapeHtml(main)}</td>`;
        }
      }
    });
    
    rowHtml += `</tr>`;
    return rowHtml;
  };
  
  // Build rows with section headers
  let rows = "";
  
  // Singular section header
  rows += `<tr>
    <td colspan="${totalCols}" style="${cell(baseBg, "font-size:7pt;font-weight:700;")}">SINGULAR</td>
  </tr>`;
  
  singularRows.forEach((rowDef) => {
    rows += renderDataRow(rowDef);
  });
  
  // Plural section header
  rows += `<tr>
    <td colspan="${totalCols}" style="${cell(baseBg, "font-size:7pt;font-weight:700;")}">PLURAL</td>
  </tr>`;
  
  pluralRows.forEach((rowDef, idx) => {
    rows += renderDataRow(rowDef, idx === pluralRows.length - 1);
  });

  // Build colgroup
  let colgroupHtml = `
    <col style="width:${col1Width}">
    <col style="width:${col2Width}">
    <col style="width:${col3Width}">
  `;
  for (const tense of tenses) {
    const widths = getColWidths(tense);
    for (const width of widths) {
      colgroupHtml += `<col style="width:${width}">`;
    }
  }

  // Build header row - merge first 3 columns
  let headerHtml = `
    <th colspan="3" style="${cell(baseBg, "border-top-left-radius:3px;")}"></th>
  `;
  
  tenses.forEach((tense, idx) => {
    const colspan = getColsForTense(tense);
    const isLast = idx === tenses.length - 1;
    const extra = "font-weight:700;" + (isLast ? "border-top-right-radius:3px;" : "");
    headerHtml += `<th colspan="${colspan}" style="${cell(tenseColors[tense], extra)}">${TENSE_LABELS[tense].de}</th>`;
  });

  // Verb title
  const verbStr = tableData.input.verb;
  let verbInfo = `<div style="font-size:11pt;font-weight:700;margin-bottom:2mm;text-align:left;">${escapeHtml(verbStr)}</div>`;

  return `
    <div class="verb-table">
      ${verbInfo}
      <div style="background-color:#ffffff;">
      <table style="border-collapse:separate;border-spacing:${CELL_GAP}pt;width:100%;table-layout:fixed;border-radius:4px;overflow:hidden;">
        <colgroup>
          ${colgroupHtml}
        </colgroup>
        <thead>
          <tr>
            ${headerHtml}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

/**
 * Build content pages HTML for declination tables (Adjektivdeklination)
 * Structured like buildConjugationContentHtml — no internal page wrappers;
 * Puppeteer handles margins, headers and footers.
 */
function buildDeclinationContentHtml(
  tableData: AdjectiveDeclinationTable,
  settings: GrammarTableSettings,
  brandSettings: BrandSettings,
  brand: Brand,
): string {
  const brandFonts = BRAND_FONTS[brand];
  const footerText = brand !== "lingostar" ? replaceVariables(brandSettings.footerLeft || "", brandSettings) : "";

  // Page 1: Nominativ + Akkusativ
  const page1Cases = tableData.cases.filter(c => ["nominativ", "akkusativ"].includes(c.case));
  let page1Html = "";
  for (const cs of page1Cases) {
    page1Html += renderCaseTable(cs, settings);
  }

  // Page 2: Dativ + Genitiv
  const page2Cases = tableData.cases.filter(c => ["dativ", "genitiv"].includes(c.case));
  let page2Html = "";
  for (const cs of page2Cases) {
    page2Html += renderCaseTable(cs, settings);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${brandFonts.googleFontsUrl}" rel="stylesheet">
<style>
  @page {
    size: A4 landscape;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: ${brandFonts.bodyFont};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .case-page {
    page-break-inside: avoid;
  }
  .case-page + .case-page {
    page-break-before: always;
  }
  .footer {
    margin-top: 6mm;
    font-size: 8pt;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 2mm;
  }
</style>
</head>
<body>
<div class="case-page">
${page1Html}
</div>
<div class="case-page">
${page2Html}
</div>
${footerText ? `<div class="footer">${footerText}</div>` : ''}
</body>
</html>`;
}

/**
 * Build title page HTML for grammar table PDFs (Verbkonjugation & Adjektivdeklination)
 */
function buildTitlePageHtml(
  title: string,
  subtitle: string,
  brand: Brand,
  bigLogoDataUri: string
): string {
  const brandFonts = BRAND_FONTS[brand];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${brandFonts.googleFontsUrl}" rel="stylesheet">
<style>
  @page {
    size: A4 landscape;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: ${brandFonts.bodyFont};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .title-page {
    position: relative;
    height: 100vh;
  }
  .title-page .big-logo {
    position: absolute;
    top: 0;
    right: 0;
    width: 40mm;
    height: auto;
  }
  .title-page .text-content {
    position: absolute;
    bottom: 50%;
    left: 0;
  }
  .title-page .subtitle {
    font-family: 'Encode Sans', sans-serif;
    font-size: 11pt;
    font-weight: 600;
    text-transform: uppercase;
    color: #000;
    margin-bottom: 4mm;
  }
  .title-page .main-title {
    font-family: 'Merriweather', serif;
    font-size: 28pt;
    font-weight: 400;
    color: #222;
  }
</style>
</head>
<body>
<div class="title-page">
  ${bigLogoDataUri ? `<img src="${bigLogoDataUri}" class="big-logo" />` : ''}
  <div class="text-content">
    <div class="subtitle">${escapeHtml(subtitle)}</div>
    <div class="main-title">${escapeHtml(title)}</div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Build content pages HTML for conjugation tables (multiple verbs)
 */
function buildConjugationContentHtml(
  tables: VerbConjugationTable[],
  settings: GrammarTableSettings,
  brandSettings: BrandSettings,
  brand: Brand,
): string {
  const brandFonts = BRAND_FONTS[brand];
  
  const footerText = brand !== "lingostar" ? replaceVariables(brandSettings.footerLeft || "", brandSettings) : "";
  
  // Render all tables
  const tablesHtml = tables.map(tableData => renderConjugationTable(tableData, settings)).join('\n');
  
  console.log(`[Grammar Table PDF] Rendering ${tables.length} verb conjugation tables`);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${brandFonts.googleFontsUrl}" rel="stylesheet">
<style>
  @page {
    size: A4 landscape;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: ${brandFonts.bodyFont};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .verb-table {
    margin-bottom: 5mm;
    page-break-inside: avoid;
  }
  .footer {
    margin-top: 6mm;
    font-size: 8pt;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 2mm;
  }
</style>
</head>
<body>
${tablesHtml}
${footerText ? `<div class="footer">${footerText}</div>` : ''}
</body>
</html>`;
}

// POST /api/worksheets/[id]/grammar-table-pdf
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId } as Parameters<typeof prisma.worksheet.findFirst>[0] extends { where?: infer W } ? W : never,
  });
  if (!worksheet || worksheet.type !== "grammar-table") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // blocks is stored as { tableType, input, tableData }
  const blocksData = worksheet.blocks as unknown as { 
    tableType?: GrammarTableType; 
    input?: unknown; 
    tableData?: AdjectiveDeclinationTable | VerbConjugationTable[];
  } | null;
  
  const tableType = blocksData?.tableType || "adjective-declination";
  const tableData = blocksData?.tableData ?? null;
  const settings = (worksheet.settings ?? {}) as unknown as GrammarTableSettings;
  
  // Validate based on table type
  if (!tableData) {
    return NextResponse.json({ error: "No table data to export" }, { status: 400 });
  }
  
  if (tableType === "verb-conjugation") {
    const conjData = tableData as VerbConjugationTable[];
    if (!Array.isArray(conjData) || conjData.length === 0) {
      return NextResponse.json({ error: "No conjugation data to export" }, { status: 400 });
    }
  } else {
    const declData = tableData as AdjectiveDeclinationTable;
    if (!declData.cases || declData.cases.length === 0) {
      return NextResponse.json({ error: "No declination data to export" }, { status: 400 });
    }
  }

  // Build brand settings with defaults
  const brand = settings.brand || "edoomio";
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...settings.brandSettings,
  };

  // Read logo as data URI so Puppeteer can render it without network
  let logoDataUri = "";
  if (brandSettings.logo) {
    try {
      const logoPath = path.join(process.cwd(), "public", brandSettings.logo.replace(/^\//, ""));
      const logoRaw = fs.readFileSync(logoPath, "utf-8");
      const isSvg = brandSettings.logo.endsWith(".svg");
      logoDataUri = isSvg
        ? `data:image/svg+xml,${encodeURIComponent(logoRaw)}`
        : `data:image/png;base64,${Buffer.from(logoRaw).toString("base64")}`;
    } catch {
      console.warn(`[Grammar Table PDF] Could not read logo file: ${brandSettings.logo}`);
    }
  }

  // Read big logo for title page (lingostar_logo_and_brand_flat.svg)
  let bigLogoDataUri = "";
  try {
    const bigLogoPath = path.join(process.cwd(), "public", "logo", "lingostar_logo_and_brand_flat.svg");
    const bigLogoRaw = fs.readFileSync(bigLogoPath, "utf-8");
    bigLogoDataUri = `data:image/svg+xml,${encodeURIComponent(bigLogoRaw)}`;
  } catch {
    console.warn(`[Grammar Table PDF] Could not read big logo file`);
  }

  // Build HTML based on table type
  const isConjugation = tableType === "verb-conjugation";
  let html: string;
  let titlePageHtml: string | null = null;

  if (isConjugation) {
    const conjTables = tableData as VerbConjugationTable[];
    console.log(`[Grammar Table PDF] Building HTML for ${conjTables.length} verb tables`);
    titlePageHtml = buildTitlePageHtml(worksheet.title, "Verbkonjugation", brand, bigLogoDataUri);
    html = buildConjugationContentHtml(conjTables, settings, brandSettings, brand);
  } else {
    titlePageHtml = buildTitlePageHtml(worksheet.title, "Adjektivdeklination", brand, bigLogoDataUri);
    html = buildDeclinationContentHtml(
      tableData as AdjectiveDeclinationTable,
      settings,
      brandSettings,
      brand,
    );
  }

  try {
    console.log(`[Grammar Table PDF] Generating ${tableType} PDF for "${worksheet.title}"`);
    
    // Debug: Write HTML to temp file for inspection
    const debugHtmlPath = path.join(process.cwd(), "debug-grammar-table.html");
    fs.writeFileSync(debugHtmlPath, html, "utf-8");
    console.log(`[Grammar Table PDF] Debug HTML written to: ${debugHtmlPath}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const isLingostar = brand === "lingostar";
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDate = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

    // Header template with logo (appears on content pages)
    const logoHeaderTemplate = logoDataUri 
      ? `<div style="width: 100%; display: flex; justify-content: flex-end; padding: 0 15mm; margin-top: 10mm;">
          <img src="${logoDataUri}" style="width: 6mm; height: auto;" />
        </div>`
      : '<div></div>';

    const lingostarFooterTemplate = `
      <div style="width: 100%; font-size: 7pt; font-family: 'Encode Sans', sans-serif; color: #666; padding: 0 15mm; margin-bottom: 5mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: left; line-height: 1.4;">
          © ${currentYear} lingostar | Marcel Allenspach<br/>
          Alle Rechte vorbehalten
        </div>
        <div style="text-align: center;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
        <div style="text-align: right; line-height: 1.4;">
          ${worksheet.id}<br/>
          ${currentDate}
        </div>
      </div>
    `;

    let finalPdfBytes: Uint8Array;

    // Both table types now use title page + content pages merged via pdf-lib
    {
      // Generate title page PDF (no header/footer)
      const titlePage = await browser.newPage();
      await titlePage.setViewport({ width: 1123, height: 10000 });
      await titlePage.setContent(titlePageHtml!, { waitUntil: "networkidle0", timeout: 30000 });
      await titlePage.evaluateHandle("document.fonts.ready");
      await new Promise((r) => setTimeout(r, 300));

      const titlePdfBuffer = await titlePage.pdf({
        format: "A4",
        landscape: true,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
        printBackground: true,
        displayHeaderFooter: false,
      });
      await titlePage.close();

      // Generate content pages PDF (with header icon + footer)
      const contentPage = await browser.newPage();
      await contentPage.setViewport({ width: 1123, height: 10000 });
      await contentPage.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await contentPage.evaluateHandle("document.fonts.ready");
      await new Promise((r) => setTimeout(r, 300));

      const contentPdfBuffer = await contentPage.pdf({
        format: "A4",
        landscape: true,
        margin: {
          top: "22.5mm",
          bottom: isLingostar ? "18mm" : "10mm",
          left: "15mm",
          right: "15mm",
        },
        printBackground: true,
        displayHeaderFooter: isLingostar || !!logoDataUri,
        footerTemplate: isLingostar ? lingostarFooterTemplate : '<div></div>',
        headerTemplate: logoHeaderTemplate,
      });
      await contentPage.close();

      // Merge title page + content pages using pdf-lib
      const mergedPdf = await PDFDocument.create();
      const titleDoc = await PDFDocument.load(titlePdfBuffer);
      const contentDoc = await PDFDocument.load(contentPdfBuffer);

      const titlePages = await mergedPdf.copyPages(titleDoc, titleDoc.getPageIndices());
      for (const p of titlePages) mergedPdf.addPage(p);

      const contentPages = await mergedPdf.copyPages(contentDoc, contentDoc.getPageIndices());
      for (const p of contentPages) mergedPdf.addPage(p);

      finalPdfBytes = await mergedPdf.save();
    }

    await browser.close();

    console.log(`[Grammar Table PDF] Generated ${finalPdfBytes.length} bytes`);

    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Grammar Table PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
