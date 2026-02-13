import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
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

// ─── Layout constants (mm) ──────────────────────────────────
const PAGE_W = 297; // A4 landscape
const PAGE_H = 210;
const MARGIN = 10; // mm

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

/**
 * Build HTML for a single case table
 */
function renderCaseTable(
  caseSection: CaseSection,
  settings: GrammarTableSettings,
): string {
  if (!caseSection.groups || caseSection.groups.length === 0) {
    return "";
  }

  // Determine if this case has prepositions (akkusativ/dativ)
  const hasPreps = (caseSection.case === "akkusativ" || caseSection.case === "dativ") && settings.showPrepositions;
  // Determine if this case has notes (nominativ/genitiv)
  const hasNotes = (caseSection.case === "nominativ" || caseSection.case === "genitiv") && settings.showNotes;
  const showLastColumn = hasPreps || hasNotes;

  // Column background colors for each gender
  const genderColors = {
    maskulin: "#e3f2fd",    // light blue
    neutrum: "#fff3e0",     // light orange
    feminin: "#fce4ec",     // light pink
    plural: "#e8f5e9",      // light green
  };

  // Calculate total rows for this case
  let totalRows = 0;
  for (const group of caseSection.groups) {
    totalRows += group.articleRows?.length ?? 1;
  }

  let rows = "";
  let globalRowIndex = 0;

  // Count groups for tracking last group
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
      const isLastRowInGroup = rowIdx === rowCount - 1;

      // Get the adj/noun for each gender
      const getCell = (gender: "maskulin" | "neutrum" | "feminin") => {
        const shared = group.shared?.[gender] || { adjective: "", noun: "" };
        return {
          article: row?.[gender] || "",
          adjective: shared.adjective,
          noun: shared.noun,
        };
      };

      const pluralCell = {
        article: row?.plural || "",
        adjective: row?.pluralOverride?.adjective || group.shared?.plural?.adjective || "",
        noun: row?.pluralOverride?.noun || group.shared?.plural?.noun || "",
      };

      rows += `<tr>`;

      // Render article cells for each gender with column-based colors
      (["maskulin", "neutrum", "feminin"] as const).forEach((gender, gIdx) => {
        const cell = getCell(gender);
        const bg = genderColors[gender];
        // Bottom-left corner for maskulin article on last row
        const cornerBL = (isLastRow && gIdx === 0) ? "border-bottom-left-radius:4px;" : "";
        rows += `<td style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${bg};${cornerBL}">${escapeHtml(cell.article)}</td>`;
        
        if (isFirstRowInGroup) {
          rows += `<td rowspan="${rowCount}" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${bg};">${escapeHtml(cell.adjective)}</td>`;
          rows += `<td rowspan="${rowCount}" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${bg};">${escapeHtml(cell.noun)}</td>`;
        }
      });

      // Plural with column color
      const pluralBg = genderColors.plural;
      // Bottom-right corner for plural noun on last row (if no last column)
      const cornerBRPlural = (isLastRow && !showLastColumn) ? "border-bottom-right-radius:4px;" : "";
      rows += `<td style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${pluralBg};">${escapeHtml(pluralCell.article)}</td>`;
      if (isFirstRowInGroup) {
        rows += `<td rowspan="${rowCount}" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${pluralBg};">${escapeHtml(pluralCell.adjective)}</td>`;
        // Last noun cell gets corner radius if it's the last group and no last column
        const nounCorner = (isLastGroup && !showLastColumn) ? "border-bottom-right-radius:4px;" : "";
        rows += `<td rowspan="${rowCount}" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;background-color:${pluralBg};${nounCorner}">${escapeHtml(pluralCell.noun)}</td>`;
      }

      // Prepositions column (akkusativ/dativ) - with bottom-right corner
      if (showLastColumn && isGlobalFirstRow && hasPreps) {
        rows += `<td colspan="3" rowspan="${totalRows}" style="border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:8pt;vertical-align:top;background-color:#f5f5f5;border-bottom-right-radius:4px;">`;
        if (caseSection.prepositionHeading) {
          rows += `<div style="font-weight:bold;margin-bottom:4px;">${escapeHtml(caseSection.prepositionHeading)}</div>`;
        }
        if (caseSection.prepositions) {
          for (const p of caseSection.prepositions) {
            rows += `<div style="margin-bottom:2px;">${escapeHtml(p)}</div>`;
          }
        }
        rows += `</td>`;
      }

      // Notes column (nominativ/genitiv) - with bottom-right corner if last group
      if (showLastColumn && !hasPreps && isFirstRowInGroup) {
        const noteCorner = isLastGroup ? "border-bottom-right-radius:4px;" : "";
        rows += `<td colspan="3" rowspan="${rowCount}" style="border:1px solid #ccc;padding:4px 6px;font-size:8pt;vertical-align:top;text-align:left;background-color:#f9f9f9;${noteCorner}">${escapeHtml(group.note || "")}</td>`;
      }

      rows += `</tr>`;
      globalRowIndex++;
    }
    groupIdx++;
  }

  // Column headers - 15 column grid (12 data + 3 for notes/preps)
  const headers = ["Artikel", "Adjektiv", "Nomen", "Artikel", "Adjektiv", "Nomen", "Artikel", "Adjektiv", "Nomen", "Artikel", "Adjektiv", "Nomen"];
  const lastColHeader = hasPreps ? "Präpositionen" : hasNotes ? "Anmerkungen" : "";

  // 15-col grid: each gender gets 3 cols = 12 cols, last column gets 3 cols = 15 total
  // Each col = ~6.67% of width. 3 cols = 20%
  const colWidth = "6.67%";

  // Border radius for top corners
  const radiusTL = "border-top-left-radius:4px;";
  const radiusTR = "border-top-right-radius:4px;";

  return `
    <div style="margin-bottom:15mm;">
      <div style="font-size:12pt;font-weight:bold;margin-bottom:4mm;color:#333;text-align:left;">${CASE_LABELS[caseSection.case].de}</div>
      <div style="border-radius:4px;overflow:hidden;border:1px solid #ccc;">
      <table style="border-collapse:collapse;width:calc(100% + 2px);table-layout:fixed;margin:-1px;">
        <colgroup>
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          <col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">
          ${showLastColumn ? `<col style="width:${colWidth}"><col style="width:${colWidth}"><col style="width:${colWidth}">` : ''}
        </colgroup>
        <thead>
          <tr>
            <th colspan="3" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:${genderColors.maskulin};${radiusTL}">Maskulin</th>
            <th colspan="3" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:${genderColors.neutrum};">Neutrum</th>
            <th colspan="3" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:${genderColors.feminin};">Feminin</th>
            <th colspan="3" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:${genderColors.plural};${showLastColumn ? '' : radiusTR}">Plural</th>
            ${showLastColumn ? `<th colspan="3" style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:#f5f5f5;vertical-align:top;${radiusTR}">${lastColHeader}</th>` : ''}
          </tr>
          <tr>
            ${headers.map((h, i) => {
              const genderIdx = Math.floor(i / 3);
              const genders = ["maskulin", "neutrum", "feminin", "plural"] as const;
              const bg = genderColors[genders[genderIdx]];
              return `<th style="border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:8pt;font-weight:bold;background-color:${bg};">${h}</th>`;
            }).join('')}
            ${showLastColumn ? '<th colspan="3" style="border:1px solid #ccc;padding:4px 6px;background-color:#f5f5f5;"></th>' : ''}
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
    praesens: "#f8f4ef",   // light warm sand
    perfekt: "#f4f6f3",    // light sage
    praeteritum: "#faf4e8", // light honey
  };
  
  // Helper function to render a data row using static definition and AI conjugations
  const renderDataRow = (rowDef: StaticRowDef, isLastRow: boolean) => {
    let rowHtml = `<tr>`;
    const personDisplay = `${rowDef.person}. Person`;
    const blCorner = isLastRow ? "border-bottom-left-radius:4px;" : "";
    
    // Static labels
    rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:7pt;${blCorner}">${escapeHtml(personDisplay)}</td>`;
    rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:7pt;color:#666;">${escapeHtml(rowDef.formality || "")}</td>`;
    rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;font-weight:500;">${escapeHtml(rowDef.pronoun)}</td>`;
    
    // Get conjugations for this person from AI data
    const conjugations = tableData.conjugations?.[rowDef.personKey];
    
    tenses.forEach((tense, tenseIdx) => {
      const tenseData = conjugations?.[tense];
      const isLastTense = tenseIdx === tenses.length - 1;
      const brCorner = isLastRow && isLastTense ? "border-bottom-right-radius:4px;" : "";
      const thickLeft = "border-left:2px solid #999;";
      
      if (tense === "perfekt") {
        // Perfekt: aux | partizip OR aux | reflexive | partizip
        const aux = tenseData?.auxiliary || "";
        const refl = tenseData?.reflexive || "";
        const part = tenseData?.partizip || "";
        
        if (isReflexive) {
          // 3 columns: aux | reflexive | partizip
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${tenseColors.perfekt};">${escapeHtml(aux)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${tenseColors.perfekt};">${escapeHtml(refl)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${tenseColors.perfekt};${brCorner}">${escapeHtml(part)}</td>`;
        } else {
          // 2 columns: aux | partizip
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${tenseColors.perfekt};">${escapeHtml(aux)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${tenseColors.perfekt};${brCorner}">${escapeHtml(part)}</td>`;
        }
      } else {
        // Präsens or Präteritum
        const main = tenseData?.main || "";
        const refl = tenseData?.reflexive || "";
        const prefix = tenseData?.prefix || "";
        const bgColor = tense === "praesens" ? tenseColors.praesens : tenseColors.praeteritum;
        
        if (hasSeparablePrefix && isReflexive) {
          // 3 columns: main | reflexive | prefix
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};">${escapeHtml(refl)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};${brCorner}">${escapeHtml(prefix)}</td>`;
        } else if (hasSeparablePrefix) {
          // 2 columns: main | prefix
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};${brCorner}">${escapeHtml(prefix)}</td>`;
        } else if (isReflexive) {
          // 2 columns: main | reflexive
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};">${escapeHtml(main)}</td>`;
          rowHtml += `<td style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};${brCorner}">${escapeHtml(refl)}</td>`;
        } else {
          // 1 column: main only
          rowHtml += `<td style="border:1px solid #ccc;${thickLeft}padding:3px 6px;text-align:left;font-size:9pt;background-color:${bgColor};${brCorner}">${escapeHtml(main)}</td>`;
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
    <td colspan="${totalCols}" style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:7pt;font-weight:bold;">SINGULAR</td>
  </tr>`;
  
  singularRows.forEach((rowDef) => {
    rows += renderDataRow(rowDef, false);
  });
  
  // Plural section header
  rows += `<tr>
    <td colspan="${totalCols}" style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:7pt;font-weight:bold;">PLURAL</td>
  </tr>`;
  
  pluralRows.forEach((rowDef, idx) => {
    const isLastRow = idx === pluralRows.length - 1;
    rows += renderDataRow(rowDef, isLastRow);
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
    <th colspan="3" style="border:1px solid #ccc;padding:3px 6px;text-align:left;font-size:9pt;font-weight:bold;border-top-left-radius:4px;"></th>
  `;
  
  tenses.forEach((tense, idx) => {
    const isLast = idx === tenses.length - 1;
    const cornerStyle = isLast ? "border-top-right-radius:4px;" : "";
    const colspan = getColsForTense(tense);
    headerHtml += `<th colspan="${colspan}" style="border:1px solid #ccc;border-left:2px solid #999;padding:3px 6px;text-align:left;font-size:9pt;font-weight:bold;background-color:${tenseColors[tense]};${cornerStyle}">${TENSE_LABELS[tense].de}</th>`;
  });

  // Verb title with info
  const verbStr = tableData.input.verb;
  let verbInfo = `<div style="font-size:11pt;font-weight:bold;margin-bottom:2mm;text-align:left;">${escapeHtml(verbStr)}</div>`;

  return `
    <div class="verb-table">
      ${verbInfo}
      <div style="border-radius:4px;overflow:hidden;border:1px solid #ccc;">
      <table style="border-collapse:collapse;width:calc(100% + 2px);table-layout:fixed;margin:-1px;">
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

function buildPageHtml(
  tableData: AdjectiveDeclinationTable,
  settings: GrammarTableSettings,
  pageIndex: number, // 0 = Nominativ+Akkusativ, 1 = Dativ+Genitiv
  title: string,
  brandSettings: BrandSettings,
  brandFonts: { headlineFont: string; bodyFont: string; googleFontsUrl: string },
  logoDataUri: string
): string {
  // Page 1: Nominativ + Akkusativ, Page 2: Dativ + Genitiv
  const casesForPage: GrammatikalFall[] = pageIndex === 0 
    ? ["nominativ", "akkusativ"] 
    : ["dativ", "genitiv"];

  const caseSectionsForPage = tableData.cases.filter(c => casesForPage.includes(c.case));

  let tablesHtml = "";
  for (const caseSection of caseSectionsForPage) {
    tablesHtml += renderCaseTable(caseSection, settings);
  }

  // Header with logo and title
  const headerText = replaceVariables(brandSettings.headerRight || "", brandSettings);
  const footerText = replaceVariables(brandSettings.footerLeft || "", brandSettings);

  return `
    <div class="page">
      <div class="header">
        <div class="title">${escapeHtml(title)}</div>
        ${logoDataUri ? `<img src="${logoDataUri}" class="logo" />` : ''}
      </div>
      <div class="content">
        ${tablesHtml}
      </div>
      ${footerText ? `<div class="footer">${footerText}</div>` : ''}
    </div>
  `;
}

function buildFullHtml(
  tableData: AdjectiveDeclinationTable,
  settings: GrammarTableSettings,
  title: string,
  brandSettings: BrandSettings,
  brand: Brand,
  logoDataUri: string
): string {
  const brandFonts = BRAND_FONTS[brand];

  const page1 = buildPageHtml(tableData, settings, 0, title, brandSettings, brandFonts, logoDataUri);
  const page2 = buildPageHtml(tableData, settings, 1, title, brandSettings, brandFonts, logoDataUri);

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
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${PAGE_W}mm;
    margin: 0;
    padding: 0;
    font-family: ${brandFonts.bodyFont};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: ${PAGE_W}mm;
    height: ${PAGE_H}mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    padding: ${MARGIN}mm;
  }
  .page:last-child {
    page-break-after: auto;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 5mm;
  }
  .logo {
    width: 6mm;
    height: auto;
  }
  .title {
    font-family: ${brandFonts.headlineFont};
    font-size: 14pt;
    font-weight: normal;
  }
  .header-text {
    font-size: 9pt;
    color: #666;
  }
  .content {
    flex: 1;
  }
  .footer {
    position: absolute;
    bottom: ${MARGIN}mm;
    left: ${MARGIN}mm;
    right: ${MARGIN}mm;
    font-size: 8pt;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 2mm;
  }
  table {
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ccc;
  }
</style>
</head>
<body>
${page1}
${page2}
</body>
</html>`;
}

/**
 * Build full HTML for conjugation tables (multiple verbs on single page)
 */
function buildConjugationFullHtml(
  tables: VerbConjugationTable[],
  settings: GrammarTableSettings,
  title: string,
  brandSettings: BrandSettings,
  brand: Brand,
  logoDataUri: string
): string {
  const brandFonts = BRAND_FONTS[brand];
  
  const headerText = replaceVariables(brandSettings.headerRight || "", brandSettings);
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
  .document-title {
    font-family: ${brandFonts.headlineFont};
    font-size: 14pt;
    font-weight: normal;
    margin-bottom: 5mm;
  }
  .footer {
    margin-top: 6mm;
    font-size: 8pt;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 2mm;
  }
  table {
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ccc;
  }
</style>
</head>
<body>
<div class="document-title">${escapeHtml(title)}</div>
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

  // Build HTML based on table type
  let html: string;
  if (tableType === "verb-conjugation") {
    const conjTables = tableData as VerbConjugationTable[];
    console.log(`[Grammar Table PDF] Building HTML for ${conjTables.length} verb tables`);
    html = buildConjugationFullHtml(
      conjTables,
      settings,
      worksheet.title,
      brandSettings,
      brand,
      logoDataUri
    );
  } else {
    html = buildFullHtml(
      tableData as AdjectiveDeclinationTable,
      settings,
      worksheet.title,
      brandSettings,
      brand,
      logoDataUri
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

    const page = await browser.newPage();

    // Set viewport width to A4 landscape, height large enough for content to flow
    await page.setViewport({ width: 1123, height: 10000 });

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 300));

    // Debug: Get document height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[Grammar Table PDF] Document body height: ${bodyHeight}px`);

    // Build lingostar footer template
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDate = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    
    const isLingostar = brand === "lingostar";

    // Header template with logo (appears on all pages)
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

    const pdfBuffer = await page.pdf({
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

    await browser.close();

    const finalPdfBytes = new Uint8Array(pdfBuffer);
    const pageCount = tableType === "verb-conjugation" ? 1 : 2;
    console.log(`[Grammar Table PDF] Generated ${finalPdfBytes.length} bytes, ${pageCount} page(s)`);

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
