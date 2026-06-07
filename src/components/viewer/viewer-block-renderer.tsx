"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  WorksheetBlock,
  HeadingBlock,
  NumberedHeadingBlock,
  TextBlock,
  SyllablesBlock,
  ImageBlock,
  ImageCardsBlock,
  ImageTextTableBlock,
  TextCardsBlock,
  SpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  FillInBlankBlock,
  FillInBlankItemsBlock,
  MatchingBlock,
  PronunciationBlock,
  TwoColumnFillBlock,
  GlossaryBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  ColumnsBlock,
  GridBlock,
  DominoBlock,
  CardPairsBlock,
  FlashcardsBlock,
  AufgabenkartenBlock,
  BingoCardsBlock,
  SyllableCardsBlock,
  BoardGameBlock,
  TrueFalseMatrixBlock,
  MCQMatrixBlock,
  MCQRowsBlock,
  ArticleTrainingBlock,
  ArticleAnswer,
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  CrosswordBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  CorrectSpellingBlock,
  CorrectNumbersBlock,
  MissingLettersBlock,
  LetterCodeBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
  StartSentencesBlock,
  ReadingComprehensionBlock,
  TransformSentencesBlock,
  VerbTableBlock,
  ChartBlock,
  NumberedLabelBlock,
  DialogueBlock,
  DialogueSpeakerIcon,
  LueckenzeilenBlock,
  PageBreakBlock,
  WritingLinesBlock,
  WritingRowsBlock,
  TextSnippetBlock,
  EmailSkeletonBlock,
  JobApplicationBlock,
  DosAndDontsBlock,
  TextComparisonBlock,
  NumberedItemsBlock,
  QuartettBlock,
  TabooBlock,
  ChecklistBlock,
  AccordionBlock,
  LogoDividerBlock,
  AiPromptBlock,
  AiToolBlock,
  AudioBlock,
  ScheduleBlock,
  WebsiteBlock,
  TableBlock,
  TableCloudBlock,
  SegmentationBlock,
  BRAND_ICON_LOGOS,
  BRAND_FONTS,
  Brand,
  ViewMode,
} from "@/types/worksheet";
import { ThumbsUp, ThumbsDown, ArrowRight, BadgeAlert, Siren, Goal, Flag, Sparkles, Loader2, Bot, FormInput, Plus, Minus, ChevronsDown, ChevronsUp, Copy, ClipboardCheck, MessageCircle, MessageCircleQuestion, Scissors, FileQuestion, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { prepareTiptapHtml, stripOuterP } from "@/lib/print-html-normalize";
import { normalizeToHtml } from "@/lib/markdown-to-html";
import { doubleInnerRegularSpaces, getBlankSpacing, getBlankWidthStyle, parseBlankContent, tripleInnerRegularSpaces } from "@/lib/fill-in-blank";
import { hideTableHeaderHtml, markFirstExampleRowHtml, renderBlankTokensInHtml, stripTablePixelWidths } from "@/lib/table-html";
import { ToolWorkflowShell } from "@/ai-tools/components/tool-workflow-shell";
import { buildCorrectNumbersRow, buildCorrectSpellingRow, buildMissingLettersRow } from "@/lib/correct-spelling";
import { getCardPairDisplayText, getCardPairItems, getCardPairs, getDominoEditorTextClass, getDominoItems, getDominoPairs, getDominoPrintFontSize, getFlashcardDisplayText, getFlashcardItems, getFlashcardPairs } from "@/lib/domino";
import { RoughExampleCircle, RoughExampleDivider, RoughExampleStrike, RoughRoundedRectHighlights, RoughSvgPaths } from "@/components/ui/rough-example-circle";
import { findWordSearchPlacements } from "@/lib/word-search";
import {
  DialogueSpeakerIconGlyph,
} from "@/lib/dialogue-icons";
import { SyllablesDisplay } from "@/components/worksheet/syllables-display";
import { CrosswordLayout } from "@/components/worksheet/crossword-layout";
import { BingoCardsRenderer } from "@/components/editor/BingoCardsRenderer";
import s from "./viewer-blocks.module.css";

type QuartettCardVariant = {
  id: string;
  title: string;
  highlight: string;
  others: string[];
};

type TabooCardVariant = {
  id: string;
  word: string;
  stopWords: string[];
};

const CUT_LINE_COLOR = "#9ca3af";
const CUT_LINE_SOLID_COLOR = "#111827";
const CUT_LINE_DASHED_BORDER = `1px dashed ${CUT_LINE_COLOR}`;
const CUT_LINE_SOLID_BORDER = `1px solid ${CUT_LINE_SOLID_COLOR}`;
const CUT_ICON_SIZE_MM = 3.5;
const CUT_ICON_HALF_SIZE_MM = CUT_ICON_SIZE_MM / 2;
const CUT_ICON_GAP_MM = 2.5;
const CUT_ICON_STYLE_BASE: React.CSSProperties = {
  position: "absolute",
  width: `${CUT_ICON_SIZE_MM}mm`,
  height: `${CUT_ICON_SIZE_MM}mm`,
  color: CUT_LINE_COLOR,
  strokeWidth: 1.75,
  overflow: "visible",
  zIndex: 4,
  pointerEvents: "none",
};

function applySegmentationCasing(value: string, casing: SegmentationBlock["casing"]) {
  if (casing === "uppercase") return value.toUpperCase();
  if (casing === "lowercase") return value.toLowerCase();
  return value;
}

function getSegmentationWords(value: string, casing: SegmentationBlock["casing"]) {
  return applySegmentationCasing(value || "", casing)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function SegmentationView({
  block,
  showSolutions = false,
  mode = "online",
  accentColor,
  instructionIndex,
}: {
  block: SegmentationBlock;
  showSolutions?: boolean;
  mode?: ViewMode;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const exampleItemIndex = block.showFirstAsExample === false
    ? -1
    : block.items.findIndex((item) => getSegmentationWords(item.text, block.casing).length > 1);

  return (
    <div>
      {block.instruction && (
        <>
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          {block.items.length > 0 && <SectionGap size="small" />}
        </>
      )}
      {block.items.map((item, index) => {
        const words = getSegmentationWords(item.text, block.casing);
        const showExample = index === exampleItemIndex && words.length > 1;

        return (
          <div
            key={item.id}
            className="flex items-center border-b"
            style={{ gap: 12, paddingTop: 6, paddingBottom: 6, height: 32, boxSizing: "border-box", overflow: "hidden" }}
          >
            <ItemNumberBadge index={index + 1} className="shrink-0" />
            <span className="flex-1 whitespace-nowrap" style={{ letterSpacing: "0.18em" }}>
              {words.map((word, wordIndex) => (
                <span key={`${item.id}-${wordIndex}`} className="relative">
                  {word}
                  {wordIndex < words.length - 1 ? (
                    showExample && wordIndex === 0 ? (
                      <RoughExampleDivider stroke="#0097dc" />
                    ) : showSolutions ? (
                      <RoughExampleDivider stroke="#15803d" />
                    ) : null
                  ) : null}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildQuartettCardVariants(items: QuartettBlock["items"]): QuartettCardVariant[] {
  return items.flatMap((item) =>
    item.subitems.map((subitem, highlightIndex) => ({
      id: `${item.id}-${subitem.id}`,
      title: item.title?.trim() || "",
      highlight: subitem.content,
      others: item.subitems
        .filter((_, index) => index !== highlightIndex)
        .map((entry) => entry.content)
        .filter((entry) => entry.trim().length > 0),
    }))
  );
}

function buildTabooCardVariants(items: TabooBlock["items"]): TabooCardVariant[] {
  return items.map((item) => ({
    id: item.id,
    word: item.title?.trim() || "",
    stopWords: item.subitems
      .map((entry) => entry.content)
      .filter((entry) => entry.trim().length > 0),
  }));
}

function QuartettCardContent({
  card,
  logoSrc,
  titleColor,
  titleFont,
  showGroupTitle,
  showFooter,
}: {
  card: QuartettCardVariant;
  logoSrc?: string;
  titleColor: string;
  titleFont?: string;
  showGroupTitle: boolean;
  showFooter: boolean;
}) {
  const promptLines = [
    { id: "question", icon: FileQuestion, text: "Hast du… ?" },
    { id: "yes", icon: Plus, text: "Ja, … habe ich. Hier bitte." },
    { id: "no", icon: Minus, text: "Nein, … habe ich nicht." },
  ];
  const reservedTitleHeight = "10mm";

  return (
    <>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          style={{
            position: "absolute",
            top: "3mm",
            right: "3mm",
            width: "7mm",
            height: "7mm",
            objectFit: "contain",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: "3mm",
          left: "3mm",
          right: "3mm",
          minHeight: reservedTitleHeight,
          fontSize: "8pt",
          fontWeight: 700,
          lineHeight: 1.1,
          color: titleColor,
          ...(titleFont ? { fontFamily: titleFont } : {}),
        }}
      >
        {showGroupTitle ? card.title : ""}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "16mm 0 0",
        }}
      >
        <div
          style={{
            fontSize: "13pt",
            fontWeight: 700,
            lineHeight: 1.15,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {card.highlight || "..."}
        </div>
        <div
          style={{
            marginTop: "2.5mm",
            paddingTop: "2.5mm",
            borderTop: "1px solid currentColor",
            display: "grid",
            gap: "1.5mm",
            fontSize: "13pt",
            fontWeight: 400,
            lineHeight: 1.15,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {card.others.map((entry, index) => (
            <div
              key={`${card.id}-other-${index}`}
              style={
                index === 0
                  ? undefined
                  : {
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "1.5mm",
                    }
              }
            >
              {entry}
            </div>
          ))}
        </div>
        {showFooter ? (
          <div
            style={{
              marginTop: "auto",
              alignSelf: "flex-end",
              width: "100%",
              paddingTop: "2.5mm",
              display: "grid",
              gap: "1mm",
              fontSize: "8pt",
              lineHeight: 1.2,
              color: "inherit",
            }}
          >
            {promptLines.map((line, index) => {
              const Icon = line.icon;
              return (
                <div
                  key={`${card.id}-prompt-${line.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "1.25mm",
                    textAlign: "left",
                    ...(index === 0
                      ? undefined
                      : { borderTop: "1px solid #f1f5f9", paddingTop: "1.5mm" }),
                  }}
                >
                  <Icon style={{ width: "3mm", height: "3mm", flexShrink: 0 }} />
                  <span>{line.text}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}

function TabooCardContent({
  card,
  logoSrc,
  titleColor,
  titleFont,
  subtitle,
}: {
  card: TabooCardVariant;
  logoSrc?: string;
  titleColor: string;
  titleFont?: string;
  subtitle?: string;
}) {
  const reservedTitleHeight = "10mm";

  return (
    <>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          style={{
            position: "absolute",
            top: "3mm",
            right: "3mm",
            width: "7mm",
            height: "7mm",
            objectFit: "contain",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: "3mm",
          left: "3mm",
          right: logoSrc ? "13mm" : "3mm",
          minHeight: reservedTitleHeight,
          fontSize: "8pt",
          fontWeight: 700,
          lineHeight: 1.1,
          color: titleColor,
          ...(titleFont ? { fontFamily: titleFont } : {}),
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "16mm 0 6mm",
        }}
      >
        <div
          style={{
            fontSize: "13pt",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#111827",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            ...(titleFont ? { fontFamily: titleFont } : {}),
          }}
        >
          {card.word || "..."}
        </div>
        <div
          style={{
            marginTop: "3mm",
            paddingTop: "2.5mm",
            borderTop: "1px solid currentColor",
            display: "grid",
            gap: "1.5mm",
            fontSize: "11.5pt",
            lineHeight: 1.15,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {card.stopWords.map((entry, index) => (
            <div
              key={`${card.id}-stop-${index}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1.5mm",
                ...(index === 0
                  ? undefined
                  : { borderTop: "1px solid #e5e7eb", paddingTop: "1.5mm" }),
              }}
            >
              <TriangleAlert style={{ width: "3.4mm", height: "3.4mm", flexShrink: 0, color: "#990000", marginTop: "0.8mm" }} />
              <span>{entry}</span>
            </div>
          ))}
        </div>
      </div>
      {subtitle ? (
        <div
          style={{
            position: "absolute",
            left: "3mm",
            bottom: "3mm",
            maxWidth: "calc(100% - 6mm)",
            fontSize: "7pt",
            lineHeight: 1.1,
            color: "#6b7280",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            ...(titleFont ? { fontFamily: titleFont } : {}),
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </>
  );
}

function QuartettView({
  block,
  mode,
  brand = "edoomio",
  primaryColor = "#1a1a1a",
  headlineFont,
  headingWeights,
  headingColor,
}: {
  block: QuartettBlock;
  mode: ViewMode;
  brand?: Brand;
  primaryColor?: string;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  headingColor?: string;
}) {
  const showGroupTitle = block.showGroupTitle !== false;
  const showFooter = block.showFooter !== false;
  const cards = React.useMemo(() => buildQuartettCardVariants(block.items), [block.items]);
  const isPrint = mode === "print";
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const cardTitleColor = headingColor || primaryColor;
  const blockTitle = block.title?.trim() || "";
  const cardWidthMm = 58;
  const cardHeightMm = 87;
  const columns = 4;
  const rows = 2;
  const sheetWidthMm = cardWidthMm * columns;
  const sheetHeightMm = cardHeightMm * rows;
  const sideRailWidthMm = 10;
  const printSheetWidthMm = sheetWidthMm + sideRailWidthMm * 2;
  const quartettPrintPageWidthMm = 297;
  const quartettPrintPageHeight = "210mm";
  const quartettTitleBoxWidthMm = 190;
  const quartettTitleBoxHeightMm = 10;
  const printContentOffsetY = "0mm";

  if (isPrint) {
    const cardsPerPage = 8;
    const pageCount = Math.max(1, Math.ceil(cards.length / cardsPerPage));
    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const start = pageIndex * cardsPerPage;
      const pageCards = cards.slice(start, start + cardsPerPage);
      return Array.from({ length: cardsPerPage }, (_, slotIndex) => pageCards[slotIndex] ?? null);
    });
    return (
      <>
        {pages.map((pageCards, pageIndex) => (
          <div
            key={`quartett-print-page-${pageIndex}`}
            style={{
              position: "relative",
              width: `${quartettPrintPageWidthMm}mm`,
              height: quartettPrintPageHeight,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxSizing: "border-box",
              transform: `translateY(${printContentOffsetY})`,
              breakAfter: pageIndex < pages.length - 1 ? "page" : undefined,
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : undefined,
            }}
          >
            {blockTitle ? (
              <h3
                className="text-cv-xl"
                style={{
                  position: "absolute",
                  left: `${10 + quartettTitleBoxHeightMm}mm`,
                  top: `${200 - quartettTitleBoxHeightMm}mm`,
                  width: `${quartettTitleBoxWidthMm}mm`,
                  height: `${quartettTitleBoxHeightMm}mm`,
                  transform: "rotate(-90deg)",
                  transformOrigin: "bottom left",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  fontWeight: resolvedHeadingWeight,
                  color: cardTitleColor,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  zIndex: 2,
                  ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
                }}
              >
                {blockTitle}
              </h3>
            ) : null}
            <div
              style={{
                position: "relative",
                width: `${printSheetWidthMm}mm`,
                height: `${sheetHeightMm}mm`,
              }}
            >
              {Array.from({ length: columns + 1 }, (_, lineIndex) => (
                <React.Fragment key={`quartett-v-line-${pageIndex}-${lineIndex}`}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${sideRailWidthMm + lineIndex * cardWidthMm}mm`,
                      width: 0,
                      height: `${sheetHeightMm}mm`,
                      borderLeft: CUT_LINE_DASHED_BORDER,
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + lineIndex * cardWidthMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      top: `calc(-${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                      transform: "rotate(90deg)",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + lineIndex * cardWidthMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      top: `calc(${sheetHeightMm}mm + ${CUT_ICON_GAP_MM}mm)`,
                      transform: "rotate(-90deg)",
                    }}
                  />
                </React.Fragment>
              ))}
              {Array.from({ length: rows + 1 }, (_, lineIndex) => (
                <React.Fragment key={`quartett-h-line-${pageIndex}-${lineIndex}`}>
                  <div
                    style={{
                      position: "absolute",
                      left: `${sideRailWidthMm}mm`,
                      top: `${lineIndex * cardHeightMm}mm`,
                      width: `${sheetWidthMm}mm`,
                      height: 0,
                      borderTop: CUT_LINE_DASHED_BORDER,
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm}mm - ${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                      top: `calc(${lineIndex * cardHeightMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + sheetWidthMm}mm + ${CUT_ICON_GAP_MM}mm)`,
                      top: `calc(${lineIndex * cardHeightMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      transform: "rotate(180deg)",
                    }}
                  />
                </React.Fragment>
              ))}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, ${cardWidthMm}mm)`,
                  gridTemplateRows: `repeat(${rows}, ${cardHeightMm}mm)`,
                  width: `${sheetWidthMm}mm`,
                  height: `${sheetHeightMm}mm`,
                  marginLeft: `${sideRailWidthMm}mm`,
                }}
              >
                {pageCards.map((card, slotIndex) => (
                  <div
                    key={card?.id || `quartett-print-slot-${pageIndex}-${slotIndex}`}
                    style={{
                      position: "relative",
                      width: `${cardWidthMm}mm`,
                      height: `${cardHeightMm}mm`,
                      padding: "4mm",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                    data-quartett-export-card={card ? "true" : undefined}
                    data-quartett-card-id={card?.id}
                  >
                    {card ? (
                      <QuartettCardContent
                        card={card}
                        logoSrc={logoSrc}
                        titleColor={cardTitleColor}
                        titleFont={resolvedHeadlineFont}
                        showGroupTitle={showGroupTitle}
                        showFooter={showFooter}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {blockTitle ? (
        <h3
          className="uppercase tracking-[0.18em]"
          style={{ color: cardTitleColor, ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}) }}
        >
          {blockTitle}
        </h3>
      ) : null}
      <div className="grid gap-4 justify-center" style={{ gridTemplateColumns: "repeat(4, minmax(0, 58mm))" }}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-md border border-border bg-background"
            style={{ width: "58mm", minHeight: "90mm", padding: "4mm" }}
          >
            <QuartettCardContent
              card={card}
              logoSrc={logoSrc}
              titleColor={cardTitleColor}
              titleFont={resolvedHeadlineFont}
              showGroupTitle={showGroupTitle}
              showFooter={showFooter}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TabooView({
  block,
  mode,
  brand = "edoomio",
  primaryColor = "#1a1a1a",
  headlineFont,
  headingWeights,
  headingColor,
}: {
  block: TabooBlock;
  mode: ViewMode;
  brand?: Brand;
  primaryColor?: string;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  headingColor?: string;
}) {
  const cards = React.useMemo(() => buildTabooCardVariants(block.items), [block.items]);
  const isPrint = mode === "print";
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const cardTitleColor = headingColor || primaryColor;
  const blockTitle = block.title?.trim() || "";
  const subtitle = block.subtitle?.trim() || "";
  const cardWidthMm = 58;
  const cardHeightMm = 87;
  const columns = 4;
  const rows = 2;
  const sheetWidthMm = cardWidthMm * columns;
  const sheetHeightMm = cardHeightMm * rows;
  const sideRailWidthMm = 10;
  const printSheetWidthMm = sheetWidthMm + sideRailWidthMm * 2;
  const tabooPrintPageWidthMm = 297;
  const tabooPrintPageHeight = "210mm";
  const tabooTitleBoxWidthMm = 190;
  const tabooTitleBoxHeightMm = 10;
  const printContentOffsetY = "0mm";

  if (isPrint) {
    const cardsPerPage = 8;
    const pageCount = Math.max(1, Math.ceil(cards.length / cardsPerPage));
    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const start = pageIndex * cardsPerPage;
      const pageCards = cards.slice(start, start + cardsPerPage);
      return Array.from({ length: cardsPerPage }, (_, slotIndex) => pageCards[slotIndex] ?? null);
    });
    return (
      <>
        {pages.map((pageCards, pageIndex) => (
          <div
            key={`taboo-print-page-${pageIndex}`}
            style={{
              position: "relative",
              width: `${tabooPrintPageWidthMm}mm`,
              height: tabooPrintPageHeight,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxSizing: "border-box",
              transform: `translateY(${printContentOffsetY})`,
              breakAfter: pageIndex < pages.length - 1 ? "page" : undefined,
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : undefined,
            }}
          >
            {blockTitle ? (
              <h3
                className="text-cv-xl"
                style={{
                  position: "absolute",
                  left: `${10 + tabooTitleBoxHeightMm}mm`,
                  top: `${200 - tabooTitleBoxHeightMm}mm`,
                  width: `${tabooTitleBoxWidthMm}mm`,
                  height: `${tabooTitleBoxHeightMm}mm`,
                  transform: "rotate(-90deg)",
                  transformOrigin: "bottom left",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  fontWeight: resolvedHeadingWeight,
                  color: cardTitleColor,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  zIndex: 2,
                  ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
                }}
              >
                {blockTitle}
              </h3>
            ) : null}
            <div
              style={{
                position: "relative",
                width: `${printSheetWidthMm}mm`,
                height: `${sheetHeightMm}mm`,
              }}
            >
              {Array.from({ length: columns + 1 }, (_, lineIndex) => (
                <React.Fragment key={`taboo-v-line-${pageIndex}-${lineIndex}`}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${sideRailWidthMm + lineIndex * cardWidthMm}mm`,
                      width: 0,
                      height: `${sheetHeightMm}mm`,
                      borderLeft: CUT_LINE_DASHED_BORDER,
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + lineIndex * cardWidthMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      top: `calc(-${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                      transform: "rotate(90deg)",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + lineIndex * cardWidthMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      top: `calc(${sheetHeightMm}mm + ${CUT_ICON_GAP_MM}mm)`,
                      transform: "rotate(-90deg)",
                    }}
                  />
                </React.Fragment>
              ))}
              {Array.from({ length: rows + 1 }, (_, lineIndex) => (
                <React.Fragment key={`taboo-h-line-${pageIndex}-${lineIndex}`}>
                  <div
                    style={{
                      position: "absolute",
                      left: `${sideRailWidthMm}mm`,
                      top: `${lineIndex * cardHeightMm}mm`,
                      width: `${sheetWidthMm}mm`,
                      height: 0,
                      borderTop: CUT_LINE_DASHED_BORDER,
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm}mm - ${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                      top: `calc(${lineIndex * cardHeightMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                    }}
                  />
                  <Scissors
                    aria-hidden="true"
                    style={{
                      ...CUT_ICON_STYLE_BASE,
                      left: `calc(${sideRailWidthMm + sheetWidthMm}mm + ${CUT_ICON_GAP_MM}mm)`,
                      top: `calc(${lineIndex * cardHeightMm}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      transform: "rotate(180deg)",
                    }}
                  />
                </React.Fragment>
              ))}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, ${cardWidthMm}mm)`,
                  gridTemplateRows: `repeat(${rows}, ${cardHeightMm}mm)`,
                  width: `${sheetWidthMm}mm`,
                  height: `${sheetHeightMm}mm`,
                  marginLeft: `${sideRailWidthMm}mm`,
                }}
              >
                {pageCards.map((card, slotIndex) => (
                  <div
                    key={card?.id || `taboo-print-slot-${pageIndex}-${slotIndex}`}
                    style={{
                      position: "relative",
                      width: `${cardWidthMm}mm`,
                      height: `${cardHeightMm}mm`,
                      padding: "4mm",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                    }}
                    data-taboo-export-card={card ? "true" : undefined}
                    data-taboo-card-id={card?.id}
                  >
                    {card ? (
                      <TabooCardContent
                        card={card}
                        logoSrc={logoSrc}
                        titleColor={cardTitleColor}
                        titleFont={resolvedHeadlineFont}
                        subtitle={subtitle}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {blockTitle ? (
        <h3
          className="uppercase tracking-[0.18em]"
          style={{ color: cardTitleColor, ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}) }}
        >
          {blockTitle}
        </h3>
      ) : null}
      <div className="grid gap-4 justify-center" style={{ gridTemplateColumns: "repeat(4, minmax(0, 58mm))" }}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-md border border-border bg-background"
            style={{ width: "58mm", minHeight: "90mm", padding: "4mm" }}
          >
            <TabooCardContent
              card={card}
              logoSrc={logoSrc}
              titleColor={cardTitleColor}
              titleFont={resolvedHeadlineFont}
              subtitle={subtitle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Safe lookup for BRAND_FONTS — falls back to edoomio if brand slug not in static map */
function getBrandFonts(brand: string) {
  return BRAND_FONTS[brand] || BRAND_FONTS["edoomio"];
}

const EXAMPLE_HANDWRITING_FONT = "var(--worksheet-example-font, var(--font-handwriting)), cursive";
const ItemNumberFormatContext = React.createContext<string>("default");

const TASK_BLOCK_TYPES = new Set(["true-false-matrix", "mcq-matrix", "mcq-rows", "order-items", "unscramble-words"]);
const NUMBER_BADGE_LAYOUT_CLASS = `${s.badgeToken} flex h-[var(--viewer-badge-size)] w-[var(--viewer-badge-size)] min-w-[var(--viewer-badge-size)] items-center justify-center rounded-[var(--viewer-badge-radius)] shrink-0 leading-none tabular-nums`;
const NUMBER_BADGE_CLASS = `${NUMBER_BADGE_LAYOUT_CLASS} bg-transparent text-slate-700 ring-1 ring-inset ring-slate-700 font-normal pl-px text-[10.5px]`;
const NUMBER_TEXT_PLACEHOLDER_CLASS = `${NUMBER_BADGE_LAYOUT_CLASS} justify-start bg-transparent text-slate-700 ring-0 font-medium text-[1em]`;
const MATCHING_RIGHT_TEXT_LABEL_CLASS = "shrink-0 bg-transparent text-slate-700 ring-0 font-medium text-[1em] leading-none tabular-nums";
const INSTRUCTION_BADGE_CLASS = `${s.badgeToken} flex h-[var(--viewer-badge-size)] w-[var(--viewer-badge-size)] min-w-[var(--viewer-badge-size)] items-center justify-center rounded-[var(--viewer-badge-radius)] bg-slate-700 text-white ring-1 ring-inset ring-slate-700 font-bold leading-none text-cv-micro`;
const CONTROL_BOX_CLASS = `inline-flex items-center justify-center shrink-0 ${s.controlBox}`;
const CONTROL_BOX_FILLED_CLASS = `${CONTROL_BOX_CLASS} ${s.controlBoxFilled}`;
const CONSISTENT_ROW_CLASS = "flex min-h-[49px] items-center gap-3 border-b";
const CONSISTENT_ROW_CLASS_PRINT = "flex min-h-[32.5px] items-center gap-3 border-b";
const CONSISTENT_INSTRUCTION_ROW_CLASS = "flex w-full min-w-0 min-h-[49px] items-center gap-3 border-b font-bold";
const CONSISTENT_ITEM_BANK_CLASS = "flex min-h-[49px] flex-wrap items-center gap-2";
const CONSISTENT_ITEM_BANK_CHIP_CLASS = "px-2 py-0.5 rounded border";
const VIEWER_SECTION_GAP = {
  "x-small": 4,
  small: 8,
  medium: 12,
  large: 16,
} as const;

function sampleCubicBezierPoints(
  start: { x: number; y: number },
  control1: { x: number; y: number },
  control2: { x: number; y: number },
  end: { x: number; y: number },
  steps = 10,
): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * start.x +
      3 * mt * mt * t * control1.x +
      3 * mt * t * t * control2.x +
      t * t * t * end.x;
    const y =
      mt * mt * mt * start.y +
      3 * mt * mt * t * control1.y +
      3 * mt * t * t * control2.y +
      t * t * t * end.y;
    return [x, y];
  });
}

function renderHandwrittenMatrixIndicator(color: string) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        boxSizing: "border-box",
        width: 16,
        height: 16,
        minWidth: 16,
        minHeight: 16,
        borderRadius: 3,
        color,
        boxShadow: "inset 0 0 0 1px currentColor",
        background: "#fff",
        position: "relative",
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center leading-none"
        style={{
          fontFamily: EXAMPLE_HANDWRITING_FONT,
          color,
          fontSize: "22px",
          top: "-2px",
        }}
      >
        X
      </span>
    </span>
  );
}

function formatInstructionBadgeLabel(index?: number): string {
  return toAlphabeticLabel((index ?? 0) + 1, true);
}

function formatItemNumberLabel(index: number, format: string | null | undefined): string {
  if (format === "numbers-with-period") return `${index}.`;
  return String(index).padStart(2, "0");
}

function formatMatchingRightLabel(index: number, format: string | null | undefined): string {
  const letter = toAlphabeticLabel(index, false);
  return format === "numbers-with-period" ? `${letter}.` : letter;
}

function ItemNumberBadge({ index, className = "" }: { index: number; className?: string }) {
  const itemNumberFormat = React.useContext(ItemNumberFormatContext);
  const isTextOnly = itemNumberFormat === "numbers-with-period";

  return (
    <span className={`${isTextOnly ? NUMBER_TEXT_PLACEHOLDER_CLASS : NUMBER_BADGE_CLASS} ${className}`.trim()}>
      {formatItemNumberLabel(index, itemNumberFormat)}
    </span>
  );
}

function InstructionBadge({ instructionIndex }: { instructionIndex?: number }) {
  return <span className={`${INSTRUCTION_BADGE_CLASS} ${s.instructionBadge}`}>{formatInstructionBadgeLabel(instructionIndex)}</span>;
}

function SectionGap({ size }: { size: keyof typeof VIEWER_SECTION_GAP }) {
  return <div aria-hidden="true" style={{ height: VIEWER_SECTION_GAP[size] }} />;
}

// Inline <svg> bullet marker for viewer/print lists.
// CSS background-image markers are unreliable in Chromium PDF output.
const LI_BULLET_SVG = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:-1.75rem;top:var(--li-icon-top,0.95em);transform:translateY(-50%);pointer-events:none;"><path d="M3 12L15 12"/><circle cx="18" cy="12" r="3"/></svg>`;
// RTL variant: marker on the right side, mirrored 180°.
const LI_BULLET_SVG_RTL = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;right:-1.75rem;top:var(--li-icon-top,0.95em);transform:translateY(-50%) rotate(180deg);pointer-events:none;"><path d="M3 12L15 12"/><circle cx="18" cy="12" r="3"/></svg>`;

function injectLiIcons(html: string, rtl = false): string {
  if (!html.includes("<li")) return html;
  const bullet = rtl ? LI_BULLET_SVG_RTL : LI_BULLET_SVG;
  const withBullets = html.replace(
    /<li(\b[^>]*)?>/gi,
    (_, attrs) => `<li${attrs ?? ""}>${bullet}<div class="li-content-no-break">`,
  );
  return withBullets.replace(/<\/li>/gi, "</div></li>");
}

// Wrap multi-segment numeric sequences (e.g. "076 621 61 61") with Unicode
// LRI/PDI isolate characters so they stay in logical order inside RTL paragraphs.
// LRI (U+2066) forces an LTR isolate; PDI (U+2069) closes it. These are
// character-level controls so they can't be overridden by CSS.
function isolateNumberRunsForRtl(html: string): string {
  const LRI = "\u2066";
  const PDI = "\u2069";
  return html.replace(/>([^<]+)</g, (_, text: string) => {
    const wrapped = text.replace(
      /(\d[\d\s().+\-/]*\d)/g,
      (run) => `${LRI}${run}${PDI}`,
    );
    return `>${wrapped}<`;
  });
}

function normalizeInlineViewerHtml(value: string): string {
  return stripOuterP(normalizeToHtml(value || ""));
}

/** Deterministic pseudo-random order for stable render output across re-renders/PDF generation. */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], seedKey: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashString(seedKey));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function deterministicDerangement<T>(items: T[], seedKey: string): T[] {
  const ranked = items.map((item, index) => ({
    item,
    index,
    weight: hashString(`${seedKey}:${index}`),
  }))
    .sort((left, right) => left.weight - right.weight || left.index - right.index);

  const n = ranked.length;
  if (n <= 1) return ranked.map(({ item }) => item);

  for (let shift = 1; shift < n; shift++) {
    const candidate = ranked.map((_, i) => ranked[(i + shift) % n]);
    if (candidate.every((entry, i) => entry.index !== i)) {
      return candidate.map(({ item }) => item);
    }
  }

  const fallback = [...ranked];
  for (let i = 0; i < n; i++) {
    if (fallback[i].index !== i) continue;
    for (let j = i + 1; j < n; j++) {
      if (fallback[j].index !== i && fallback[i].index !== j) {
        [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
        break;
      }
    }
  }

  return fallback.map(({ item }) => item);
}

// ─── German marker helper ────────────────────────────────────
/** Parse {{de:…}} markers and render the German text in semibold + accent color */
function renderDeMarkers(text: string, color?: string | null): React.ReactNode {
  const parts = text.split(/(\{\{de:.*?\}\})/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(/^\{\{de:(.*?)\}\}$/);
    if (m) {
      return (
        <em key={i} className="not-italic font-semibold" style={color ? { color } : undefined}>
          {m[1]}
        </em>
      );
    }
    return part;
  });
}

// ─── Task pill + container ───────────────────────────────────
function colorWithAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255);
  const hexA = a.toString(16).padStart(2, "0");
  const short = color.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}${hexA}`;
  }
  const full = color.match(/^#([0-9a-fA-F]{6})$/);
  if (full) {
    return `${color}${hexA}`;
  }
  return color;
}

function TaskContainer({
  showPill,
  taskNumber,
  lessonLabel,
  instruction,
  instructionStyle,
  children,
  accentColor,
}: {
  showPill: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  instruction?: string;
  instructionStyle?: React.CSSProperties;
  children: React.ReactNode;
  accentColor?: string | null;
}) {
  const headerBg = accentColor || "#F9F6ED";
  const headerText = accentColor ? "#ffffff" : "inherit";
  const panelBg = "#ffffff";
  const panelBorder = accentColor || "#F9F6ED";
  return (
    <div>
      {(showPill || instruction) && (
        <div className="flex w-full min-w-0 items-end gap-3">
          {showPill && (
          <div
            className="py-1 px-3 text-xs font-semibold rounded-t-sm text-center uppercase flex items-center justify-center"
            style={{ backgroundColor: headerBg, color: headerText }}
          >
            AUFGABE{taskNumber != null ? ` ${lessonLabel ? `${lessonLabel}.` : ""}${String(taskNumber).padStart(2, "0")}` : ""}
          </div>
          )}
          {instruction && (
            <InstructionRow
              instruction={instruction}
              accentColor={accentColor}
              showBadge={false}
              withDivider={false}
              rowClassName="min-w-0 flex-1 pb-1"
              style={instructionStyle}
            />
          )}
        </div>
      )}
      <div
        className={`p-4 border-2 ${showPill ? "rounded-b-lg rounded-tr-lg" : "rounded-lg"}`}
        style={{ backgroundColor: panelBg, borderColor: panelBorder }}
      >
        {children}
      </div>
    </div>
  );
}

function InstructionRow({
  instruction,
  accentColor,
  showBadge = true,
  withDivider = true,
  instructionIndex,
  rowClassName,
  trailingContent,
  style,
  mode,
}: {
  instruction: React.ReactNode;
  accentColor?: string | null;
  showBadge?: boolean;
  withDivider?: boolean;
  instructionIndex?: number;
  rowClassName?: string;
  trailingContent?: React.ReactNode;
  style?: React.CSSProperties;
  mode?: ViewMode;
}) {
  const isOnline = mode === "online";
  return (
    <div
      className={`flex w-full min-w-0 items-center gap-3 font-semibold ${withDivider ? "py-2 border-b" : ""} ${rowClassName || ""}`.trim()}
      style={{
        color: "var(--color-primary)",
        ...(style || {}),
      }}
    >
      {showBadge && (
        <InstructionBadge instructionIndex={instructionIndex} />
      )}
      <div className="min-w-0 flex-1">
        <p className="min-w-0">{instruction}</p>
      </div>
      {trailingContent}
    </div>
  );
}

// ─── Handwriting helper ──────────────────────────────────────
/** Check whether a string contains ++…++ handwriting markers */
function hasHandwriting(text: string): boolean {
  return /\+\+.+?\+\+/.test(text);
}
/** Parse ++text++ markers and render as handwriting-styled spans */
function renderHandwriting(text: string): React.ReactNode {
  const parts = text.split(/(\+\+.*?\+\+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("++") && part.endsWith("++")) {
      const inner = part.slice(2, -2);
      return (
        <span
          key={i}
          className={`text-blue-500 ${s.handwriting}`}
        >
          {inner}
        </span>
      );
    }
    return part;
  });
}

type ReadingComprehensionFieldSegment = {
  prefilled: string;
  solution: string;
  hasCorrection: boolean;
};

function parseReadingComprehensionFieldValue(rawValue: string | undefined) {
  const value = rawValue ?? "";
  const inlinePattern = /(\{\{.*?(?:\|.*?)?\}\})/g;

  if (value.includes("{{") && value.includes("}}")) {
    const segments = value.split(inlinePattern).filter((part) => part.length > 0).map<ReadingComprehensionFieldSegment>((part) => {
      const correctionMatch = part.match(/^\{\{(.*?)\|(.*?)\}\}$/);
      if (correctionMatch) {
        const prefilled = correctionMatch[1].trim();
        const solution = correctionMatch[2].trim();
        return {
          prefilled,
          solution,
          hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase(),
        };
      }

      const deletionMatch = part.match(/^\{\{(.*?)\}\}$/);
      if (deletionMatch) {
        const prefilled = deletionMatch[1].trim();
        return {
          prefilled,
          solution: "",
          hasCorrection: prefilled.length > 0,
        };
      }

      if (!part.includes("{{")) {
        return {
          prefilled: part,
          solution: part,
          hasCorrection: false,
        };
      }

      return {
        prefilled: part,
        solution: part,
        hasCorrection: false,
      };
    });

    return {
      prefilled: segments.map((segment) => segment.prefilled).join(""),
      solution: segments.map((segment) => segment.solution).join(""),
      hasCorrection: segments.some((segment) => segment.hasCorrection),
      inlineSyntax: true,
      segments,
    };
  }

  const [prefilledPart, ...solutionParts] = value.split("|");
  if (solutionParts.length === 0) {
    const normalized = value.trim();
    return {
      prefilled: normalized,
      solution: normalized,
      hasCorrection: false,
      inlineSyntax: false,
      segments: [{ prefilled: normalized, solution: normalized, hasCorrection: false }],
    };
  }

  const prefilled = prefilledPart.trim();
  const solution = solutionParts.join("|").trim();
  return {
    prefilled,
    solution,
    hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase(),
    inlineSyntax: false,
    segments: [{ prefilled, solution, hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase() }],
  };
}

function renderReadingComprehensionCorrectionSegments(
  parsedValue: ReturnType<typeof parseReadingComprehensionFieldValue>,
  correctionColor?: string,
  prefilledColor?: string,
) {
  if (parsedValue.inlineSyntax) {
    const appendedCorrections = parsedValue.segments
      .filter((segment) => segment.hasCorrection && segment.solution)
      .map((segment) => segment.solution);

    return (
      <>
        {parsedValue.segments.map((segment, index) => {
          if (!segment.hasCorrection) {
            return <span key={index} style={prefilledColor ? { color: prefilledColor } : undefined}>{segment.prefilled}</span>;
          }

          return (
            <RoughExampleStrike tight tightTop="58%" key={index} style={{ verticalAlign: "-0.18em" }}>
              <span style={prefilledColor ? { color: prefilledColor } : undefined}>{segment.prefilled}</span>
            </RoughExampleStrike>
          );
        })}
        {appendedCorrections.length > 0 ? (
          <span
            className="ml-2"
            style={{
              fontFamily: EXAMPLE_HANDWRITING_FONT,
              fontSize: "18px",
              ...(correctionColor ? { color: correctionColor } : undefined),
            }}
          >
            {appendedCorrections.join(", ")}
          </span>
        ) : null}
      </>
    );
  }

  return parsedValue.segments.map((segment, index) => {
    if (!segment.hasCorrection) {
      return <span key={index} style={prefilledColor ? { color: prefilledColor } : undefined}>{segment.prefilled}</span>;
    }

    return (
      <span key={index} className="inline-flex items-center">
        <RoughExampleStrike tight>
          <span style={prefilledColor ? { color: prefilledColor } : undefined}>{segment.prefilled}</span>
        </RoughExampleStrike>
        <span
          className="ml-2"
          style={{
            fontFamily: EXAMPLE_HANDWRITING_FONT,
            fontSize: "18px",
            ...(correctionColor ? { color: correctionColor } : undefined),
          }}
        >
          {segment.solution}
        </span>
      </span>
    );
  });
}

// ─── Static blocks ──────────────────────────────────────────

// Helper: collect all numbered-label blocks in document order (top-level + inside columns/accordion)
function collectNumberedLabelBlocks(blocks: WorksheetBlock[]): { id: string; startNumber: number }[] {
  const result: { id: string; startNumber: number }[] = [];
  for (const b of blocks) {
    if (b.type === "numbered-label") result.push({ id: b.id, startNumber: b.startNumber });
    if (b.type === "columns") {
      for (const col of b.children) {
        for (const child of col) {
          if (child.type === "numbered-label") result.push({ id: child.id, startNumber: child.startNumber });
        }
      }
    }
    if (b.type === "accordion") {
      for (const item of b.items) {
        for (const child of item.children) {
          if (child.type === "numbered-label") result.push({ id: child.id, startNumber: child.startNumber });
        }
      }
    }
  }
  return result;
}

function NumberedLabelView({ block, originalBlock, allBlocks, primaryColor = "#1a1a1a" }: { block: NumberedLabelBlock; originalBlock?: NumberedLabelBlock; allBlocks?: WorksheetBlock[]; primaryColor?: string }) {
  let displayNumber: string;
  if (allBlocks) {
    const all = collectNumberedLabelBlocks(allBlocks);
    const idx = all.findIndex((b) => b.id === block.id);
    displayNumber = String(block.startNumber + (idx >= 0 ? idx : 0)).padStart(2, "0");
  } else {
    displayNumber = String(block.startNumber).padStart(2, "0");
  }

  const buildLabel = ({
    prefix,
    suffix,
    withNumber,
    withSuffixGap,
  }: {
    prefix: string;
    suffix: string;
    withNumber: boolean;
    withSuffixGap: boolean;
  }) => `${prefix}${withNumber ? displayNumber : ""}${suffix ? `${withSuffixGap ? "\u2003" : ""}${suffix}` : ""}`;

  const currentLabel = buildLabel({
    prefix: block.prefix,
    suffix: block.suffix,
    withNumber: true,
    withSuffixGap: true,
  });
  const translatedLabelNoNumber = buildLabel({
    prefix: block.prefix,
    suffix: block.suffix,
    withNumber: false,
    withSuffixGap: false,
  });
  const originalLabel = originalBlock
    ? buildLabel({
        prefix: originalBlock.prefix,
        suffix: originalBlock.suffix,
        withNumber: true,
        withSuffixGap: true,
      })
    : undefined;
  const isBilingual = !!block.bilingual && !!originalLabel && originalLabel !== currentLabel;

  return (
    <div className="rounded px-2 py-1" style={{ backgroundColor: `${primaryColor}14` }}>
      {isBilingual ? (
        <span className={s.numberedLabel} style={{ color: primaryColor }}>
          <span style={{ fontWeight: 700 }}>{originalLabel}</span>
          <span style={{ fontWeight: 400 }}> | </span>
          <span style={{ fontWeight: 400 }}>{translatedLabelNoNumber}</span>
        </span>
      ) : (
        <span className={`font-semibold ${s.numberedLabel}`} style={{ color: primaryColor }}>
          {currentLabel}
        </span>
      )}
    </div>
  );
}

// ─── Heading number helpers ──────────────────────────────────
function toAlphabeticLabel(index: number, uppercase: boolean): string {
  let n = Math.max(1, index);
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return uppercase ? out : out.toLowerCase();
}

function formatHeadingNumber(index: number, format: string | null | undefined): string {
  switch (format) {
    case "numbers-leading-zero": return String(index).padStart(2, "0");
    case "letters-uppercase": return toAlphabeticLabel(index, true);
    case "letters-lowercase": return toAlphabeticLabel(index, false);
    case "numbers":
    default: return String(index);
  }
}

function resolveHeadingColor(
  override: string | null | undefined,
  primaryColor?: string,
  accentColor?: string | null,
): string | undefined {
  if (override === "primary") return primaryColor;
  if (override === "accent") return accentColor || primaryColor;
  if (override && override !== "none") return override;
  return undefined;
}

function collectNumberedHeadingSequences(blocks: WorksheetBlock[]): Map<string, number> {
  const sequences = new Map<string, number>();
  const counters = [0, 0, 0, 0];

  const visit = (items: WorksheetBlock[]) => {
    for (const block of items) {
      if (block.type === "numbered-heading") {
        const levelIndex = block.level - 1;
        const explicitStart = Math.max(1, Math.floor(block.startNumber ?? 1));
        counters[levelIndex] = counters[levelIndex] === 0
          ? explicitStart
          : Math.max(counters[levelIndex] + 1, explicitStart);
        for (let index = levelIndex + 1; index < counters.length; index += 1) {
          counters[index] = 0;
        }
        sequences.set(block.id, counters[levelIndex]);
        continue;
      }
      if (block.type === "columns") {
        for (const column of block.children) visit(column);
        continue;
      }
      if (block.type === "accordion") {
        for (const item of block.items) visit(item.children);
        continue;
      }
      if (block.type === "grid") {
        for (const cell of block.children) visit(cell);
      }
    }
  };

  visit(blocks);
  return sequences;
}

function HeadingView({ block, originalBlock, brand, headlineFont, headingWeights, isNonLatin, translationScale, primaryColor, accentColor, headingColor }: { block: HeadingBlock; originalBlock?: HeadingBlock; brand?: Brand; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; isNonLatin?: boolean; translationScale?: number; primaryColor?: string; accentColor?: string | null; headingColor?: string }) {
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl" };
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.[`h${block.level}` as "h1" | "h2" | "h3"] ?? brandFonts.headlineWeight;
  const headingBottomMargin =
    block.level === 1
      ? "var(--print-h1-bottom-margin, -4px)"
      : `var(--print-h${block.level}-bottom-margin)`;
  const style: React.CSSProperties = {
    marginBottom: headingBottomMargin,
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
  };
  const deMarkerColor = originalBlock ? accentColor : undefined;
  const isBilingual = block.bilingual && originalBlock && originalBlock.content !== block.content;
  if (isBilingual) {
    const scale = translationScale ?? (isNonLatin ? 0.9 : undefined);
    return (
      <Tag className={sizes[block.level]} style={style}>
        <span style={{ ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}), fontWeight: resolvedHeadingWeight }}>{renderDeMarkers(originalBlock.content, deMarkerColor)}</span>
        <span style={{ fontWeight: 400 }}> | </span>
        <span style={{ ...(scale ? { fontSize: `${scale}em` } : {}), fontWeight: 400 }}>{renderDeMarkers(block.content, deMarkerColor)}</span>
      </Tag>
    );
  }
  return <Tag className={sizes[block.level]} style={style}>{renderDeMarkers(block.content, deMarkerColor)}</Tag>;
}

function NumberedHeadingView({
  block,
  brand,
  headlineFont,
  headingWeights,
  headingNumberWeights,
  isNonLatin,
  translationScale,
  primaryColor,
  accentColor,
  headingColor,
  headingNumberColor,
  headingNumberFormat,
  allBlocks,
}: {
  block: NumberedHeadingBlock;
  brand?: Brand;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  headingNumberWeights?: { h1: number; h2: number; h3: number; h4: number };
  isNonLatin?: boolean;
  translationScale?: number;
  primaryColor?: string;
  accentColor?: string | null;
  headingColor?: string;
  headingNumberColor?: string;
  headingNumberFormat?: string | null;
  allBlocks?: WorksheetBlock[];
}) {
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes: Record<number, string> = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl", 4: "text-cv-lg" };
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight =
    (headingWeights as Record<string, number> | undefined)?.[`h${block.level}`] ?? brandFonts.headlineWeight;
  const resolvedHeadingNumberWeight =
    (headingNumberWeights as Record<string, number> | undefined)?.[`h${block.level}`] ?? resolvedHeadingWeight;
  const sequences = allBlocks ? collectNumberedHeadingSequences(allBlocks) : undefined;
  const sequence = sequences?.get(block.id) ?? 1;
  const numberLabel = formatHeadingNumber(sequence, headingNumberFormat);
  const numberSlotStyle: React.CSSProperties = {
    display: "inline-block",
    minWidth: "1.5rem",
    marginRight: "0.5rem",
    fontVariantNumeric: "tabular-nums",
    fontWeight: resolvedHeadingNumberWeight,
    ...(headingNumberColor ? { color: headingNumberColor } : {}),
  };
  const headingBottomMargin =
    block.level === 1
      ? "var(--print-h1-bottom-margin, -4px)"
      : `var(--print-h${block.level}-bottom-margin)`;
  const style: React.CSSProperties = {
    marginBottom: headingBottomMargin,
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
  };
  return (
    <Tag className={sizes[block.level]} style={style}>
      <span style={numberSlotStyle}>{numberLabel}</span>
      <span>{block.content}</span>
    </Tag>
  );
}

function TextView({ block, originalBlock, mode, bodyFont, originalBodyFont, bodyFontSize, isNonLatin, isRtl: isLocaleRtl = false, translationScale, primaryColor = "#1a1a1a", instructionIndex, accentColor, brand = "edoomio" }: { block: TextBlock; originalBlock?: TextBlock; mode: ViewMode; bodyFont?: string; originalBodyFont?: string; bodyFontSize?: string; isNonLatin?: boolean; isRtl?: boolean; translationScale?: number; primaryColor?: string; instructionIndex?: number; accentColor?: string | null; brand?: Brand }) {
  // skipTranslation blocks always render the original (German) content, so they
  // must stay LTR even when the active worksheet locale is RTL.
  const isRtl = isLocaleRtl && !block.skipTranslation;
  // Only highlight {{de:…}} markers with accent color when the worksheet is translated
  const deMarkerColor = originalBlock ? accentColor : undefined;
  const isExample = block.textStyle === "example";
  const isExampleStandard = block.textStyle === "example-standard";
  const isExampleImproved = block.textStyle === "example-improved";
  const isExamplePrimary = block.textStyle === "example-primary";
  const isExampleSecondary = block.textStyle === "example-secondary";
  const isFrame = block.textStyle === "frame";
  const isFramePrimary = block.textStyle === "frame-primary";
  const isFrameSecondary = block.textStyle === "frame-secondary";
  const hasExampleBox = isExample || isExampleStandard || isExampleImproved || isExamplePrimary || isExampleSecondary;
  const hasFrameBox = isFrame || isFramePrimary || isFrameSecondary;

  const isHinweis = block.textStyle === "hinweis";
  const isHinweisWichtig = block.textStyle === "hinweis-wichtig";
  const isHinweisAlarm = block.textStyle === "hinweis-alarm";
  const isLernziel = block.textStyle === "lernziel";
  const isKompetenzziele = block.textStyle === "kompetenzziele";
  const isHandlungsziele = block.textStyle === "handlungsziele";
  const isFragen = block.textStyle === "fragen";
  const isRedemittel = block.textStyle === "redemittel";
  const hasHinweisBox = isHinweisWichtig || isHinweisAlarm || isLernziel;
  const isRows = block.textStyle === "rows" || isKompetenzziele || isHandlungsziele || isRedemittel || isFragen;
  const isMetadaten = block.textStyle === "metadaten";
  const isStandard = block.textStyle === "standard" || !block.textStyle;

  const HintRowIcon = () => {
    const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (isKompetenzziele) return <svg {...p}><path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 2 12 12"/><path d="M16 2h6v6"/></svg>;
    if (isHandlungsziele) return <svg {...p}><path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/></svg>;
    if (isRedemittel) return <MessageCircle size={20} strokeWidth={2} />;
    if (isFragen) return <MessageCircleQuestion size={20} strokeWidth={2} />;
    return <ArrowRight size={20} strokeWidth={2} />;
  };

  const RowsIconSvg = () => {
    const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (isKompetenzziele) return <svg {...p}><path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 2 12 12"/><path d="M16 2h6v6"/></svg>;
    if (isHandlungsziele) return <svg {...p}><path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/></svg>;
    if (isFragen) return <MessageCircleQuestion size={20} strokeWidth={2} />;
    if (isRedemittel) return <MessageCircle size={20} strokeWidth={2} />;
    return <svg {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
  };

  const rowIconSlotWidth = "1.5rem";
  const rowIconSlotGap = "0.5rem";
  const rowIconTextLane = `calc(${rowIconSlotWidth} + ${rowIconSlotGap})`;

  // Bilingual: show 2-column layout when block is marked bilingual, a translation is active,
  // and the original content differs from the translated content
  const isBilingual = block.bilingual && originalBlock && originalBlock.content !== block.content;
  const showBilingualDivider = block.bilingualDivider === true;
  const fallbackBrandBodyFont = getBrandFonts(brand).bodyFont;
  const resolvedBodyFont = bodyFont || fallbackBrandBodyFont || "inherit";
  const resolvedOriginalBodyFont = originalBodyFont || resolvedBodyFont;
  const resolvedOriginalContentFont = hasExampleBox
    ? "var(--worksheet-original-example-font, var(--worksheet-example-font, inherit))"
    : resolvedOriginalBodyFont;
  const resolvedContentFont = block.skipTranslation
    ? resolvedOriginalContentFont
    : hasExampleBox
      ? "var(--worksheet-example-font, inherit)"
      : resolvedBodyFont;
  const baseTextStyle: React.CSSProperties = {
    ...(resolvedContentFont !== "inherit" ? { fontFamily: resolvedContentFont } : {}),
    ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
  };
  // Font override for the original (German) column in bilingual mode — ensures brand font for Latin text
  const originalFontStyle: React.CSSProperties | undefined = isBilingual
    ? {
        ...(resolvedOriginalContentFont !== "inherit" ? { fontFamily: resolvedOriginalContentFont } : {}),
        ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
      }
    : undefined;
  // Reduce font size for non-Latin translated text (e.g. Cyrillic renders visually larger at same pt size)
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const translatedFontStyle: React.CSSProperties | undefined = isBilingual
    ? { ...baseTextStyle, ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}) }
    : undefined;
  // skipTranslation blocks always render the original (German) content, so they
  // must stay LTR even when the active worksheet locale is RTL.
  const applyRtl = isRtl;
  const translatedDirectionStyle: React.CSSProperties | undefined = applyRtl
    ? { direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" }
    : undefined;
  // Only apply RTL to the outer wrapper for single-column blocks. In bilingual
  // mode each column owns its own direction so the wrapper must stay neutral,
  // otherwise text-align: right cascades into the German column too.
  const singleColumnTextStyle: React.CSSProperties =
    translatedDirectionStyle && !isBilingual
      ? { ...baseTextStyle, ...translatedDirectionStyle }
      : baseTextStyle;
  const bilingualGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "0 1em",
    position: "relative",
    direction: "ltr",
  };
  const renderBilingualGrid = (
    left: React.ReactNode,
    right: React.ReactNode,
    style?: React.CSSProperties,
    options?: { showDivider?: boolean }
  ) => (
    <div style={{ ...bilingualGrid, ...style }}>
      {options?.showDivider !== false && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 1,
            transform: "translateX(-0.5px)",
            backgroundColor: "#e2e8f0",
            pointerEvents: "none",
          }}
        />
      )}
      {left}
      {right}
    </div>
  );

  const imageEl = block.imageSrc ? (
    <div
      style={{
        float: block.imageAlign === "right" ? "right" : "left",
        width: `${block.imageScale ?? 30}%`,
        margin: block.imageAlign === "right" ? "4px 0 8px 12px" : "4px 12px 8px 0",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.imageSrc}
        alt=""
        className="w-full rounded-sm"
      />
    </div>
  ) : null;

  /** Render a single column of tiptap content (used for both original and translated) */
  const renderContent = (html: string, wrapperStyle?: React.CSSProperties, direction?: "rtl" | "ltr") => {
    const effectiveDir = direction ?? (isRtl ? "rtl" : undefined);
    const rtl = effectiveDir === "rtl";
    let processed = injectLiIcons(prepareTiptapHtml(html, deMarkerColor), rtl);
    if (rtl) processed = isolateNumberRunsForRtl(processed);
    return (
      <div
        className={`tiptap max-w-none ${hasExampleBox || hasFrameBox || hasHinweisBox ? s.tiptapFlush : ""}`}
        dir={effectiveDir}
        style={wrapperStyle}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  /** Split HTML into individual paragraph strings */
  const splitParagraphs = (html: string): string[] => {
    const prepared = prepareTiptapHtml(html, deMarkerColor);
    const matches = prepared.match(/<p[^>]*>.*?<\/p>/gi);
    return matches || [prepared];
  };

  /** Split rows content into row fragments, treating both <p> and <li> as rows.
   *  Normalises <li> fragments into <p> snippets so each list item becomes one row. */
  const splitRowItems = (html: string): string[] => {
    const prepared = prepareTiptapHtml(html, deMarkerColor);
    const rows = Array.from(prepared.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>|<p\b[^>]*>[\s\S]*?<\/p>/gi), (m) => m[0]);
    if (rows.length === 0) return [prepared];

    return rows.map((row) => {
      if (!/^<li\b/i.test(row)) return row;
      const liInner = row.replace(/^<li\b[^>]*>/i, "").replace(/<\/li>$/i, "").trim();
      if (/^<p\b/i.test(liInner)) return liInner;
      return `<p>${liInner}</p>`;
    });
  };

  /** Wrap content in bilingual 2-column grid if active */
  const wrapBilingual = (translatedHtml: string, originalHtml?: string) => {
    if (!isBilingual || !originalHtml) return renderContent(translatedHtml, translatedDirectionStyle, isRtl ? "rtl" : undefined);

    // For rows style: render paragraph-by-paragraph aligned rows
    if (isRows) {
      const originalParas = splitRowItems(originalHtml);
      const translatedParas = splitRowItems(translatedHtml);
      const maxLen = Math.max(originalParas.length, translatedParas.length);
      const cellBase: React.CSSProperties = {
        padding: `0.375rem 0.625rem 0.375rem ${rowIconTextLane}`,
        position: "relative",
        borderBottom: "1px solid #d1d5db",
        lineHeight: "1.35em",
      };
      return renderBilingualGrid(
        Array.from({ length: maxLen }, (_, i) => (
            <React.Fragment key={i}>
              <div style={{ ...cellBase, ...originalFontStyle, ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}) }}>
                <div style={{ position: "absolute", left: 0, top: "calc(0.375rem + 0.7em)", transform: "translateY(-50%)" }}><RowsIconSvg /></div>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: originalParas[i] || "" }} />
              </div>
              <div style={{ ...cellBase, ...translatedFontStyle, ...translatedDirectionStyle, ...(isRtl ? { padding: `0.375rem ${rowIconTextLane} 0.375rem 0.625rem` } : {}), ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}) }}>
                <div style={{ position: "absolute", ...(isRtl ? { right: 0 } : { left: 0 }), top: "calc(0.375rem + 0.7em)", transform: isRtl ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)" }}><RowsIconSvg /></div>
                <div className="tiptap max-w-none tiptap-compact" dir={isRtl ? "rtl" : undefined} style={translatedDirectionStyle} dangerouslySetInnerHTML={{ __html: isRtl ? isolateNumberRunsForRtl(translatedParas[i] || "") : (translatedParas[i] || "") }} />
              </div>
            </React.Fragment>
          )),
        null,
        undefined,
        { showDivider: showBilingualDivider },
      );
    }

    // For standard style bilingual: paragraph-by-paragraph aligned rows without cell padding
    if (isStandard) {
      // Keep full list structure in both columns when <li> is present.
      // Splitting into standalone <p> rows strips <ul>/<li> context and drops list icons.
      const hasListRows = /<li\b/i.test(originalHtml) || /<li\b/i.test(translatedHtml);
      if (hasListRows) {
        return renderBilingualGrid(
          <div style={originalFontStyle}>{renderContent(originalHtml)}</div>,
          <div className="tiptap-bilingual-translated" style={{ ...translatedFontStyle, ...translatedDirectionStyle }}>{renderContent(translatedHtml, undefined, isRtl ? "rtl" : undefined)}</div>,
          undefined,
          { showDivider: showBilingualDivider },
        );
      }

      const originalParas = splitParagraphs(originalHtml);
      const translatedParas = splitParagraphs(translatedHtml);
      const maxLen = Math.max(originalParas.length, translatedParas.length);
      const hasMultipleRows = maxLen > 1;
      const rowPadding = hasMultipleRows ? "0.25em" : "0";
      return renderBilingualGrid(Array.from({ length: maxLen }, (_, i) => (
            <React.Fragment key={i}>
              <div className="tiptap-compact" style={{ paddingTop: rowPadding, paddingBottom: rowPadding, ...originalFontStyle }}>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: originalParas[i] || "" }} />
              </div>
              <div className="tiptap-compact" style={{ paddingTop: rowPadding, paddingBottom: rowPadding, ...translatedFontStyle, ...translatedDirectionStyle }}>
                <div className="tiptap max-w-none tiptap-compact" dir={isRtl ? "rtl" : undefined} style={translatedDirectionStyle} dangerouslySetInnerHTML={{ __html: isRtl ? isolateNumberRunsForRtl(translatedParas[i] || "") : (translatedParas[i] || "") }} />
              </div>
            </React.Fragment>
          )), null, undefined, { showDivider: showBilingualDivider });
    }

    return renderBilingualGrid(
      <div style={originalFontStyle}>{renderContent(originalHtml)}</div>,
      <div className="tiptap-bilingual-translated" style={{ ...translatedFontStyle, ...translatedDirectionStyle }}>{renderContent(translatedHtml, undefined, isRtl ? "rtl" : undefined)}</div>,
      baseTextStyle,
      { showDivider: showBilingualDivider },
    );
  };

  if (isLernziel) {
    const showStacked = isBilingual && originalBlock;
    const isOnline = mode === "online";
    return (
      <div
        className={isOnline ? "flex gap-0 font-semibold border rounded-[5px] overflow-hidden" : "flex gap-0 font-semibold border rounded-sm overflow-hidden"}
        style={{
          borderColor: primaryColor,
          color: primaryColor,
          ...(isOnline ? {} : { backgroundColor: `${primaryColor}10` }),
        }}
      >
        <div
          className={isOnline ? "shrink-0 w-8 flex items-center justify-center" : "shrink-0 w-10 flex items-center justify-center"}
          style={{ backgroundColor: primaryColor }}
        >
          <Flag className={isOnline ? "h-4 w-4" : "h-5 w-5"} style={{ color: "#ffffff" }} />
        </div>
        <div
          className="flex-1 min-w-0 px-6 py-2"
          style={{
            ...baseTextStyle,
            ...(isOnline ? {} : { backgroundColor: colorWithAlpha(primaryColor, 0.08) }),
          }}
        >
          {imageEl}
          {showStacked ? (
            <div>
              <div style={baseTextStyle}>{renderContent(originalBlock.content)}</div>
              <div style={{ borderTop: `1px solid ${primaryColor}30`, marginTop: "0.25rem", paddingTop: "0.25rem", fontWeight: 400, ...translatedFontStyle, ...translatedDirectionStyle }}>{renderContent(block.content)}</div>
            </div>
          ) : (
            renderContent(block.content)
          )}
        </div>
      </div>
    );
  }

  if (isMetadaten) {
    return (
      <div className={s.textPlain} style={{ marginBottom: "-2rem", ...singleColumnTextStyle, color: primaryColor }}>
        {renderContent(block.content, translatedDirectionStyle, isRtl ? "rtl" : undefined)}
      </div>
    );
  }

  if (!hasExampleBox && !hasFrameBox && !hasHinweisBox) {
    // Hinweis / redemittel / handlungsziele / kompetenzziele: hintBox icon+text layout, top+bottom border only
    if ((isHinweis || isRedemittel || isHandlungsziele || isKompetenzziele) && !isBilingual) {
      const borderColor = isHinweis ? "#475569" : "#d1d5db";
      const iconColor = isHinweis ? "#475569" : "#475569";
      const paras = isHinweis ? [block.content] : splitRowItems(block.content);
      return (
        <div className={s.textPlain} style={singleColumnTextStyle}>
          {imageEl}
          {paras.map((para, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 0,
                borderBottom: `1px solid ${borderColor}`,
                ...(i === 0 ? { borderTop: `1px solid ${borderColor}` } : {}),
                breakInside: "avoid" as const,
                pageBreakInside: "avoid" as const,
              }}
            >
              <div style={{ flexShrink: 0, width: rowIconSlotWidth, minWidth: rowIconSlotWidth, marginRight: isRtl ? 0 : rowIconSlotGap, marginLeft: isRtl ? rowIconSlotGap : 0, display: "flex", alignItems: "center", justifyContent: "flex-start", color: iconColor, transform: isRtl ? "rotate(180deg)" : undefined }}>
                <HintRowIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: isRtl ? "0.375rem 0 0.375rem 0.625rem" : "0.375rem 0.625rem 0.375rem 0" }}>
                {isHinweis
                  ? renderContent(para, translatedDirectionStyle, isRtl ? "rtl" : undefined)
                  : <div className="tiptap max-w-none tiptap-compact" dir={isRtl ? "rtl" : undefined} style={translatedDirectionStyle} dangerouslySetInnerHTML={{ __html: isRtl ? isolateNumberRunsForRtl(para) : para }} />}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For rows style (non-bilingual): render paragraph-by-paragraph with real DOM icon divs.
    // CSS ::before background-image is not rendered by Chromium's PDF engine.
    if (isRows && !isBilingual) {
      const paras = splitRowItems(block.content);
      return (
        <div className={s.textPlain} style={singleColumnTextStyle}>
          {imageEl}
          {paras.map((para, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: isRtl ? "row-reverse" : "row",
                gap: 0,
                borderBottom: "1px solid #d1d5db",
                ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}),
                breakInside: "avoid" as const,
                pageBreakInside: "avoid" as const,
              }}
            >
              <div style={{ flexShrink: 0, width: rowIconSlotWidth, minWidth: rowIconSlotWidth, marginRight: isRtl ? 0 : rowIconSlotGap, marginLeft: isRtl ? rowIconSlotGap : 0, display: "flex", alignItems: "center", justifyContent: "flex-start", color: "#475569", transform: isRtl ? "rotate(180deg)" : undefined }}>
                <RowsIconSvg />
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: isRtl ? "0.375rem 0 0.375rem 0.625rem" : "0.375rem 0.625rem 0.375rem 0" }}>
                <div className="tiptap max-w-none tiptap-compact" dir={isRtl ? "rtl" : undefined} style={translatedDirectionStyle} dangerouslySetInnerHTML={{ __html: isRtl ? isolateNumberRunsForRtl(para) : para }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={s.textPlain} style={singleColumnTextStyle}>
        {imageEl}
        {wrapBilingual(block.content, originalBlock?.content)}
      </div>
    );
  }

  if (hasHinweisBox) {
    const hinweisConfig = isHinweisAlarm
      ? { color: "#990033", bg: "#99003308", border: "#990033", icon: <Siren className="h-5 w-5" style={{ color: "#990033" }} /> }
      : isHinweisWichtig
      ? { color: "#0369a1", bg: "#0369a108", border: "#0369a1", icon: <BadgeAlert className="h-5 w-5" style={{ color: "#0369a1" }} /> }
      : isLernziel
      ? { color: "#166534", bg: "transparent", border: "#166534", icon: <Goal className="h-5 w-5" style={{ color: "#166534" }} /> }
      : { color: "#475569", bg: "#47556908", border: "#475569", icon: <ArrowRight className="h-5 w-5" style={{ color: "#475569" }} /> };

    // For alarm/wichtig in bilingual mode, render each language as a full hint box
    // so both columns include icon + block frame consistently.
    const useFullBilingualHintBoxes =
      isBilingual && !!originalBlock && (isHinweisWichtig || isHinweisAlarm);
    const bilingualHintIconStyle: React.CSSProperties | undefined =
      isBilingual ? { paddingLeft: "0.75rem", width: "2.1rem" } : undefined;

    if (useFullBilingualHintBoxes) {
      return renderBilingualGrid(
          <div
            className={s.hintBox}
            style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
          >
            <div className={s.hintIcon} style={bilingualHintIconStyle}>
              {hinweisConfig.icon}
            </div>
            <div className={s.hintBody}>
              {imageEl}
              {renderContent(originalBlock.content)}
            </div>
          </div>,
          <div
            className={s.hintBox}
            style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
          >
            <div className={s.hintIcon} style={bilingualHintIconStyle}>
              {hinweisConfig.icon}
            </div>
            <div className={s.hintBody}>
              {imageEl}
              <div className="tiptap-bilingual-translated" style={{ ...translatedFontStyle, ...translatedDirectionStyle }}>{renderContent(block.content)}</div>
            </div>
          </div>,
          undefined,
          { showDivider: showBilingualDivider }
      );
    }

    return (
      <div
        className={s.hintBox}
        style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
      >
        <div className={s.hintIcon} style={bilingualHintIconStyle}>
          {hinweisConfig.icon}
        </div>
        <div className={s.hintBody}>
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
      </div>
    );
  }

  const borderTextColor = isExampleStandard ? "#990033" : isExampleImproved ? "#3A4F40" : isExamplePrimary ? primaryColor : isExampleSecondary ? (accentColor || "#475569") : isFramePrimary ? primaryColor : isFrameSecondary ? (accentColor || "#475569") : "#475569";

  if (hasFrameBox) {
    return (
      <div>
        <div
          className={s.frameBox}
          style={{
            "--block-color": borderTextColor,
            "--example-radius": mode === "online" ? "5px" : "4px",
            fontFamily: resolvedContentFont,
            ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
          } as React.CSSProperties}
        >
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
        {block.comment && (
          <div className={s.commentBox} style={{ "--block-color": borderTextColor, fontFamily: resolvedContentFont, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) } as React.CSSProperties}>
            {renderDeMarkers(block.comment, deMarkerColor)}
          </div>
        )}
      </div>
    );
  }

  if (isExample || isExamplePrimary || isExampleSecondary) {
    return (
      <div>
        <div
          className={s.exampleBox}
          style={{
            "--block-color": borderTextColor,
            "--example-radius": mode === "online" ? "5px" : "4px",
            fontFamily: resolvedContentFont,
            ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
          } as React.CSSProperties}
        >
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
        {block.comment && (
          <div className={s.commentBox} style={{ "--block-color": borderTextColor, fontFamily: resolvedContentFont, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) } as React.CSSProperties}>
            {renderDeMarkers(block.comment, deMarkerColor)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`${s.exampleSplit} ${isExampleStandard ? s.exampleSplitStandard : s.exampleSplitImproved}`}
        style={{
          "--block-color": borderTextColor,
          "--example-radius": mode === "online" ? "5px" : "4px",
          "--example-icon-width": mode === "online" ? "2rem" : "2.5rem",
          fontFamily: resolvedContentFont,
          ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
        } as React.CSSProperties}
      >
        <div className={s.exampleSplitIcon} aria-hidden="true">
          {isExampleStandard ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
        </div>
        <div className={s.exampleSplitBody}>
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
      </div>
      {block.comment && (
        <div className={s.commentBox} style={{ "--block-color": borderTextColor, fontFamily: resolvedContentFont, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) } as React.CSSProperties}>
          {renderDeMarkers(block.comment, deMarkerColor)}
        </div>
      )}
    </div>
  );
}

function SyllablesView({ block, mode, instructionIndex, accentColor }: { block: SyllablesBlock; mode?: ViewMode; instructionIndex?: number; accentColor?: string | null }) {
  return (
    <div>
      {block.instruction && (
        <>
          <InstructionRow
            instruction={block.instruction}
            accentColor={accentColor}
            mode={mode}
            instructionIndex={instructionIndex}
          />
          {block.content && <SectionGap size="small" />}
        </>
      )}
      <div className="text-left text-slate-900">
        <SyllablesDisplay content={block.content} textClassName="text-inherit" />
      </div>
    </div>
  );
}

// ─── Email Skeleton View ─────────────────────────────────────
function EmailSkeletonView({ block }: { block: EmailSkeletonBlock }) {
  const t = useTranslations("blockRenderer");

  const attachments = block.attachments ?? [];
  const style = block.emailStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#475569" : undefined;
  const pillColor = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className={`py-1 text-xs font-semibold text-white rounded-t-sm text-center uppercase flex items-center justify-center ${s.pill}`}
            style={{ "--block-color": pillColor } as React.CSSProperties}
          >
            {style === "standard" ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={{ borderColor: isStyled ? color : "#475569" }}
      >
        <div className={s.emailMeta}>
          <div className={s.emailMetaRow}>
            <div className={s.emailMetaLabel}>{t("emailTo")}</div>
            <div className={s.emailMetaValue}>{block.to}</div>
          </div>
          <div className={s.emailMetaRow}>
            <div className={s.emailMetaLabel}>{t("emailSubject")}</div>
            <div className={s.emailMetaValue}>{block.subject}</div>
          </div>
        </div>

        <div className={s.emailBody}>
          <div className="tiptap max-w-none" dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(block.body) }} />
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {att.name}
              </div>
            ))}
          </div>
        )}
      </div>
      {isStyled && block.comment && (
        <div className={s.commentBox} style={{ "--block-color": color } as React.CSSProperties}>{renderDeMarkers(block.comment)}</div>
      )}
    </div>
  );
}

// ─── Job Application View ────────────────────────────────────
function JobApplicationView({ block }: { block: JobApplicationBlock }) {
  const t = useTranslations("blockRenderer");

  const style = block.applicationStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className={`py-1 text-xs font-semibold text-white rounded-t-sm text-center uppercase flex items-center justify-center ${s.pill}`}
            style={{ "--block-color": color } as React.CSSProperties}
          >
            {style === "standard" ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white ${s.blockShadow} ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={{ borderColor: isStyled ? color : "#475569" }}
      >
        {/* Form header — icon only, same style as email toolbar */}
        <div
          className={`flex items-center gap-2 px-4 py-2 border-b ${isStyled ? "" : "bg-slate-50 border-slate-200"}`}
          style={isStyled ? { backgroundColor: `${color}0D`, borderColor: `${color}4D` } : undefined}
        >
          <FormInput className={`h-4 w-4 ${isStyled ? s.emailIcon : ""}`} style={isStyled ? { "--block-color": color } as React.CSSProperties : undefined} />
        </div>

        {/* Form fields */}
        <div className="email-skeleton-fields px-4 pt-3 pb-4 space-y-1.5">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobPosition")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 flex items-center justify-between">
              <span>{block.position}</span>
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobFirstName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.firstName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobLastName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.applicantName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobEmail")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.email}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobPhone")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.phone}</div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 pt-1.5">{t("jobMessage")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="tiptap max-w-none" dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(block.message) }} />
            </div>
          </div>
        </div>
      </div>
      {isStyled && block.comment && (
        <div className={s.commentBox} style={{ "--block-color": color } as React.CSSProperties}>{renderDeMarkers(block.comment)}</div>
      )}
    </div>
  );
}

/** Split Tiptap HTML into items on snippet separators.
 * Accepts both explicit <hr data-snippet-break> and legacy/plain <hr>.
 */
function splitSnippetItems(html: string): string[] {
  const parts = html.split(/<hr(?:\s[^>]*)?>/gi);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function TextSnippetView({ block, mode }: { block: TextSnippetBlock; mode: ViewMode }) {
  const t = useTranslations("viewer");
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const isPrint = mode === "print";

  const deItems = splitSnippetItems(block.content);
  const trItems = block.translatedContent
    ? splitSnippetItems(block.translatedContent)
    : [];
  const showBilingual = !!block.bilingual && !!block.translatedContent;
  const count = showBilingual
    ? Math.max(deItems.length, trItems.length)
    : deItems.length;

  const handleCopy = async (html: string, index: number) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  if (showBilingual) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => {
          const deHtml = deItems[i] ?? "";
          const trHtml = trItems[i] ?? "";
          return (
            <div key={i} className="snippet-item-row grid grid-cols-2 gap-4 items-stretch">
              <div className={`snippet-item-card relative flex flex-col border border-slate-200 rounded-sm px-4 py-1.5 bg-slate-50/50 ${s.snippetCard}`}>
                <div
                  className={`tiptap max-w-none flex-1 ${s.tiptapFlush} ${!isPrint ? "pr-6" : ""}`}
                  dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(deHtml) }}
                />
                {!isPrint && (
                  <button
                    type="button"
                    onClick={() => handleCopy(deHtml, i)}
                    className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={t("copyToClipboard")}
                  >
                    {copiedIndex === i ? (
                      <ClipboardCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <div className={`snippet-item-card flex flex-col border border-slate-200 rounded-sm px-4 py-1.5 bg-white ${s.snippetCard}`}>
                <div
                  className={`tiptap max-w-none flex-1 ${s.tiptapFlush}`}
                  dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(trHtml) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deItems.map((html, i) => (
        <div
          key={i}
          className={`snippet-item-card relative flex flex-col border border-slate-200 rounded-sm px-4 py-1.5 bg-slate-50/50 ${!isPrint ? "group hover:bg-slate-50 transition-colors" : ""} ${s.snippetCard}`}
        >
          <div
            className={`tiptap max-w-none flex-1 ${s.tiptapFlush} ${!isPrint ? "pr-6" : ""}`}
            dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(html) }}
          />
          {!isPrint && (
            <button
              type="button"
              onClick={() => handleCopy(html, i)}
              className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
              title={t("copyToClipboard")}
            >
              {copiedIndex === i ? (
                <ClipboardCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ImageView({ block }: { block: ImageBlock }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (!block.src) return null;
  const isExample = block.imageStyle === "example";
  return (
    <>
      <figure className={isExample ? `border border-dashed rounded-sm p-3 ${s.styledBorder}` : undefined}
        style={isExample ? { "--block-color": "#475569" } as React.CSSProperties : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.src}
          alt={block.alt}
          className="max-w-full rounded-sm mx-auto block cursor-zoom-in"
          style={{
            ...(block.width ? { width: block.width } : {}),
            ...(block.height ? { height: block.height, objectFit: "contain" as const } : {}),
          }}
          onClick={() => setLightboxOpen(true)}
        />
        {block.caption && (
          <figcaption className="text-muted-foreground mt-1 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
      {lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            className="max-w-[90vw] max-h-[90vh] rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}

function ImageCardsView({ block }: { block: ImageCardsBlock }) {
  // Shuffle word bank items for display (memoized to maintain consistency)
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items.filter((item) => item.text),
      `image-cards:${block.id}`
    );
  }, [block.id, block.items, block.showWordBank]);

  return (
    <div className="space-y-3">
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
              <span key={item.id} className="px-2 py-0.5 bg-background rounded border text-cv-sm">
                {item.text}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {block.items.map((item) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          return (
          <div key={item.id} className="border rounded overflow-hidden bg-card image-card-row">
            {item.src && (
              <div 
                className="overflow-hidden relative mx-auto"
                style={{ 
                  width: `${block.imageScale ?? 100}%`,
                  aspectRatio: `${arW} / ${arH}` 
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center"}>
              {block.showWritingLines ? (
                <div className="space-y-0.5 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                  ))}
                </div>
              ) : (
                item.text && <span>{item.text}</span>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

function ImageTextTableView({ block, accentColor, mode, instructionIndex, showSolutions }: { block: ImageTextTableBlock; accentColor?: string | null; mode?: ViewMode; instructionIndex?: number; showSolutions?: boolean; }) {
  const exampleItemId = block.showFirstAsExample ? block.items[0]?.id : undefined;
  const interactive = mode === "online";
  const displayItems = useMemo(
    () => (block.shuffleItems
      ? deterministicShuffle(
          block.items.map((item, index) => ({ item, originalIndex: index })),
          `image-text-table:${block.id}`,
        )
      : block.items.map((item, index) => ({ item, originalIndex: index }))),
    [block.id, block.items, block.shuffleItems],
  );
  return (
    <div className="space-y-4">
      {block.instruction && (
        <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {displayItems.map(({ item, originalIndex }) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          return (
            <div key={item.id} className="border rounded overflow-hidden bg-card image-text-table-card">
              {item.src && (
                <div
                  className="overflow-hidden relative mx-auto"
                  style={{
                    width: `${block.imageScale ?? 100}%`,
                    aspectRatio: `${arW} / ${arH}`,
                  }}
                >
                  {block.showImageNumberBadge !== false && (
                    <span className="absolute left-0 top-0 z-10 grid h-5 w-5 place-items-center rounded-none rounded-br-md border-r border-b border-border bg-background text-[10px] font-semibold leading-none text-foreground">
                      {originalIndex + 1}
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-1 text-center">
                {item.text && (
                  item.id === exampleItemId ? (
                    <span style={{ color: "#0097dc" }}>
                      <RoughExampleStrike>{item.text}</RoughExampleStrike>
                    </span>
                  ) : (
                    <span>{item.text}</span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className={block.twoWritingColumns ? "grid grid-cols-2 gap-x-4 gap-y-2" : "space-y-2"}>
        {block.items.map((item, index) => (
          <div key={item.id} className="image-text-table-row grid grid-cols-[auto_1fr] gap-2 items-end">
            <span className="text-cv-base font-medium text-muted-foreground">{index + 1}.</span>
            {item.id === exampleItemId ? (
              <div
                className="relative h-8 overflow-hidden"
                style={{ borderBottom: "1px dashed var(--color-muted-foreground)" }}
              >
                <span
                  className="absolute inset-x-0 block leading-none"
                  style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#0097dc", fontSize: "18px" }}
                >
                  {item.text || ""}
                </span>
              </div>
            ) : !interactive && showSolutions && item.text ? (
              <div
                className="relative h-8 overflow-hidden"
                style={{ borderBottom: "1px dashed var(--color-muted-foreground)" }}
              >
                <span
                  className="absolute inset-x-0 block leading-none"
                  style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#15803d", fontSize: "18px" }}
                >
                  {item.text}
                </span>
              </div>
            ) : (
              <div
                className="relative h-8 overflow-hidden"
                style={{ borderBottom: "1px dashed var(--color-muted-foreground)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TextCardsView({ block }: { block: TextCardsBlock }) {
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items.filter((item) => item.text),
      `text-cards:${block.id}`
    );
  }, [block.id, block.items, block.showWordBank]);

  const sizeClasses: Record<string, string> = {
    xs: "text-cv-xs",
    sm: "text-cv-sm",
    base: "text-cv-base",
    lg: "text-cv-lg",
    xl: "text-cv-xl",
    "2xl": "text-cv-2xl",
  };

  const alignClasses: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="space-y-3">
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
              <span key={item.id} className="px-2 py-0.5 bg-background rounded border text-cv-sm">
                {item.caption}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {block.items.map((item) => (
          <div key={item.id} className={`${block.showBorder ? "border rounded" : ""} overflow-hidden bg-card text-card-row`}>
            <div className={`p-3 ${sizeClasses[block.textSize ?? "base"]} ${alignClasses[block.textAlign ?? "center"]} ${block.textBold ? "font-bold" : ""} ${block.textItalic ? "italic" : ""}`}>
              {item.text && <span>{item.text}</span>}
            </div>
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center"}>
              {block.showWritingLines ? (
                <div className="space-y-0 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                  ))}
                </div>
              ) : (
                item.caption && <span>{item.caption}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpacerView({ block }: { block: SpacerBlock }) {
  return <div style={{ height: block.height }} />;
}

function DividerView({ block }: { block: DividerBlock }) {
  return <hr style={{ borderStyle: block.style }} />;
}

function LogoDividerView({ block, brand = "edoomio" }: { block: LogoDividerBlock; brand?: Brand }) {
  const logoSrc = BRAND_ICON_LOGOS[brand];
  return (
    <div className="flex items-center justify-center py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        style={{ width: 24, height: 24 }}
        className="opacity-30"
      />
    </div>
  );
}

function PageBreakView({ block: _block }: { block: PageBreakBlock }) {
  return <div style={{ breakAfter: "page", pageBreakAfter: "always" }} />;
}

function WritingLinesView({ block }: { block: WritingLinesBlock }) {
  return (
    <div>
      {Array.from({ length: block.lineCount }).map((_, i) => (
        <div
          key={i}
          style={{ height: block.lineSpacing, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }}
        />
      ))}
    </div>
  );
}

function WritingRowsView({ block }: { block: WritingRowsBlock }) {
  return (
    <div>
      {Array.from({ length: block.rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex items-center border-b last:border-b-0"
          style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
        >
          <ItemNumberBadge index={i + 1} />
          <div className="flex-1" style={{ height: 24, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Interactive blocks ─────────────────────────────────────

 function MultipleChoiceView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  accentColor,
  showSolutions = false,
  interactiveColor,
  instructionIndex,
}: {
  block: MultipleChoiceBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
})  {
  const t = useTranslations("viewer");
  const selected = (answer as string[] | undefined) || [];
  const instructionText = (block.instruction || "").trim() || (block.allowMultiple ? "Choose the correct answers." : "Choose the correct answer.");
  const isOnline = mode === "online";
  const isMCQAnswered = isOnline && selected.length > 0;
  const effectiveShowResults = showResults || isMCQAnswered;

  const handleSelect = (optId: string) => {
    if (!interactive) return;
    if (block.allowMultiple) {
      const next = selected.includes(optId)
        ? selected.filter((id) => id !== optId)
        : [...selected, optId];
      onAnswer(next);
    } else {
      onAnswer([optId]);
    }
  };

  return (
    <div>
      {isOnline ? (
        <div
          className={CONSISTENT_INSTRUCTION_ROW_CLASS}
          style={{ color: accentColor || "var(--color-primary)" }}
        >
          <InstructionBadge instructionIndex={instructionIndex} />
          <p className="min-w-0 flex-1">{instructionText}</p>
        </div>
      ) : (
        <InstructionRow instruction={instructionText} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
      )}
      <div className="flex min-h-[49px] items-center font-medium text-foreground">
        {block.question}
      </div>
      <div className="flex flex-col gap-2">
        {block.options.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          const isCorrect = opt.isCorrect;

          let rowClass = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;

          if (effectiveShowResults) {
            if (isCorrect) {
              rowClass += " bg-green-50";
            } else if (isSelected && !isCorrect) {
              rowClass += " bg-red-50";
            }
          }

          const indicatorClass = !isSelected
            ? CONTROL_BOX_CLASS
            : effectiveShowResults && !isCorrect
              ? `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`
              : interactive && !effectiveShowResults
                ? `${CONTROL_BOX_CLASS} ${s.controlBoxActive}`
                : CONTROL_BOX_FILLED_CLASS;

          const isMobileButton = isOnline;
          const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
          let bgColor = isOnline ? `${resolvedInteractiveColor}15` : undefined;

          if (effectiveShowResults && isOnline) {
            if (isCorrect) {
              bgColor = "#dcfce7";
            } else if (isSelected && !isCorrect) {
              bgColor = "#fee2e2";
            }
          }

          const containerClass = isMobileButton
            ? `flex min-h-auto flex-row items-center gap-3 px-4 py-2 rounded-sm`
            : `${rowClass} ${interactive && !effectiveShowResults ? "cursor-pointer" : ""}`.trim();
          const containerStyle = isMobileButton && isOnline
            ? { backgroundColor: bgColor }
            : undefined;

          return (
            <div
              key={opt.id}
              className={containerClass}
              style={containerStyle}
              onClick={() => handleSelect(opt.id)}
              role={interactive ? "button" : undefined}
              tabIndex={interactive && !effectiveShowResults ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(opt.id);
                }
              }}
            >
              <span className="hidden md:block">
                <ItemNumberBadge index={i + 1} className="shrink-0" />
              </span>
              {!isOnline && (
                showSolutions && isCorrect && !interactive ? (
                  <div className={CONTROL_BOX_FILLED_CLASS} />
                ) : (
                  <div className={indicatorClass} />
                )
              )}
              <span className={`flex-1${showSolutions && isCorrect ? ' text-green-800 font-semibold' : ''}`}>{opt.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FillInBlankView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: FillInBlankBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const tb = useTranslations("blockRenderer");
  const blanks = (answer as Record<string, string> | undefined) || {};
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const isOnline = mode === "online";
  const parts = block.content.split(/(\{\{blank\*?(?::[^}]*)?\}\}|\{\{(?:[^|*}]*\|)?\*[^}]*\}\})/g);
  let blankIndex = 0;

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      <div className="leading-loose mt-3">
      {parts.map((part, i) => {
        const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
        if (match) {
          const noSpace = match[1] === '*';
          const raw = match[2] || "";
          const { answer: correctAnswer, width } = parseBlankContent(raw);
          const key = `blank-${blankIndex}`;
          blankIndex++;
          const userValue = blanks[key] || "";
          const hasAnswer = correctAnswer !== "";
          const isCorrectAnswer =
            showResults && hasAnswer && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
          const isWrong = showResults && hasAnswer && userValue.trim() !== "" && !isCorrectAnswer;
          const widthStyle = getBlankWidthStyle(width, false);
          const spacingClass = noSpace ? '' : 'mx-1';

          if (interactive) {
            return (
              <span key={i} className={`inline-block relative ${spacingClass}`} style={{ verticalAlign: 'middle' }}>
                <input
                  type="text"
                  value={userValue}
                  disabled={showResults}
                  onChange={(e) =>
                    onAnswer({ ...blanks, [key]: e.target.value })
                  }
                  className={`h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none inline transition-colors
                    ${showResults
                      ? isCorrectAnswer
                        ? "bg-green-50 text-green-700"
                        : isWrong
                          ? "bg-red-50 text-red-700"
                          : ""
                      : ""}`}
                  style={{
                    ...getBlankWidthStyle(width, true),
                    ...(!showResults ? {
                      backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10),
                    } : {}),
                  }}
                />
                {showResults && isWrong && (
                  <span className="block text-cv-xs text-green-600 text-center mt-0.5">
                    {correctAnswer}
                  </span>
                )}
              </span>
            );
          }
          if (showSolutions && hasAnswer) {
            return (
              <span
                key={i}
                className={`bg-green-100 text-green-800 font-semibold px-2 ${spacingClass}`}
                style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 4 }}
              >
                {correctAnswer}
              </span>
            );
          }
          return (
            <span
              key={i}
              className={`bg-gray-100 px-2 ${spacingClass}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'text-bottom',
                borderRadius: 4,
                ...(width.characterWidth !== null
                  ? widthStyle
                  : {
                      height: '1.3em',
                      ...(width.widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * width.widthMultiplier}px` }),
                    }),
              }}
            >
              <span className="text-muted-foreground" style={{ fontSize: '0.65em' }}>
                {String(blankIndex).padStart(2, "0")}
              </span>
            </span>
          );
        }
        // New-style blank: {{prefix|*answer|suffix}} or {{*answer}} or {{prefix|*answer}} or {{*answer|suffix}}
        const newMatch = part.match(/\{\{([^|*}]*\|)?\*([^|},]*)(?:,([\d.]+))?(?:\|([^}]*))?\}\}/);
        if (newMatch) {
          const prefix = newMatch[1] ? newMatch[1].slice(0, -1) : "";
          const correctAnswer = newMatch[2].trim();
          const widthMultiplier = newMatch[3] ? Number(newMatch[3]) : 1;
          const suffix = newMatch[4] ?? "";
          const key = `blank-${blankIndex}`;
          blankIndex++;
          const userValue = blanks[key] || "";
          const hasAnswer = correctAnswer !== "";
          const isCorrectAnswer =
            showResults && hasAnswer && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
          const isWrong = showResults && hasAnswer && userValue.trim() !== "" && !isCorrectAnswer;

          // Border radius helpers
          const inputRadius = `${prefix ? "0" : "4px"} ${suffix ? "0" : "4px"} ${suffix ? "0" : "4px"} ${prefix ? "0" : "4px"}`;
          const inputTextAlign: React.CSSProperties['textAlign'] = prefix && suffix ? 'center' : suffix ? 'right' : 'left';
          const makePrefixStyle = (): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', alignSelf: 'stretch', background: '#f3f4f6', borderRadius: '4px 0 0 4px', padding: '0 6px', whiteSpace: 'nowrap' });
          const makeSuffixStyle = (): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', alignSelf: 'stretch', background: '#f3f4f6', borderRadius: '0 4px 4px 0', padding: '0 6px', whiteSpace: 'nowrap' });

          if (interactive) {
            return (
              <span key={i} className="inline-flex items-stretch mx-1 relative h-8" style={{ verticalAlign: 'middle' }}>
                {prefix && <span style={makePrefixStyle()}>{prefix}</span>}
                <input
                  type="text"
                  value={userValue}
                  disabled={showResults}
                  onChange={(e) => onAnswer({ ...blanks, [key]: e.target.value })}
                  className={`h-8 bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors
                    ${showResults
                      ? isCorrectAnswer
                        ? "bg-green-50 text-green-700"
                        : isWrong
                          ? "bg-red-50 text-red-700"
                          : ""
                      : ""}`}
                  style={{
                    borderRadius: inputRadius,
                    textAlign: inputTextAlign,
                    ...(widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }),
                    ...(!showResults ? { backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10) } : {}),
                  }}
                />
                {showResults && isWrong && (
                  <span className="absolute left-0 right-0 top-full text-cv-xs text-green-600 text-center mt-0.5">
                    {correctAnswer}
                  </span>
                )}
                {suffix && <span style={makeSuffixStyle()}>{suffix}</span>}
              </span>
            );
          }
          if (showSolutions && hasAnswer) {
            return (
              <span key={i} className="inline-flex items-stretch mx-1" style={{ verticalAlign: 'middle' }}>
                {prefix && <span style={makePrefixStyle()}>{prefix}</span>}
                <span
                  className="bg-green-100 text-green-800 font-semibold px-2"
                  style={{ display: 'inline-flex', alignItems: 'center', height: '1.3em', borderRadius: inputRadius }}
                >
                  {correctAnswer}
                </span>
                {suffix && <span style={makeSuffixStyle()}>{suffix}</span>}
              </span>
            );
          }
          return (
            <span key={i} className="inline-flex items-stretch mx-1" style={{ verticalAlign: 'middle' }}>
              {prefix && <span style={makePrefixStyle()}>{prefix}</span>}
              <span
                className="bg-gray-100 px-2"
                style={{ display: 'inline-flex', alignItems: 'center', height: '1.3em', borderRadius: inputRadius, ...(widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * widthMultiplier}px` }) }}
              >
                <span className="text-muted-foreground" style={{ fontSize: '0.65em' }}>
                  {String(blankIndex).padStart(2, "0")}
                </span>
              </span>
              {suffix && <span style={makeSuffixStyle()}>{suffix}</span>}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
      </div>
    </div>
  );
}

function FillInBlankItemsView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: FillInBlankItemsBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const tb = useTranslations("blockRenderer");
  const blanks = (answer as Record<string, string> | undefined) || {};
  const isPrint = mode === "print";
  const instructionText = (block.instruction || "").trim() || "Complete the sentences.";
  const isOnline = mode === "online";
  const ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
  const exampleAnswers = useMemo(() => {
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.content.matchAll(/\{\{blank\*?:([^,}]+)/g)) {
      const value = match[1]?.trim();
      if (value) answers.add(value);
    }
    return answers;
  }, [exampleItem]);

  // Extract answers for word bank
  const wordBankAnswers = useMemo(() => {
    if (!block.showWordBank) return [];
    const answers: string[] = [];
    for (const item of block.items) {
      const matches = item.content.matchAll(/\{\{blank\*?:([^,}]+)/g);
      for (const m of matches) if (m[1].trim()) answers.push(m[1].trim());
    }
    // Shuffle based on block id (deterministic)
    const arr = [...answers];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.showWordBank, block.id]);

  return (
    <div>
      {isOnline ? (
        <div
          className={CONSISTENT_INSTRUCTION_ROW_CLASS}
          style={{ color: accentColor || "var(--color-primary)" }}
        >
          <InstructionBadge instructionIndex={instructionIndex} />
          <p className="min-w-0 flex-1">{instructionText}</p>
        </div>
      ) : (
        <InstructionRow instruction={instructionText} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
      )}
      {((block.showWordBank && wordBankAnswers.length > 0) || block.items.length > 0) && <SectionGap size="medium" />}
      {block.showWordBank && wordBankAnswers.length > 0 && (
        <div className={CONSISTENT_ITEM_BANK_CLASS}>
          {wordBankAnswers.map((word, i) => (
            <span
              key={i}
              className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} bg-background`}
              style={undefined}
            >
              {exampleAnswers.has(word) ? <RoughExampleStrike>{word}</RoughExampleStrike> : word}
            </span>
          ))}
        </div>
      )}
      {block.items.map((item, idx) => {
        const parts = item.content.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);
        let blankInItem = 0;
        const isExampleItem = item.id === exampleItem?.id;

        return (
          <div
            key={item.id || idx}
            className={ROW_CLASS}
          >
            <ItemNumberBadge index={idx + 1} className="shrink-0" />
            <span className="flex-1 flex flex-wrap items-center leading-5">
              {parts.map((part, i) => {
                const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
                if (match) {
                  const noSpace = match[1] === '*';
                  const raw = match[2] || "";
                  const { answer: correctAnswer, width } = parseBlankContent(raw);
                  const key = `blank-${idx}-${blankInItem}`;
                  blankInItem++;
                  const userValue = blanks[key] || "";
                  const hasAnswer = correctAnswer !== "";
                  const isCorrectAnswer =
                    showResults && hasAnswer && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
                  const isWrong = showResults && hasAnswer && userValue.trim() !== "" && !isCorrectAnswer;
                  const widthStyle = getBlankWidthStyle(width, false);
                  const spacingClass = noSpace ? '' : 'mx-1';
                  const blankShellStyle: React.CSSProperties = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    verticalAlign: 'middle',
                    position: 'relative',
                    borderRadius: 3,
                    backgroundColor: 'rgb(243 244 246)',
                    lineHeight: '1.25rem',
                    minHeight: '1.25rem',
                    ...(width.characterWidth !== null
                      ? widthStyle
                      : {
                          ...(width.widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * width.widthMultiplier}px` }),
                        }),
                  };

                  if (hasAnswer && (isExampleItem || showSolutions)) {
                    return (
                      <span
                        key={i}
                        className={spacingClass}
                        style={blankShellStyle}
                      >
                        <span aria-hidden="true">&nbsp;</span>
                        <span
                          className="absolute inset-x-0 bottom-0 block text-center leading-none"
                          style={{
                            fontFamily: EXAMPLE_HANDWRITING_FONT,
                            color: isExampleItem ? '#0097dc' : '#15803d',
                            fontSize: '18px',
                          }}
                        >
                          {correctAnswer}
                        </span>
                      </span>
                    );
                  }

                  if (interactive) {
                    return (
                      <span key={i} className={`inline-block relative ${spacingClass}`}>
                        <input
                          type="text"
                          value={userValue}
                          disabled={showResults}
                          onChange={(e) =>
                            onAnswer({ ...blanks, [key]: e.target.value })
                          }
                          className={`h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none inline transition-colors
                            ${showResults
                              ? isCorrectAnswer
                                ? "bg-green-50 text-green-700"
                                : isWrong
                                  ? "bg-red-50 text-red-700"
                                  : ""
                              : ""}`}
                          style={{
                            ...getBlankWidthStyle(width, true),
                            ...(!showResults ? { backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)" } : {}),
                          }}
                        />
                        {showResults && isWrong && hasAnswer && (
                          <span className="block text-cv-xs text-green-600 text-center mt-0.5">
                            {correctAnswer}
                          </span>
                        )}
                      </span>
                    );
                  }
                  if (showSolutions && hasAnswer) {
                    return null;
                  }
                  return (
                    <span
                      key={i}
                      className={`bg-gray-100 ${spacingClass}`}
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        borderRadius: 3,
                        ...(width.characterWidth !== null
                          ? widthStyle
                          : {
                              lineHeight: '1.25rem',
                              minHeight: '1.25rem',
                              ...(width.widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * width.widthMultiplier}px` }),
                            }),
                      }}
                    >
                      &nbsp;
                    </span>
                  );
                }
                return <span key={i}>{renderTextWithSup(part)}</span>;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

 function MatchingView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: MatchingBlock | PronunciationBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const t = useTranslations("viewer");
  const itemNumberFormat = React.useContext(ItemNumberFormatContext);
  const usePlainTextRightLabels = itemNumberFormat === "numbers-with-period";
  const isOnline = mode === "online";
  const isPronunciation = block.type === "pronunciation";
  const headerRowClass = `${isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT} font-semibold text-foreground`;
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);
  const lineContainerRef = React.useRef<HTMLDivElement | null>(null);
  const leftSolutionBoxRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const rightSolutionBoxRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [solutionLines, setSolutionLines] = React.useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const [exampleLine, setExampleLine] = React.useState<null | { x1: number; y1: number; x2: number; y2: number }>(null);
  const [solutionSvgSize, setSolutionSvgSize] = React.useState({ width: 0, height: 0 });
  const examplePairId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
  const orderedPairs = useMemo(() => {
    const examplePair = examplePairId ? block.pairs.find((pair) => pair.id === examplePairId) : undefined;
    const remainingPairs = block.pairs.filter((pair) => pair.id !== examplePairId);
    const orderedRemainingPairs = block.pairOrder
      ? block.pairOrder
          .map((id) => remainingPairs.find((pair) => pair.id === id))
          .filter((pair): pair is NonNullable<typeof pair> => !!pair)
          .concat(remainingPairs.filter((pair) => !block.pairOrder!.includes(pair.id)))
      : remainingPairs;

    return examplePair ? [examplePair, ...orderedRemainingPairs] : orderedRemainingPairs;
  }, [block.pairOrder, block.pairs, examplePairId]);

  // Stable derangement based on block id so matches never stay on the same row.
  const shuffledRight = useMemo(() => {
    return deterministicDerangement(orderedPairs, `matching:${block.id}`);
  }, [orderedPairs, block.id]);
  const wordBankItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.pairs
        .map((pair) => ({
          id: pair.id,
          text: `${pair.left.trim()}${pair.right.trim()}`,
        }))
        .filter((item) => item.text),
      `matching-wordbank:${block.id}`
    );
  }, [block.pairs, block.showWordBank, block.id]);

  const selections = useMemo<Record<string, string>>(
    () => (answer as Record<string, string> | undefined) || {},
    [answer]
  );

  // Reverse map: rightId → leftId
  const rightToLeft = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [leftId, rightId] of Object.entries(selections)) {
      map[rightId] = leftId;
    }
    return map;
  }, [selections]);

  const handleLeftClick = (leftId: string) => {
    if (!interactive) return;
    if (activeLeftId === leftId) {
      setActiveLeftId(null); // deselect
    } else {
      setActiveLeftId(leftId);
    }
  };

  const handleRightClick = (rightId: string) => {
    if (!interactive || !activeLeftId) return;
    // If this right item was already matched to another left, clear that
    const newSelections = { ...selections };
    for (const [lId, rId] of Object.entries(newSelections)) {
      if (rId === rightId) delete newSelections[lId];
    }
    newSelections[activeLeftId] = rightId;
    setActiveLeftId(null);
    onAnswer(newSelections);
  };

  const getCenterRelativeToContainer = (element: HTMLElement, container: HTMLElement) => {
    let left = element.offsetLeft;
    let top = element.offsetTop;
    let current = element.offsetParent;

    while (current && current instanceof HTMLElement && current !== container) {
      left += current.offsetLeft;
      top += current.offsetTop;
      current = current.offsetParent;
    }

    return {
      x: left + element.offsetWidth / 2,
      y: top + element.offsetHeight / 2,
    };
  };

  React.useLayoutEffect(() => {
    if (interactive || (!showSolutions && !examplePairId)) {
      setSolutionLines([]);
      setExampleLine(null);
      setSolutionSvgSize({ width: 0, height: 0 });
      return;
    }

    const container = lineContainerRef.current;
    if (!container) return;

    const measure = () => {
      setSolutionSvgSize({ width: container.offsetWidth, height: container.offsetHeight });

      if (examplePairId) {
        const leftBox = leftSolutionBoxRefs.current[examplePairId];
        const rightBox = rightSolutionBoxRefs.current[examplePairId];
        if (leftBox && rightBox) {
          const leftCenter = getCenterRelativeToContainer(leftBox, container);
          const rightCenter = getCenterRelativeToContainer(rightBox, container);
          setExampleLine({
            x1: leftCenter.x,
            y1: leftCenter.y,
            x2: rightCenter.x,
            y2: rightCenter.y,
          });
        } else {
          setExampleLine(null);
        }
      } else {
        setExampleLine(null);
      }

      const nextLines = orderedPairs.flatMap((pair) => {
        if (pair.id === examplePairId) return [];
        const leftBox = leftSolutionBoxRefs.current[pair.id];
        const rightBox = rightSolutionBoxRefs.current[pair.id];
        if (!leftBox || !rightBox) return [];

        const leftCenter = getCenterRelativeToContainer(leftBox, container);
        const rightCenter = getCenterRelativeToContainer(rightBox, container);

        return [{
          x1: leftCenter.x,
          y1: leftCenter.y,
          x2: rightCenter.x,
          y2: rightCenter.y,
        }];
      });

      setSolutionLines(nextLines);
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [orderedPairs, interactive, showSolutions, shuffledRight, examplePairId]);

  // ── Print / non-interactive mode: row-based layout like T/F and Order ──
  if (!interactive) {
    return (
      <div>
        {block.instruction && (
          <>
            {isOnline ? (
              <div
                className={CONSISTENT_INSTRUCTION_ROW_CLASS}
                style={{ color: accentColor || "var(--color-primary)" }}
              >
                <InstructionBadge instructionIndex={instructionIndex} />
                <p className="min-w-0 flex-1">{block.instruction}</p>
              </div>
            ) : (
              <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
            )}
            {(block.textAboveItems?.trim() || orderedPairs.length > 0) && <SectionGap size="large" />}
          </>
        )}
        {block.textAboveItems?.trim() && (
          <>
            <p className="whitespace-pre-line text-sm">{block.textAboveItems}</p>
            {orderedPairs.length > 0 && <SectionGap size="medium" />}
          </>
        )}
        {block.showWordBank && wordBankItems.length > 0 && (
          <>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {wordBankItems.map((item) => (
                <span
                  key={item.id}
                  className="rounded border px-2 py-0.5"
                  style={undefined}
                >
                  {item.id === examplePairId ? <RoughExampleStrike>{item.text}</RoughExampleStrike> : item.text}
                </span>
              ))}
            </div>
            {orderedPairs.length > 0 && <SectionGap size="medium" />}
          </>
        )}
        <div ref={lineContainerRef} className="relative">
          {(showSolutions || examplePairId) && solutionSvgSize.width > 0 && solutionSvgSize.height > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
              width={solutionSvgSize.width}
              height={solutionSvgSize.height}
              viewBox={`0 0 ${solutionSvgSize.width} ${solutionSvgSize.height}`}
              preserveAspectRatio="none"
            >
              <RoughSvgPaths
                paths={[
                  ...(exampleLine ? [{
                    d: `M ${exampleLine.x1} ${exampleLine.y1} C ${exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.35} ${exampleLine.y1}, ${exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.65} ${exampleLine.y2}, ${exampleLine.x2} ${exampleLine.y2}`,
                    points: sampleCubicBezierPoints(
                      { x: exampleLine.x1, y: exampleLine.y1 },
                      { x: exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.35, y: exampleLine.y1 },
                      { x: exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.65, y: exampleLine.y2 },
                      { x: exampleLine.x2, y: exampleLine.y2 },
                    ),
                    stroke: "#0097dc",
                    strokeWidth: 2,
                  }] : []),
                  ...solutionLines.map((line) => ({
                    d: `M ${line.x1} ${line.y1} C ${line.x1 + (line.x2 - line.x1) * 0.35} ${line.y1}, ${line.x1 + (line.x2 - line.x1) * 0.65} ${line.y2}, ${line.x2} ${line.y2}`,
                    points: sampleCubicBezierPoints(
                      { x: line.x1, y: line.y1 },
                      { x: line.x1 + (line.x2 - line.x1) * 0.35, y: line.y1 },
                      { x: line.x1 + (line.x2 - line.x1) * 0.65, y: line.y2 },
                      { x: line.x2, y: line.y2 },
                    ),
                    stroke: "#15803d",
                    strokeWidth: 1.5,
                  })),
                ]}
              />
            </svg>
          )}
        {isPronunciation && (
          <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
            <div className={headerRowClass}>
              <span className="w-6 shrink-0" />
              <span className="flex-1 text-right">{block.leftHeader ?? ""}</span>
              <span className={CONTROL_BOX_CLASS} style={{ visibility: "hidden" }} aria-hidden="true" />
            </div>
            <div className={headerRowClass}>
              <span className={CONTROL_BOX_CLASS} style={{ visibility: "hidden" }} aria-hidden="true" />
              <span className="flex-1">{block.rightHeader ?? ""}</span>
              <span
                className={`${usePlainTextRightLabels ? MATCHING_RIGHT_TEXT_LABEL_CLASS : NUMBER_BADGE_CLASS} shrink-0`}
                style={{ visibility: "hidden" }}
                aria-hidden="true"
              >
                {formatMatchingRightLabel(1, itemNumberFormat)}
              </span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
          {/* Left column */}
          <div>
            {orderedPairs.map((pair, i) => (
              <div
                key={pair.id}
                className={CONSISTENT_ROW_CLASS_PRINT}
              >
                <ItemNumberBadge index={i + 1} className="shrink-0" />
                <span className="flex-1 text-right" style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}>{pair.left}</span>
                <div
                  className={CONTROL_BOX_CLASS}
                  ref={showSolutions || pair.id === examplePairId ? (node) => {
                    leftSolutionBoxRefs.current[pair.id] = node;
                  } : undefined}
                />
              </div>
            ))}
          </div>
          {/* Right column — shuffled */}
          <div>
            {shuffledRight.map((pair, i) => (
              <div
                key={`r-${pair.id}`}
                className={CONSISTENT_ROW_CLASS_PRINT}
              >
                <div
                  className={CONTROL_BOX_CLASS}
                  ref={showSolutions || pair.id === examplePairId ? (node) => {
                    rightSolutionBoxRefs.current[pair.id] = node;
                  } : undefined}
                />
                <span className="flex-1" style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}>{pair.right}</span>
                <span className={`${usePlainTextRightLabels ? MATCHING_RIGHT_TEXT_LABEL_CLASS : NUMBER_BADGE_CLASS} shrink-0`}>
                  {formatMatchingRightLabel(i + 1, itemNumberFormat)}
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ── Online / interactive mode ──
  return (
    <div>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )}
          {(block.textAboveItems?.trim() || orderedPairs.length > 0) && <SectionGap size="large" />}
        </>
      )}
      {block.textAboveItems?.trim() && (
        <>
          <p className="whitespace-pre-line text-sm">{block.textAboveItems}</p>
          {orderedPairs.length > 0 && <SectionGap size="medium" />}
        </>
      )}
      {block.showWordBank && wordBankItems.length > 0 && (
        <>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {wordBankItems.map((item) => (
              <span
                key={item.id}
                className="rounded border px-2 py-0.5"
                style={undefined}
              >
                  {item.id === examplePairId ? <RoughExampleStrike>{item.text}</RoughExampleStrike> : item.text}
              </span>
            ))}
          </div>
          {orderedPairs.length > 0 && <SectionGap size="medium" />}
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        {isPronunciation && (
          <>
            <div className={headerRowClass}>
              <span className="w-6 shrink-0" />
              <span className="flex-1 text-right">{block.leftHeader ?? ""}</span>
              {!isOnline && <div className={CONTROL_BOX_CLASS} style={{ visibility: "hidden" }} aria-hidden="true" />}
            </div>
            <div className={headerRowClass}>
              {!isOnline && <div className={CONTROL_BOX_CLASS} style={{ visibility: "hidden" }} aria-hidden="true" />}
              <span className="flex-1 text-left">{block.rightHeader ?? ""}</span>
              <span
                className={`${usePlainTextRightLabels ? MATCHING_RIGHT_TEXT_LABEL_CLASS : NUMBER_BADGE_CLASS} shrink-0`}
                style={{ visibility: "hidden" }}
                aria-hidden="true"
              >
                {formatMatchingRightLabel(1, itemNumberFormat)}
              </span>
            </div>
          </>
        )}
        {/* Left side */}
        <div>
          {orderedPairs.map((pair, i) => {
            const isMatched = !!selections[pair.id];
            const isActive = activeLeftId === pair.id;
            const isCorrect = selections[pair.id] === pair.id;

            let rowClass = "";
            if (showResults && isMatched) {
              rowClass = isCorrect ? "bg-green-50" : "bg-red-50";
            } else if (isActive) {
              rowClass = "bg-primary/5";
            }

            const indicatorClass = !isMatched
              ? CONTROL_BOX_CLASS
              : showResults && !isCorrect
                ? `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`
                : CONTROL_BOX_FILLED_CLASS;

            return (
              <div
                key={pair.id}
                className={`${isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT} ${rowClass}`}
              >
                <ItemNumberBadge index={i + 1} className="shrink-0" />
                <button
                  type="button"
                  onClick={() => handleLeftClick(pair.id)}
                  disabled={!interactive || showResults}
                  className={`flex-1 text-right ${interactive && !showResults ? "cursor-pointer" : "cursor-default"}`}
                  style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}
                >
                  {pair.left}
                </button>
                {!isOnline && <div className={indicatorClass} />}
              </div>
            );
          })}
        </div>
        {/* Right side — shuffled answers */}
        <div>
          {shuffledRight.map((pair, i) => {
            const matchedByLeftId = rightToLeft[pair.id];
            const isMatched = !!matchedByLeftId;

            let rowClass = "";
            if (showResults && isMatched) {
              const isCorrect = matchedByLeftId === pair.id;
              rowClass = isCorrect ? "bg-green-50" : "bg-red-50";
            }

            const isCorrect = matchedByLeftId === pair.id;
            const indicatorClass = !isMatched
              ? CONTROL_BOX_CLASS
              : showResults && !isCorrect
                ? `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`
                : CONTROL_BOX_FILLED_CLASS;

            return (
              <div
                key={`r-${pair.id}`}
                className={`${isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT} ${rowClass}`}
              >
                {!isOnline && <div className={indicatorClass} />}
                <button
                  type="button"
                  onClick={() => handleRightClick(pair.id)}
                  disabled={!interactive || showResults || !activeLeftId}
                  className={`flex-1 text-left ${interactive && !showResults && activeLeftId ? "cursor-pointer" : "cursor-default"}`}
                  style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}
                >
                  {pair.right}
                </button>
                <span className={`${usePlainTextRightLabels ? MATCHING_RIGHT_TEXT_LABEL_CLASS : NUMBER_BADGE_CLASS} shrink-0`}>
                  {formatMatchingRightLabel(i + 1, itemNumberFormat)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {showResults && (
        <>
          <SectionGap size="medium" />
          <p className="text-cv-xs text-muted-foreground">
            {t("resultCount", { correct: block.pairs.filter((p) => selections[p.id] === p.id).length, total: block.pairs.length })}
          </p>
        </>
      )}
    </div>
  );
}

 function TwoColumnFillView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: TwoColumnFillBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const answers = (answer as Record<string, string> | undefined) || {};
  const isOnline = mode === "online";

  const handleChange = (itemId: string, value: string) => {
    if (!interactive) return;
    onAnswer({ ...answers, [itemId]: value });
  };

  // Collect fill-side values for word bank (shuffled)
  const shuffledWordBank = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items
      .map((item) => (block.fillSide === "left" ? item.left : item.right))
      .filter(Boolean),
      `two-column-fill:${block.id}:${block.fillSide}`
    );
  }, [block.id, block.items, block.showWordBank, block.fillSide]);

  // Column ratio → grid-template-columns
  const gridCols = block.colRatio === "1-2" ? "1fr 2fr"
    : block.colRatio === "2-1" ? "2fr 1fr"
    : "1fr 1fr";

  // Print / non-interactive mode
  if (!interactive) {
    return (
      <div>
        {block.instruction && (
          isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )
        )}
        {/* Word Bank */}
        {block.showWordBank && shuffledWordBank.length > 0 && (
          <div className="rounded p-3 border border-dashed border-muted-foreground/30">
            <div className="flex flex-wrap gap-2">
              {shuffledWordBank.map((text, i) => (
                <span key={i} className="px-2 py-0.5 bg-background rounded border">
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: gridCols, gap: "0 24px" }}>
          {block.items.map((item, i) => (
            <React.Fragment key={item.id}>
              {/* Left cell */}
              <div
                className="flex min-h-[49px] items-center gap-3 border-b"
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                <ItemNumberBadge index={i + 1} className="shrink-0" />
                {block.fillSide === "left" ? (
                  hasHandwriting(item.left) ? (
                    <span className="flex-1">{renderHandwriting(item.left)}</span>
                  ) : showSolutions ? (
                    <span className="flex-1 text-green-600 font-medium">{item.left}</span>
                  ) : (
                    <span className="flex-1 inline-block h-8 rounded" style={{ minWidth: 80 }}>&nbsp;</span>
                  )
                ) : (
                  <span className="flex-1">{item.left}</span>
                )}
              </div>
              {/* Right cell */}
              <div
                className="flex min-h-[49px] items-center gap-3 border-b"
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                {block.fillSide === "right" ? (
                  hasHandwriting(item.right) ? (
                    <span className="flex-1">{renderHandwriting(item.right)}</span>
                  ) : showSolutions ? (
                    <span className="flex-1 text-green-600 font-medium">{item.right}</span>
                  ) : (
                    <span className="flex-1 inline-block h-8 rounded" style={{ minWidth: 80 }}>&nbsp;</span>
                  )
                ) : (
                  <span className="flex-1">{item.right}</span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Online / interactive mode
  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {/* Word Bank */}
      {block.showWordBank && shuffledWordBank.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledWordBank.map((text, i) => (
              <span key={i} className="px-2 py-0.5 bg-background rounded border text-cv-sm">
                {text}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: gridCols, gap: "0 24px" }}>
        {block.items.map((item, i) => (
          <React.Fragment key={item.id}>
            {/* Left cell */}
            <div
              className="flex min-h-[49px] items-center gap-3 border-b"
              style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
            >
              <ItemNumberBadge index={i + 1} className="shrink-0" />
              {block.fillSide === "left" ? (
                hasHandwriting(item.left) ? (
                  <span className="flex-1">{renderHandwriting(item.left)}</span>
                ) : (
                  <input
                    type="text"
                    className="flex-1 h-8 rounded bg-transparent outline-none text-cv-sm px-2 py-0.5 focus:outline-none transition-colors"
                    style={isOnline ? { backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)" } : undefined}
                    value={answers[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                  />
                )
              ) : (
                <span className="flex-1">{item.left}</span>
              )}
            </div>
            {/* Right cell */}
            <div
              className="flex min-h-[49px] items-center gap-3 border-b"
              style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
            >
              {block.fillSide === "right" ? (
                hasHandwriting(item.right) ? (
                  <span className="flex-1">{renderHandwriting(item.right)}</span>
                ) : (
                  <input
                    type="text"
                    className="flex-1 h-8 rounded bg-transparent outline-none text-cv-sm px-2 py-0.5 focus:outline-none transition-colors"
                    style={isOnline ? { backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)" } : undefined}
                    value={answers[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                  />
                )
              ) : (
                <span className="flex-1">{item.right}</span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function GlossaryView({
  block,
  brand,
  bodyFont,
  isNonLatin,
  translationScale,
}: {
  block: GlossaryBlock;
  brand?: Brand;
  bodyFont?: string;
  isNonLatin?: boolean;
  translationScale?: number;
}) {
  const colWidth = `${block.leftColWidth ?? 25}%`;
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedBodyFont = bodyFont || brandFonts.bodyFont;
  const termStyle: React.CSSProperties = isNonLatin ? { fontFamily: resolvedBodyFont } : {};
  const scale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const defStyle: React.CSSProperties = scale ? { fontSize: `${scale}em` } : {};
  const hasExamples = block.pairs.some((p) => p.example);
  return (
    <div className={`space-y-2 ${s.glossary}`}>
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      <div className="space-y-0 border-t">
        {block.pairs.map((pair) => (
          <div
            key={pair.id}
            className="glossary-row flex items-start gap-4 py-1 border-b"
          >
            <span className={`font-medium ${s.glossaryTerm}`} style={{ width: colWidth, minWidth: colWidth, ...termStyle }}>
              {pair.term}
            </span>
            <span className="flex-1" dir="auto" style={defStyle}>
              {pair.definition}
            </span>
            {hasExamples && (
              <span className="flex-1 text-muted-foreground" dir="auto" style={defStyle}>
                {pair.example}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OpenResponseView({
  block,
  interactive,
  answer,
  onAnswer,
}: {
  block: OpenResponseBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
}) {
  const tb = useTranslations("blockRenderer");

  return (
    <div className="space-y-2">
      <p className="font-medium">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          rows={block.lines}
          value={(answer as string) || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={tb("writeAnswerHere")}
        />
      ) : (
        <div className="space-y-0">
          {Array.from({ length: block.lines }).map((_, i) => (
            <div key={i} className="border-b border-gray-300 h-8" />
          ))}
        </div>
      )}
    </div>
  );
}

function WordBankView({ block }: { block: WordBankBlock }) {
  return (
    <div className="flex min-h-[49px] flex-wrap items-center gap-2">
      <div className="flex flex-1 flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span key={i} className="px-2 py-0.5 bg-background rounded border">
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

function NumberLineView({ block }: { block: NumberLineBlock }) {
  const ticks: number[] = [];
  for (let v = block.min; v <= block.max; v += block.step) {
    ticks.push(v);
  }
  return (
    <div className="py-4">
      <div className="relative mx-6">
        <div className="h-0.5 bg-foreground w-full" />
        <div className="flex justify-between -mt-2">
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center">
              <div className="h-3 w-0.5 bg-foreground" />
              <span className="text-cv-xs mt-1 text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
        {block.markers.map((m, i) => {
          const pct = ((m - block.min) / (block.max - block.min)) * 100;
          return (
            <div
              key={i}
              className="absolute -top-2 w-3 h-3 rounded-full bg-primary border-2 border-background"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              title={`${m}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Render {{blank}} placeholders as visual gaps inside T/F statement text (matching fill-in-blank style) */
function renderTfBlanks(text: string): React.ReactNode {
  if (!text.includes("{{blank}}")) return text;
  const parts = text.split("{{blank}}");
  return parts.flatMap((part, i) =>
    i < parts.length - 1
      ? [part, <span key={i} className="bg-gray-100 px-2 mx-1" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 4, minWidth: 80 }}>&nbsp;</span>]
      : [part]
  );
}

function renderMissingLetterText(
  text: string,
  showExampleOnFirstBlank = false,
  showSolutionsOnRemainingBlanks = false,
): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);
  let exampleShown = false;

  return parts.map((part, index) => {
    const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
    if (!match) {
      return <span key={index}>{tripleInnerRegularSpaces(part)}</span>;
    }

    const noSpace = match[1] === "*";
    const raw = match[2] || "";
    const { answer, width } = parseBlankContent(raw);
    const spacing = getBlankSpacing(width, noSpace, parts[index + 1]);
    const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
    const shouldRenderSolution = showSolutionsOnRemainingBlanks && answer.trim() !== "" && !shouldRenderExample;
    const blankShellStyle: React.CSSProperties = {
      minHeight: "1.25rem",
      lineHeight: "1.25rem",
      ...getBlankWidthStyle(width, false),
      ...spacing.style,
    };

    if (shouldRenderExample) {
      exampleShown = true;
      return (
        <span
          key={index}
          className={`relative inline-flex rounded-[3px] bg-gray-100 align-middle overflow-hidden ${spacing.className}`}
          style={blankShellStyle}
        >
          <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || "\u00A0"}</span>
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: EXAMPLE_HANDWRITING_FONT,
              fontWeight: 400,
              fontSize: "18px",
              color: "#0097dc",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {answer}
          </span>
        </span>
      );
    }

    if (shouldRenderSolution) {
      return (
        <span
          key={index}
          className={`relative inline-flex rounded-[3px] bg-gray-100 align-middle overflow-hidden ${spacing.className}`}
          style={blankShellStyle}
        >
          <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || "\u00A0"}</span>
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: EXAMPLE_HANDWRITING_FONT,
              fontWeight: 400,
              fontSize: "18px",
              color: "#15803d",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {answer}
          </span>
        </span>
      );
    }

    return (
      <span
        key={index}
        aria-hidden="true"
        className={`relative inline-flex rounded-[3px] bg-gray-100 align-middle overflow-hidden ${spacing.className}`}
        style={blankShellStyle}
      >
        <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || "\u00A0"}</span>
        <span className="sr-only">missing letter</span>
      </span>
    );
  });
}

function renderCardTextWithBlanks(
  text: string,
  blankStyle: React.CSSProperties,
  blankClassName = "",
): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);

  return parts.map((part, index) => {
    const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
    if (!match) {
      return <span key={index}>{doubleInnerRegularSpaces(part)}</span>;
    }

    const noSpace = match[1] === "*";
    const raw = match[2] || "";
    const { width } = parseBlankContent(raw);
    const spacing = getBlankSpacing(width, noSpace, parts[index + 1]);

    return (
      <span
        key={index}
        aria-hidden="true"
        className={`inline-flex rounded-[3px] bg-gray-100 align-middle ${blankClassName} ${spacing.className}`.trim()}
        style={{ ...getBlankWidthStyle(width, false), ...spacing.style, ...blankStyle }}
      >
        <span className="sr-only">blank</span>
      </span>
    );
  });
}

function renderSolvedFlashcardBackText(text: string): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);

  return parts.map((part, index) => {
    const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
    if (!match) {
      return <span key={index}>{doubleInnerRegularSpaces(part)}</span>;
    }

    const raw = match[2] || "";
    const { answer } = parseBlankContent(raw);
    return <strong key={index}>{answer}</strong>;
  });
}

 function TrueFalseMatrixView({
  block,
  mode,
  interactive,
  showPill = true,
  taskNumber,
  lessonLabel,
  brand,
  bodyFont,
  bodyFontSize,
  isNonLatin = false,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: TrueFalseMatrixBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  showPill?: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  brand?: Brand;
  bodyFont?: string;
  bodyFontSize?: string;
  isNonLatin?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const tc = useTranslations("common");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const fontFamily = bodyFont || "inherit";
  const isOnline = mode === "online";
  const trueLabelText = block.trueLabel || tc("true");
  const falseLabelText = block.falseLabel || tc("false");
  const optionColumnWidth = `${Math.max(80, Math.min(180, Math.max(trueLabelText.length, falseLabelText.length) * 8 + 28))}px`;

  const handleSelect = (stmtId: string, value: boolean) => {
    if (stmtId in answers) return; // already answered
    setAnswers((prev) => ({ ...prev, [stmtId]: value }));
  };

  return (
    <div className="space-y-2 text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
      <div>
        {block.instruction && (
          isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <div className="flex w-full min-w-0 items-center gap-3 flex-1">
                <p className="min-w-0 flex-1">{block.instruction}</p>
                <div className="shrink-0" style={{ width: optionColumnWidth }} aria-hidden="true" />
                <div className="shrink-0" style={{ width: optionColumnWidth }} aria-hidden="true" />
              </div>
            </div>
          ) : (
            <InstructionRow
              instruction={block.instruction}
              accentColor={accentColor}
              mode={mode}
              instructionIndex={instructionIndex}
            />
          )
        )}
        <div className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}>
          <span className="w-6 shrink-0" aria-hidden="true" />
          <div className="flex-1 font-bold text-foreground">{block.statementColumnHeader || ""}</div>
          <div className="shrink-0 text-center font-medium text-muted-foreground text-[14px]" style={{ width: optionColumnWidth }}>{trueLabelText}</div>
          <div className="shrink-0 text-center font-medium text-muted-foreground text-[14px]" style={{ width: optionColumnWidth }}>{falseLabelText}</div>
        </div>
        <div>
          {(() => {
            const orderedStatements = block.statementOrder
              ? block.statementOrder
                  .map((id) => block.statements.find((s) => s.id === id))
                  .filter((s): s is NonNullable<typeof s> => !!s)
                  .concat(block.statements.filter((s) => !block.statementOrder!.includes(s.id)))
              : block.statements;
            return orderedStatements.map((stmt, stmtIndex) => {
            const hasAnswered = stmt.id in answers;
            const selected = hasAnswered ? answers[stmt.id] : undefined;
            const isCorrect = hasAnswered && selected === stmt.correctAnswer;

            const getOptionClass = (optionValue: boolean) => {
              if (!hasAnswered) return "border-muted-foreground/30 hover:border-primary/50";
              if (selected === optionValue) {
                return isCorrect
                  ? `${s.controlBoxFilled}`
                  : "border-red-500 bg-red-500 text-white";
              }
              if (stmt.correctAnswer === optionValue) {
                return "border-blue-500 bg-blue-500 text-white";
              }
              return "border-muted-foreground/30";
            };

            return (
              <div key={stmt.id} className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}>
                <ItemNumberBadge index={stmtIndex + 1} className="shrink-0" />
                <span className="min-w-0 flex-1">{renderTfBlanks(stmt.text)}</span>
                <div className="shrink-0 self-center flex items-center justify-center" style={{ width: optionColumnWidth }}>
                  {showSolutions && !interactive ? (
                    stmt.correctAnswer ? (
                      <div className={CONTROL_BOX_FILLED_CLASS} />
                    ) : (
                      <div className={CONTROL_BOX_CLASS} />
                    )
                  ) : (
                    <button
                      className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(true)}`}
                      onClick={() => handleSelect(stmt.id, true)}
                      disabled={hasAnswered}
                    />
                  )}
                </div>
                <div className="shrink-0 self-center flex items-center justify-center" style={{ width: optionColumnWidth }}>
                  {showSolutions && !interactive ? (
                    !stmt.correctAnswer ? (
                      <div className={CONTROL_BOX_FILLED_CLASS} />
                    ) : (
                      <div className={CONTROL_BOX_CLASS} />
                    )
                  ) : (
                    <button
                      className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(false)}`}
                      onClick={() => handleSelect(stmt.id, false)}
                      disabled={hasAnswered}
                    />
                  )}
                </div>
              </div>
            );
          });
          })()}
        </div>
      </div>
    </div>
  );
}

function MCQMatrixView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showSolutions = false,
  showPill = true,
  taskNumber,
  lessonLabel,
  brand,
  bodyFont,
  bodyFontSize,
  isNonLatin = false,
  showResults = false,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: MCQMatrixBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults?: boolean;
  showSolutions?: boolean;
  showPill?: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  brand?: Brand;
  bodyFont?: string;
  bodyFontSize?: string;
  isNonLatin?: boolean;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const [currentStatementIndex, setCurrentStatementIndex] = React.useState(0);
  const answers = (answer as Record<string, string[]> | undefined) || {};
  const fontFamily = bodyFont || "inherit";
  const isOnline = mode === "online";
  const exampleStatementId = block.showFirstAsExample ? block.statements[0]?.id : undefined;
  const wordBankItems = (block.wordBank ?? []).map((item) => item.trim()).filter(Boolean);

  const handleSelect = (statementId: string, optionId: string) => {
    if (!interactive) return;
    if (statementId === exampleStatementId) return;
    const selected = answers[statementId] || [];
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onAnswer({ ...answers, [statementId]: next });
  };

  const orderedStatements = (() => {
    const exampleStatement = exampleStatementId
      ? block.statements.find((statement) => statement.id === exampleStatementId)
      : undefined;
    const remainingStatements = block.statements.filter((statement) => statement.id !== exampleStatementId);
    const orderedRemainingStatements = block.statementOrder
      ? block.statementOrder
          .map((id) => remainingStatements.find((statement) => statement.id === id))
          .filter((statement): statement is NonNullable<typeof statement> => !!statement)
          .concat(remainingStatements.filter((statement) => !block.statementOrder!.includes(statement.id)))
      : remainingStatements;

    return exampleStatement ? [exampleStatement, ...orderedRemainingStatements] : orderedRemainingStatements;
  })();

  const currentStatement = orderedStatements[currentStatementIndex];
  const t = useTranslations("viewer");
  const showAfterOptionsColumn = orderedStatements.some((statement) => (statement.afterOptionsText || "").trim().length > 0);

  return (
    <div>
      {/* Mobile wizard view */}
      <div className="md:hidden overflow-x-hidden">
        <div>
          {block.instruction && (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          )}
        </div>

        {currentStatement && (
          <div className="mt-4">
            {/* Statement */}
            <div className="flex items-center font-medium text-foreground">
              <span dangerouslySetInnerHTML={{ __html: normalizeInlineViewerHtml(currentStatement.text) }} />
            </div>

            {/* Options as buttons */}
            <div className="flex flex-col gap-2 mt-2">
              {block.options.map((option) => {
                const isSelected = (answers[currentStatement.id] || []).includes(option.id);
                const isCorrect = currentStatement.correctOptionIds.includes(option.id);
                const effectiveShowResults = showResults || isSelected;
                const resolvedInteractiveColor = interactiveColor || "#0ea5e9";

                let bgColor = `${resolvedInteractiveColor}15`;
                if (effectiveShowResults && isOnline) {
                  if (isCorrect) {
                    bgColor = "#dcfce7";
                  } else if (isSelected && !isCorrect) {
                    bgColor = "#fee2e2";
                  }
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    className="flex items-center gap-3 px-4 h-9 rounded-sm text-left w-full"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => handleSelect(currentStatement.id, option.id)}
                    disabled={!interactive}
                  >
                    <span className="flex-1">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons with progress dots */}
            <div className="flex gap-2 justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => setCurrentStatementIndex(Math.max(0, currentStatementIndex - 1))}
                disabled={currentStatementIndex === 0}
                className="p-0 flex items-center justify-center border bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: "48px", height: "24px", lineHeight: "1", padding: "0", borderRadius: "2px" }}
              >
                ←
              </button>

              {/* Progress dots */}
              <div className="flex gap-1">
                {orderedStatements.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentStatementIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStatementIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to statement ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStatementIndex(Math.min(orderedStatements.length - 1, currentStatementIndex + 1))}
                disabled={currentStatementIndex === orderedStatements.length - 1}
                className="p-0 flex items-center justify-center border bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: "48px", height: "24px", lineHeight: "1", padding: "0", borderRadius: "2px" }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block space-y-2 text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
        <div>
          {block.instruction && (
          <>
            {isOnline ? (
              <div
                className={CONSISTENT_INSTRUCTION_ROW_CLASS}
                style={{ color: accentColor || "var(--color-primary)" }}
              >
                <InstructionBadge instructionIndex={instructionIndex} />
                <p className="min-w-0 flex-1">{block.instruction}</p>
              </div>
            ) : (
              <InstructionRow
                instruction={block.instruction}
                accentColor={accentColor}
                mode={mode}
                instructionIndex={instructionIndex}
              />
            )}
            {(block.options.length > 0 || orderedStatements.length > 0 || wordBankItems.length > 0) && <SectionGap size="large" />}
          </>
        )}
        {wordBankItems.length > 0 && (
          <>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {wordBankItems.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="rounded border px-2 py-0.5"
                  style={undefined}
                >
                  {item}
                </span>
              ))}
            </div>
            {(block.options.length > 0 || orderedStatements.length > 0) && <SectionGap size="medium" />}
          </>
        )}
        <div className={`${isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT} border-t`}>
          <span className="w-6 shrink-0" aria-hidden="true" />
          <div className="flex-1" aria-hidden="true" />
          {block.options.map((option) => (
            <div key={option.id} className="w-20 text-center font-semibold text-foreground text-[14px]">
              {option.text}
            </div>
          ))}
          {showAfterOptionsColumn && <div className="w-36" aria-hidden="true" />}
        </div>
        <div>
          {orderedStatements.map((statement, statementIndex) => {
            const selectedIds = answers[statement.id] || [];
            const isExampleRow = statement.id === exampleStatementId;

            return (
              <div key={statement.id} className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}>
                <ItemNumberBadge index={statementIndex + 1} className="shrink-0" />
                  <span className="flex-1" dangerouslySetInnerHTML={{ __html: normalizeInlineViewerHtml(statement.text) }} />
                {block.options.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  const isCorrect = statement.correctOptionIds.includes(option.id);
                  const showExampleOverlay = isExampleRow && isCorrect;
                  const showSolutionOverlay = showSolutions && !interactive && !isExampleRow && isCorrect;

                  let optionClass = CONTROL_BOX_CLASS;
                  if (showExampleOverlay) {
                    optionClass = CONTROL_BOX_CLASS;
                  } else if (showSolutionOverlay) {
                    optionClass = CONTROL_BOX_CLASS;
                  } else if (showResults) {
                    if (isSelected && isCorrect) {
                      optionClass = `${CONTROL_BOX_CLASS} ${s.controlBoxFilled}`;
                    } else if (isSelected && !isCorrect) {
                      optionClass = `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`;
                    } else if (!isSelected && isCorrect) {
                      optionClass = `${CONTROL_BOX_CLASS} border-blue-500 bg-blue-500 text-white`;
                    }
                  } else if (isSelected) {
                    optionClass = `${CONTROL_BOX_CLASS} ${s.controlBoxActive}`;
                  }

                  return (
                    <div key={option.id} className="w-20 flex items-center justify-center">
                      {showExampleOverlay || (showSolutions && !interactive) ? (
                        showExampleOverlay
                          ? renderHandwrittenMatrixIndicator("#0097dc")
                          : showSolutionOverlay
                            ? renderHandwrittenMatrixIndicator("#15803d")
                            : <div className={optionClass} />
                      ) : (
                        <button
                          type="button"
                          className={`${optionClass} transition-colors ${interactive && !showResults ? "hover:border-primary/50" : ""}`.trim()}
                          onClick={() => handleSelect(statement.id, option.id)}
                          disabled={!interactive || showResults || isExampleRow}
                        />
                      )}
                    </div>
                  );
                })}
                {showAfterOptionsColumn && (
                  <span
                    className="w-36 text-sm"
                    dangerouslySetInnerHTML={{ __html: normalizeInlineViewerHtml(statement.afterOptionsText || "") }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

function ArticleTrainingView({
  block,
  mode = "online",
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: ArticleTrainingBlock;
  mode?: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const t = useTranslations("viewer");
  const answers = (answer as Record<string, string | null> | undefined) || {};
  const articles: ArticleAnswer[] = ["der", "das", "die"];
  const isOnline = mode === "online";
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;

  const handleSelect = (itemId: string, value: ArticleAnswer) => {
    if (!interactive) return;
    onAnswer({ ...answers, [itemId]: value });
  };

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      <div>
        {/* header row */}
        <div className={`${ROW_CLASS} font-medium text-muted-foreground`}>
          <span className="w-6 shrink-0" />
          {articles.map((a) => (
            <span key={a} className="w-14 shrink-0 text-center">{a}</span>
          ))}
          <span className="flex-1" />
          {block.showWritingLine && <span className="flex-1" />}
        </div>
        {block.items.map((item, idx) => {
          const selected = answers[item.id] as ArticleAnswer | null;
          const isCorrect = selected === item.correctArticle;
          const writingVal = (answers[`${item.id}_writing`] as string) || "";

          return (
            <div key={item.id} className={ROW_CLASS}>
              <ItemNumberBadge index={idx + 1} className="shrink-0" />
              {articles.map((a) => (
                <div key={a} className="w-14 shrink-0 flex items-center justify-center">
                  {interactive ? (
                    <button
                      className={`${CONTROL_BOX_CLASS} transition-colors
                        ${selected === a
                          ? showResults
                            ? item.correctArticle === a
                              ? s.controlBoxFilled
                              : "border-red-500 bg-red-500 text-white"
                            : s.controlBoxActive
                          : "border-muted-foreground/30 hover:border-primary/50"
                        }`}
                      onClick={() => handleSelect(item.id, a)}
                    >
                      {selected === a && "✓"}
                    </button>
                  ) : showSolutions && item.correctArticle === a ? (
                    <div className={CONTROL_BOX_FILLED_CLASS} />
                  ) : (
                    <div className={CONTROL_BOX_CLASS} />
                  )}
                </div>
              ))}
              <span className={`flex-1${showSolutions && !interactive ? " text-green-700 font-semibold" : ""}`}>{item.text}</span>
              {block.showWritingLine && (
                <div className="flex-1">
                  {isOnline && interactive ? (
                    <input
                      type="text"
                      value={writingVal}
                      disabled={showResults}
                      onChange={(e) => onAnswer({ ...answers, [`${item.id}_writing`]: e.target.value })}
                      className="h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors w-full"
                      style={{ backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10) }}
                    />
                  ) : showSolutions ? (
                    <span className="text-green-700 font-semibold">
                      {item.correctArticle} {item.text}
                    </span>
                  ) : (
                    <div className="border-b border-muted-foreground/30 h-6 min-w-[100px]" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", { correct: block.items.filter((item) => answers[item.id] === item.correctArticle).length, total: block.items.length })}
        </p>
      )}
    </div>
  );
}

function ColumnsView({
  block,
  mode,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  primaryColor,
  allBlocks,
  brand = "edoomio",
}: {
  block: ColumnsBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
}) {
  const answers = (answer as Record<string, unknown> | undefined) || {};
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
    >
      {block.children.map((col, colIndex) => {
        const colBorder = block.columnBorders?.[colIndex] ?? (block.showBorder ?? true);
        return (
        <div
          key={colIndex}
          className={`space-y-4 px-3 py-0
            [&_p:first-child]:-mt-2.5 [&_p:last-child]:mb-0
            ${block.columnBgColors?.[colIndex] ? "rounded" : "rounded-sm"}
            ${colBorder ? "border border-border" : ""}`}
          style={{
            ...(block.columnBgColors?.[colIndex]
              ? { backgroundColor: block.columnBgColors[colIndex] }
              : {}),
            ...(colBorder && block.columnBorderColors?.[colIndex]
              ? { borderColor: block.columnBorderColors[colIndex] }
              : {}),
            ...(colBorder ? { paddingTop: "6px" } : {}),
          }}
        >
          {col.map((childBlock) => (
            <ViewerBlockRenderer
              key={childBlock.id}
              block={childBlock}
              mode={mode}
              answer={answers[childBlock.id]}
              onAnswer={(value) =>
                onAnswer({ ...answers, [childBlock.id]: value })
              }
              showResults={showResults}
              showSolutions={showSolutions}
              primaryColor={primaryColor}
              allBlocks={allBlocks}
              brand={brand}
            />
          ))}
        </div>
      );
      })}
    </div>
  );
}

// ─── Grid View ───────────────────────────────────────────────
function GridView({
  block,
  mode,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  primaryColor,
  allBlocks,
  brand = "edoomio",
}: {
  block: GridBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
}) {
  const answers = (answer as Record<string, unknown> | undefined) || {};
  const hasBorder = block.showBorder ?? false;
  const cellPadding = hasBorder ? "8px" : "0";

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${block.cols}, 1fr)`,
        gridTemplateRows: `repeat(${block.rows}, auto)`,
        columnGap: `${block.colGap}px`,
        rowGap: `${block.rowGap}px`,
      }}
    >
      {block.children.map((cell, cellIndex) => (
        <div key={cellIndex} style={hasBorder ? { paddingTop: cellPadding } : {}}>
          {cell.map((childBlock) => (
            <ViewerBlockRenderer
              key={childBlock.id}
              block={childBlock}
              mode={mode}
              answer={answers[childBlock.id]}
              onAnswer={(value) =>
                onAnswer({ ...answers, [childBlock.id]: value })
              }
              showResults={showResults}
              showSolutions={showSolutions}
              primaryColor={primaryColor}
              allBlocks={allBlocks}
              brand={brand}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const LETTER_CODE_ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "\u00c4", "\u00d6", "\u00dc"];

function isValidLetterCodeOrder(order: string[] | undefined): order is string[] {
  if (!Array.isArray(order) || order.length !== LETTER_CODE_ALPHABET.length) return false;
  const set = new Set(order);
  return LETTER_CODE_ALPHABET.every((letter) => set.has(letter));
}

function normalizeLetterCodeChar(char: string): string | null {
  const normalized = char.toUpperCase();
  return LETTER_CODE_ALPHABET.includes(normalized) ? normalized : null;
}

function parseLetterCodeWord(pattern: string): Array<{ char: string; prefilled: boolean; space?: boolean }> {
  const tokens: Array<{ char: string; prefilled: boolean; space?: boolean }> = [];
  let index = 0;

  while (index < pattern.length) {
    if (pattern[index] === "[") {
      const closingIndex = pattern.indexOf("]", index + 1);
      const endIndex = closingIndex === -1 ? pattern.length : closingIndex;
      const inner = pattern.slice(index + 1, endIndex);
      for (const char of inner) {
        const normalized = normalizeLetterCodeChar(char);
        if (normalized) tokens.push({ char: normalized, prefilled: true });
      }
      index = closingIndex === -1 ? pattern.length : closingIndex + 1;
      continue;
    }

    if (/\s/.test(pattern[index])) {
      const last = tokens[tokens.length - 1];
      if (tokens.length > 0 && !last?.space) {
        tokens.push({ char: " ", prefilled: false, space: true });
      }
      index += 1;
      continue;
    }

    const normalized = normalizeLetterCodeChar(pattern[index]);
    if (normalized) tokens.push({ char: normalized, prefilled: false });
    index += 1;
  }

  while (tokens.length > 0 && tokens[tokens.length - 1].space) {
    tokens.pop();
  }

  return tokens;
}

function buildLetterCodeNumberMap(order: string[] | undefined): Map<string, number> {
  const effectiveOrder = isValidLetterCodeOrder(order) ? order : LETTER_CODE_ALPHABET;
  return new Map(effectiveOrder.map((letter, index) => [letter, index + 1]));
}

function buildLetterCodeHelperSet(helperLetters: string[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const rawLetter of helperLetters ?? []) {
    const normalized = normalizeLetterCodeChar(rawLetter);
    if (normalized) set.add(normalized);
  }
  return set;
}

function formatLetterCodeNumber(number: number): string {
  return String(number).padStart(2, "0");
}

function LetterCodeView({
  block,
  mode,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: LetterCodeBlock;
  mode: ViewMode;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const rows = [
    Array.from({ length: 15 }, (_, index) => index + 1),
    [...Array.from({ length: 14 }, (_, index) => index + 16), null],
  ] as const;
  const isOnline = mode === "online";
  const bankGapPx = 4;
  const cellSizePx = 38;
  const numberMap = useMemo(() => buildLetterCodeNumberMap(block.letterOrder), [block.letterOrder]);
  const helperLetters = useMemo(() => buildLetterCodeHelperSet(block.helperLetters), [block.helperLetters]);
  const letterByNumber = useMemo(() => {
    const map = new Map<number, string>();
    for (const [letter, number] of numberMap.entries()) {
      map.set(number, letter);
    }
    return map;
  }, [numberMap]);
  const parsedItems = useMemo(
    () => (block.items ?? []).map((item) => ({ ...item, tokens: parseLetterCodeWord(item.word || "") })),
    [block.items],
  );
  const usedLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of parsedItems) {
      for (const token of item.tokens) {
        if (token.space) continue;
        letters.add(token.char);
      }
    }
    return letters;
  }, [parsedItems]);

  return (
    <div>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )}
          <SectionGap size="large" />
        </>
      )}
      <div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(15, ${cellSizePx}px)`, justifyContent: "space-between", columnGap: 0, rowGap: `${bankGapPx}px` }}>
          {rows.flatMap((row, rowIndex) =>
            row.map((number, colIndex) => {
              if (number === null) {
                return <div key={`letter-code-empty-${rowIndex}-${colIndex}`} aria-hidden="true" />;
              }

              return (
                <div
                  key={`letter-code-cell-${rowIndex}-${colIndex}`}
                  className="relative border border-border"
                  style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                >
                  <span className="absolute left-0.5 top-0 text-[10px] text-muted-foreground">{formatLetterCodeNumber(number)}</span>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ transform: "translateY(3px)" }}>
                    {(() => {
                      const letter = letterByNumber.get(number);
                      if (!letter) return "";
                      if (helperLetters.has(letter)) return letter;
                      if (showSolutions && usedLetters.has(letter)) return letter;
                      return "";
                    })()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      {parsedItems.length > 0 ? <SectionGap size="medium" /> : null}
      <div className="space-y-2">
        {parsedItems.map((item, itemIndex) => (
          <div
            key={item.id || itemIndex}
            className="flex items-start gap-3 rounded border border-border/70 px-3 py-2"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <ItemNumberBadge index={itemIndex + 1} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex min-h-[20px] items-center">
                <p className="text-foreground">{item.clue || "-"}</p>
              </div>
              <div className="flex flex-wrap" style={{ gap: `${bankGapPx}px` }}>
                {item.tokens.map((token, tokenIndex) => {
                  if (token.space) {
                    return (
                      <div
                        key={`${item.id}-${tokenIndex}`}
                        className="shrink-0 border border-border bg-muted"
                        style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                        aria-hidden="true"
                      />
                    );
                  }
                  const number = numberMap.get(token.char);
                  return (
                    <div
                      key={`${item.id}-${tokenIndex}`}
                      className="relative shrink-0 border border-border"
                      style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                    >
                      <span className="absolute left-0.5 top-0 text-[10px] text-muted-foreground">{typeof number === "number" ? formatLetterCodeNumber(number) : "?"}</span>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ transform: "translateY(3px)" }}>
                        {token.prefilled || helperLetters.has(token.char) || showSolutions ? token.char : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardGameView({ block, mode = "online" }: { block: BoardGameBlock; mode?: ViewMode }) {
  const totalCells = Math.max(1, block.rows * block.cols);
  const isPrintMode = mode === "print";
  const cellWidthMm = isPrintMode ? 31.5 : 35;
  const cellHeightMm = isPrintMode ? 22.5 : 25;
  const cellGapPx = isPrintMode ? 6 : 8;
  const mmToPx = 96 / 25.4;
  const cellWidthPx = cellWidthMm * mmToPx;
  const cellHeightPx = cellHeightMm * mmToPx;
  const boardWidthPx = block.cols * cellWidthPx + Math.max(0, block.cols - 1) * cellGapPx;
  const boardHeightPx = block.rows * cellHeightPx + Math.max(0, block.rows - 1) * cellGapPx;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const existing = block.cells[index];
    return existing ?? { id: `cell-${index + 1}`, text: "", imageUrl: "" };
  });

  const snakePathIndices: number[] = [35];
  for (let r = block.rows - 1; r >= 0; r--) {
    const isLeftToRight = (block.rows - 1 - r) % 2 === 0;
    if (isLeftToRight) {
      for (let c = 0; c < block.cols; c++) {
        const idx = r * block.cols + c;
        if (idx !== 35 && idx !== 0 && idx < totalCells) {
          snakePathIndices.push(idx);
        }
      }
    } else {
      for (let c = block.cols - 1; c >= 0; c--) {
        const idx = r * block.cols + c;
        if (idx !== 35 && idx !== 0 && idx < totalCells) {
          snakePathIndices.push(idx);
        }
      }
    }
  }

  const snakePathPoints = snakePathIndices
    .map((idx) => {
      const row = Math.floor(idx / block.cols);
      const col = idx % block.cols;
      const x = col * (cellWidthPx + cellGapPx) + cellWidthPx / 2;
      const y = row * (cellHeightPx + cellGapPx) + cellHeightPx / 2;
      return `${x},${y}`;
    })
    .join(" ");

  const getSnakeNumber = (cellIndex: number): number | null => {
    // Skip START (index 35) and ZIEL (index 0)
    if (cellIndex === 35 || cellIndex === 0) return null;
    
    const cols = 5;
    const rows = 8;
    let number = 0;
    
    // Start from bottom row, snake up
    for (let r = rows - 1; r >= 0; r--) {
      const isLeftToRight = (rows - 1 - r) % 2 === 0;
      
      if (isLeftToRight) {
        // Left to right
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx !== 35 && idx !== 0) {
            number++;
            if (idx === cellIndex) return number;
          }
        }
      } else {
        // Right to left
        for (let c = cols - 1; c >= 0; c--) {
          const idx = r * cols + c;
          if (idx !== 35 && idx !== 0) {
            number++;
            if (idx === cellIndex) return number;
          }
        }
      }
    }
    return null;
  };

  return (
    <div
      className="grid relative"
      style={{
        gridTemplateColumns: `repeat(${block.cols}, ${cellWidthMm}mm)`,
        gap: `${cellGapPx}px`,
        width: "fit-content",
        margin: "0 auto",
      }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox={`0 0 ${boardWidthPx} ${boardHeightPx}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={snakePathPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/40"
        />
      </svg>
      {cells.map((cell, index) => {
        const displayText = index === 0 ? "ZIEL" : index === 35 ? "START" : cell.text;
        const isSpecial = displayText === "ZIEL" || displayText === "START";
        const snakeNumber = getSnakeNumber(index);
        return (
        <div
          key={cell.id || index}
          className={`relative z-10 rounded-sm border border-border p-2 bg-background flex flex-col ${isSpecial ? "items-center justify-center" : "space-y-2 relative"}`}
          style={{
            width: `${cellWidthMm}mm`,
            height: `${cellHeightMm}mm`,
            boxSizing: "border-box",
            ...(cell.imageUrl && !isSpecial
              ? {
                  backgroundImage: `url(${cell.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
          }}
        >
          {isSpecial ? (
            <p className="font-bold text-3xl text-center leading-none">{displayText}</p>
          ) : (
            <>
              {snakeNumber && <div className="absolute top-1 right-1 text-[9px] text-muted-foreground font-semibold">{snakeNumber}</div>}
              {!cell.imageUrl ? <div className="flex-1 rounded-sm border border-dashed border-border/80 bg-muted/20" /> : null}
              {displayText?.trim() ? (
                <p className="flex-1 flex items-center justify-center text-center text-xs leading-snug whitespace-pre-wrap break-words overflow-hidden rounded-sm bg-background/70 px-1">{displayText}</p>
              ) : null}
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}

const CARD_CANVA_PAGE_WIDTH = "297mm";
const CARD_CANVA_PAGE_HEIGHT = "calc(210mm - var(--print-tfoot-height, 0px))";
const CARD_CANVA_FRAME_X = "18mm";
const CARD_CANVA_FRAME_WIDTH = "261mm";
const CARD_CANVA_TITLE_Y = "10mm";
const CARD_CANVA_TITLE_HEIGHT = "10mm";
const CARD_CANVA_LOGO_TOP = "10mm";
const CARD_CANVA_LOGO_RIGHT = "10mm";
const CARD_CANVA_LOGO_SIZE = "6.5mm";
const CARD_CANVA_CONTENT_TOP = "29mm";
const CARD_CANVA_CONTENT_BOTTOM = "0mm";
const CARD_CANVA_FOOTER_BOTTOM = "10mm";
const CARD_CANVA_DOMINO_CELL_WIDTH_MM = 43.5;
const CARD_CANVA_DOMINO_CELL_HEIGHT_MM = 37;
const CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM = CARD_CANVA_DOMINO_CELL_WIDTH_MM;
const CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM = CARD_CANVA_DOMINO_CELL_WIDTH_MM;
const CARD_CANVA_FLASHCARD_CELL_WIDTH_MM = 87;
const CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM = 37;
const CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM = CARD_CANVA_FLASHCARD_CELL_WIDTH_MM;
const CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM = CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM * 2;
const CARD_CANVA_SYLLABLE_CELL_WIDTH_MM = 87;
const CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM = 37;

function CardCanvaPrintPageFrame({
  title,
  titleStyle,
  logoSrc,
  footer,
  showFooter = false,
  pageStyle,
  children,
}: {
  title?: string;
  titleStyle: React.CSSProperties;
  logoSrc?: string;
  footer?: string;
  showFooter?: boolean;
  pageStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: CARD_CANVA_PAGE_WIDTH,
        height: CARD_CANVA_PAGE_HEIGHT,
        ...pageStyle,
      }}
    >
      {title ? (
        <div
          style={{
            position: "absolute",
            left: CARD_CANVA_FRAME_X,
            top: CARD_CANVA_TITLE_Y,
            width: CARD_CANVA_FRAME_WIDTH,
            height: CARD_CANVA_TITLE_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          <h3 className="text-cv-xl" style={{ ...titleStyle, margin: 0 }}>
            {title}
          </h3>
        </div>
      ) : null}
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt=""
          style={{
            position: "absolute",
            top: CARD_CANVA_LOGO_TOP,
            right: CARD_CANVA_LOGO_RIGHT,
            width: CARD_CANVA_LOGO_SIZE,
            height: CARD_CANVA_LOGO_SIZE,
            objectFit: "contain",
            zIndex: 2,
          }}
        />
      ) : null}
      {children}
      {showFooter && footer ? (
        <div
          style={{
            position: "absolute",
            left: CARD_CANVA_FRAME_X,
            bottom: CARD_CANVA_FOOTER_BOTTOM,
            width: CARD_CANVA_FRAME_WIDTH,
            fontSize: "7pt",
            fontWeight: 500,
            lineHeight: 1.1,
            textAlign: "left",
            color: "#475569",
            margin: 0,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function CardCanvaPrintContentArea({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_CANVA_FRAME_X,
        top: CARD_CANVA_CONTENT_TOP,
        bottom: CARD_CANVA_CONTENT_BOTTOM,
        width: CARD_CANVA_FRAME_WIDTH,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function DominoView({ block, mode, brand = "edoomio", primaryColor = "#1a1a1a", accentColor, headlineFont, headingWeights, headingColor }: { block: DominoBlock; mode: ViewMode; brand?: Brand; primaryColor?: string; accentColor?: string | null; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; headingColor?: string }) {
  const items = getDominoItems(block.items);
  const pairs = getDominoPairs(block);
  const orderedEntries = pairs.flatMap(({ pairItems, itemIndices }) =>
    pairItems.map((item, itemOffset) => ({
      item,
      itemIndex: itemIndices[itemOffset] ?? 0,
    })),
  );
  const lastItemIndex = Math.max(0, items.length - 1);
  const isPrint = mode === "print";
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const viewerTextClass = getDominoEditorTextClass(block.textSize);
  const printFontSize = getDominoPrintFontSize(block.textSize);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const titleStyle: React.CSSProperties = {
    width: "100%",
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
    textAlign: "left",
  };

  if (isPrint) {
    const cardsPerPage = 24;
    const pageCount = Math.max(1, Math.ceil(orderedEntries.length / cardsPerPage));
    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const start = pageIndex * cardsPerPage;
      const pageEntries = orderedEntries.slice(start, start + cardsPerPage);
      return Array.from({ length: cardsPerPage }, (_, slotIndex) => pageEntries[slotIndex] ?? null);
    });

    return (
      <>
        {pages.map((pageItems, pageIndex) => (
          <CardCanvaPrintPageFrame
            key={`domino-print-page-${pageIndex}`}
            title={title}
            titleStyle={titleStyle}
            logoSrc={logoSrc}
            pageStyle={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              breakAfter: pageIndex < pages.length - 1 ? "page" : undefined,
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : undefined,
            }}
          >
            <CardCanvaPrintContentArea>
              <div
                style={{
                  position: "relative",
                  width: CARD_CANVA_FRAME_WIDTH,
                  height: `${CARD_CANVA_DOMINO_CELL_HEIGHT_MM * 4}mm`,
                  isolation: "isolate",
                }}
              >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(6, ${CARD_CANVA_DOMINO_CELL_WIDTH_MM}mm)`,
                  gridTemplateRows: `repeat(4, ${CARD_CANVA_DOMINO_CELL_HEIGHT_MM}mm)`,
                  width: CARD_CANVA_FRAME_WIDTH,
                  height: `${CARD_CANVA_DOMINO_CELL_HEIGHT_MM * 4}mm`,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {pageItems.map((entry, slotIndex) => {
                  const item = entry?.item ?? null;
                  const itemIndex = entry?.itemIndex ?? null;
                  const displayText = itemIndex === 0 ? "START" : itemIndex === lastItemIndex ? "ZIEL" : item?.text;
                  const isSpecialItem = itemIndex === 0 || itemIndex === lastItemIndex;
                  const isEvenItem = itemIndex !== null ? (itemIndex + 1) % 2 === 0 : false;
                  const showFooter = Boolean(footer) && slotIndex % 2 === 0 && itemIndex !== 0;

                  return (
                    <div
                      key={item?.id || `domino-print-slot-${pageIndex}-${slotIndex}`}
                      style={{
                        position: "relative",
                        width: `${CARD_CANVA_DOMINO_CELL_WIDTH_MM}mm`,
                        height: `${CARD_CANVA_DOMINO_CELL_HEIGHT_MM}mm`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4mm",
                        textAlign: "center",
                        backgroundImage: item?.imageUrl ? `url(${item.imageUrl})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      {isEvenItem && logoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoSrc}
                          alt=""
                          style={{
                            position: "absolute",
                            top: "2.5mm",
                            right: "2.5mm",
                            width: "6.5mm",
                            height: "6.5mm",
                            objectFit: "contain",
                          }}
                        />
                      ) : null}
                      {block.showSpeakerIcons && item?.speakerIcon ? (
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            bottom: "2mm",
                            transform: "translateX(-50%)",
                            zIndex: 1,
                            padding: "1mm",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.82)",
                          }}
                        >
                          <DialogueSpeakerIconGlyph icon={item.speakerIcon} brandSlug={brand} className="h-[15px] w-[15px] object-contain" />
                        </div>
                      ) : null}
                      {displayText?.trim() ? (
                        <div
                          style={{
                            position: "relative",
                            zIndex: 1,
                            padding: isSpecialItem ? 0 : "2mm 0",
                            borderRadius: isSpecialItem ? 0 : "4px",
                            background: isSpecialItem ? "transparent" : "rgba(255,255,255,0.82)",
                            fontSize: isSpecialItem ? "24pt" : printFontSize,
                            fontWeight: isSpecialItem ? 700 : 500,
                            lineHeight: isSpecialItem ? 1 : 1.2,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {displayText}
                        </div>
                      ) : null}
                      {showFooter ? (
                        <div
                          style={{
                            position: "absolute",
                            left: "2.5mm",
                            top: "2mm",
                            zIndex: 1,
                            maxWidth: "18mm",
                            borderRadius: "3px",
                            background: "rgba(255,255,255,0.82)",
                            padding: "0.5mm 1mm",
                            fontSize: "7pt",
                            fontWeight: 500,
                            lineHeight: 1.1,
                            textAlign: "left",
                            color: "#475569",
                          }}
                        >
                          {footer}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 20,
                  pointerEvents: "none",
                }}
              >
                {Array.from({ length: 7 }, (_, lineIndex) => {
                  const isDashed = lineIndex % 2 === 0;
                  return (
                    <div
                      key={`domino-v-line-stroke-${pageIndex}-${lineIndex}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: `${lineIndex * CARD_CANVA_DOMINO_CELL_WIDTH_MM}mm`,
                        width: 0,
                        height: `${CARD_CANVA_DOMINO_CELL_HEIGHT_MM * 4}mm`,
                        borderLeft: isDashed ? CUT_LINE_DASHED_BORDER : CUT_LINE_SOLID_BORDER,
                      }}
                    />
                  );
                })}
                {Array.from({ length: 5 }, (_, lineIndex) => (
                  <div
                    key={`domino-h-line-stroke-${pageIndex}-${lineIndex}`}
                    style={{
                      position: "absolute",
                      left: 0,
                      top: `${lineIndex * CARD_CANVA_DOMINO_CELL_HEIGHT_MM}mm`,
                      width: CARD_CANVA_FRAME_WIDTH,
                      height: 0,
                      borderTop: CUT_LINE_DASHED_BORDER,
                    }}
                  />
                ))}
                {Array.from({ length: 7 }, (_, lineIndex) => {
                  const isDashed = lineIndex % 2 === 0;
                  if (!isDashed) {
                    return null;
                  }

                  return (
                    <React.Fragment key={`domino-v-line-scissors-${pageIndex}-${lineIndex}`}>
                      <Scissors
                        aria-hidden="true"
                        style={{
                          ...CUT_ICON_STYLE_BASE,
                          left: `calc(${lineIndex * CARD_CANVA_DOMINO_CELL_WIDTH_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                          top: `calc(-${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                          transform: "rotate(90deg)",
                        }}
                      />
                      <Scissors
                        aria-hidden="true"
                        style={{
                          ...CUT_ICON_STYLE_BASE,
                          left: `calc(${lineIndex * CARD_CANVA_DOMINO_CELL_WIDTH_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                          top: `calc(${CARD_CANVA_DOMINO_CELL_HEIGHT_MM * 4}mm + ${CUT_ICON_GAP_MM}mm)`,
                          transform: "rotate(-90deg)",
                        }}
                      />
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: 5 }, (_, lineIndex) => (
                  <React.Fragment key={`domino-h-line-scissors-${pageIndex}-${lineIndex}`}>
                    <Scissors
                      aria-hidden="true"
                      style={{
                        ...CUT_ICON_STYLE_BASE,
                        left: `calc(-${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                        top: `calc(${lineIndex * CARD_CANVA_DOMINO_CELL_HEIGHT_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                      }}
                    />
                    <Scissors
                      aria-hidden="true"
                      style={{
                        ...CUT_ICON_STYLE_BASE,
                        left: `calc(${CARD_CANVA_FRAME_WIDTH} + ${CUT_ICON_GAP_MM}mm)`,
                        top: `calc(${lineIndex * CARD_CANVA_DOMINO_CELL_HEIGHT_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                        transform: "rotate(180deg)",
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
            </CardCanvaPrintContentArea>
          </CardCanvaPrintPageFrame>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? <h3 className="text-cv-xl" style={titleStyle}>{title}</h3> : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
      {pairs.map(({ pairItems, pairIndex, itemIndices }) => (
        <div key={`domino-view-pair-${pairIndex}`} className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background break-inside-avoid">
          {pairItems.map((item, itemOffset) => {
            const itemIndex = itemIndices[itemOffset] ?? 0;
            const displayText = itemIndex === 0 ? "START" : itemIndex === lastItemIndex ? "ZIEL" : item.text;
            const isSpecialItem = itemIndex === 0 || itemIndex === lastItemIndex;
            const isEvenItem = (itemIndex + 1) % 2 === 0;
            const showFooter = Boolean(footer) && itemOffset === 0 && itemIndex !== 0;
            return (
              <div
                key={item.id || `${pairIndex}-${itemOffset}`}
                className={`relative flex h-[28mm] w-[36mm] flex-col p-2 ${itemOffset === 0 ? "border-r border-border" : ""} items-center justify-center`}
                style={
                  item.imageUrl
                    ? {
                        backgroundImage: `url(${item.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                  {isEvenItem && logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt=""
                      className="absolute top-2 right-2 h-[18px] w-[18px] object-contain"
                    />
                  ) : null}
                {block.showSpeakerIcons && item.speakerIcon ? (
                  <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/85 p-1">
                    <DialogueSpeakerIconGlyph icon={item.speakerIcon} brandSlug={brand} className="h-6 w-6 object-contain" />
                  </div>
                ) : null}
                {!item.imageUrl ? (
                  <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                ) : null}
                {displayText?.trim() ? (
                    <div className={`relative z-10 whitespace-pre-wrap text-center break-words ${isSpecialItem ? "text-3xl font-bold leading-none" : `rounded-sm bg-background/80 py-1 ${viewerTextClass}`}`}>
                    {displayText}
                  </div>
                ) : null}
                {showFooter ? (
                  <div className="absolute left-2 top-1.5 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                    {footer}
                  </div>
                ) : null}
              </div>
            );
          })}
          {pairItems.length === 1 ? <div className="h-[28mm] w-[36mm] bg-background" /> : null}
        </div>
      ))}
      </div>
    </div>
  );
}

function FlashcardsView({ block, mode, brand = "edoomio", primaryColor = "#1a1a1a", accentColor, headlineFont, headingWeights, headingColor }: { block: FlashcardsBlock; mode: ViewMode; brand?: Brand; primaryColor?: string; accentColor?: string | null; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; headingColor?: string }) {
  const items = getFlashcardItems(block.items);
  const pairs = getFlashcardPairs(block);
  const flashcardBlankTokenPattern = /\{\{blank\*?(?::[^}]*)?\}\}/;
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const viewerTextClass = getDominoEditorTextClass(block.textSize);
  const printFontSize = getDominoPrintFontSize(block.textSize);
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const titleStyle: React.CSSProperties = {
    width: "100%",
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
    textAlign: "left",
  };
  const cutIconGap = "2.5mm";
  const cutIconStyleBase: React.CSSProperties = {
    position: "absolute",
    width: "3.5mm",
    height: "3.5mm",
    color: "#9ca3af",
    strokeWidth: 1.75,
    overflow: "visible",
  };

  const renderPrintPage = (
    entries: Array<{ frontItem: FlashcardsBlock["items"][number] | null; backItem: FlashcardsBlock["items"][number] | null; sideIndex: number } | null>,
    pageKey: string,
    showCutLines: boolean,
  ) => (
    <CardCanvaPrintPageFrame
      key={pageKey}
      title={title}
      titleStyle={titleStyle}
      pageStyle={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        breakAfter: "page",
        pageBreakAfter: "always",
      }}
    >
      <CardCanvaPrintContentArea>
        <div
          style={{
            position: "relative",
            width: CARD_CANVA_FRAME_WIDTH,
            height: `${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM * 4}mm`,
          }}
        >
        {showCutLines ? Array.from({ length: 4 }, (_, lineIndex) => (
          <React.Fragment key={`${pageKey}-v-${lineIndex}`}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${lineIndex * CARD_CANVA_FLASHCARD_CELL_WIDTH_MM}mm`,
                height: `${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM * 4}mm`,
                borderLeft: "1px dashed #9ca3af",
              }}
            />
            <Scissors
              aria-hidden="true"
              style={{
                ...cutIconStyleBase,
                left: `calc(${lineIndex * CARD_CANVA_FLASHCARD_CELL_WIDTH_MM}mm - 1.75mm)`,
                top: `calc(-3.5mm - ${cutIconGap})`,
                transform: "rotate(90deg)",
              }}
            />
            <Scissors
              aria-hidden="true"
              style={{
                ...cutIconStyleBase,
                left: `calc(${lineIndex * CARD_CANVA_FLASHCARD_CELL_WIDTH_MM}mm - 1.75mm)`,
                top: `calc(${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM * 4}mm + ${cutIconGap})`,
                transform: "rotate(-90deg)",
              }}
            />
          </React.Fragment>
        )) : null}
        {showCutLines ? Array.from({ length: 5 }, (_, lineIndex) => (
          <React.Fragment key={`${pageKey}-h-${lineIndex}`}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: `${lineIndex * CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM}mm`,
                width: CARD_CANVA_FRAME_WIDTH,
                borderTop: "1px dashed #9ca3af",
              }}
            />
            <Scissors
              aria-hidden="true"
              style={{
                ...cutIconStyleBase,
                left: `calc(-3.5mm - ${cutIconGap})`,
                top: `calc(${lineIndex * CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM}mm - 1.75mm)`,
              }}
            />
            <Scissors
              aria-hidden="true"
              style={{
                ...cutIconStyleBase,
                left: `calc(${CARD_CANVA_FRAME_WIDTH} + ${cutIconGap})`,
                top: `calc(${lineIndex * CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM}mm - 1.75mm)`,
                transform: "rotate(180deg)",
              }}
            />
          </React.Fragment>
        )) : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(3, ${CARD_CANVA_FLASHCARD_CELL_WIDTH_MM}mm)`,
            gridTemplateRows: `repeat(4, ${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM}mm)`,
            width: CARD_CANVA_FRAME_WIDTH,
            height: `${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM * 4}mm`,
          }}
        >
          {entries.map((entry, index) => {
            const item = (entry?.sideIndex ?? 0) === 0 ? entry?.frontItem ?? null : entry?.backItem ?? null;
            const displayText = getFlashcardDisplayText(entry?.frontItem ?? null, entry?.backItem ?? null, entry?.sideIndex ?? 0);
            const isSolvedBackFallback =
              (entry?.sideIndex ?? 0) === 1 &&
              !entry?.backItem?.text?.trim() &&
              flashcardBlankTokenPattern.test(entry?.frontItem?.text ?? "");
            return (
              <div
                key={item?.id || `${pageKey}-slot-${index}`}
                style={{
                  position: "relative",
                  width: `${CARD_CANVA_FLASHCARD_CELL_WIDTH_MM}mm`,
                  height: `${CARD_CANVA_FLASHCARD_CELL_HEIGHT_MM}mm`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4mm",
                  textAlign: "center",
                  backgroundImage: item?.imageUrl ? `url(${item.imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {displayText?.trim() ? (
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      padding: "2mm 0",
                      borderRadius: "4px",
                      background: "rgba(255,255,255,0.82)",
                      fontSize: printFontSize,
                      fontWeight: 500,
                      lineHeight: 1.2,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {isSolvedBackFallback
                      ? renderSolvedFlashcardBackText(entry?.frontItem?.text ?? "")
                      : renderCardTextWithBlanks(displayText, {
                          minHeight: "1.1em",
                        })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
      </CardCanvaPrintContentArea>
    </CardCanvaPrintPageFrame>
  );

  if (mode === "print") {
    const pairChunks = Array.from({ length: Math.max(1, Math.ceil(pairs.length / 12)) }, (_, pageIndex) =>
      pairs.slice(pageIndex * 12, pageIndex * 12 + 12),
    );

    const mirrorBackEntries = <T,>(entries: T[]): T[] => {
      const mirrored: T[] = [];
      for (let rowIndex = 0; rowIndex < entries.length / 3; rowIndex += 1) {
        const row = entries.slice(rowIndex * 3, rowIndex * 3 + 3);
        mirrored.push(...row.reverse());
      }
      return mirrored;
    };

    return (
      <>
        {pairChunks.flatMap((pairChunk, chunkIndex) => {
          const frontEntries = Array.from({ length: 12 }, (_, index) => ({ frontItem: pairChunk[index]?.pairItems[0] ?? null, backItem: pairChunk[index]?.pairItems[1] ?? null, sideIndex: 0 }));
          const rawBackEntries = Array.from({ length: 12 }, (_, index) => ({ frontItem: pairChunk[index]?.pairItems[0] ?? null, backItem: pairChunk[index]?.pairItems[1] ?? null, sideIndex: 1 }));
          const backEntries = mirrorBackEntries(rawBackEntries);
          const pages = [
            renderPrintPage(frontEntries, `flashcards-front-${chunkIndex}`, true),
            renderPrintPage(backEntries, `flashcards-back-${chunkIndex}`, false),
          ];
          const lastPageIndex = pages.length - 1;
          return pages.map((page, pageIndex) => React.cloneElement(page, {
            key: page.key,
            style: {
              ...(page.props.style || {}),
              breakAfter: chunkIndex === pairChunks.length - 1 && pageIndex === lastPageIndex ? undefined : "page",
              pageBreakAfter: chunkIndex === pairChunks.length - 1 && pageIndex === lastPageIndex ? undefined : "always",
            },
          }));
        })}
      </>
    );
  }

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? <h3 className="text-cv-xl" style={titleStyle}>{title}</h3> : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
        {pairs.map(({ pairItems, pairIndex }) => (
          <div key={`flashcards-view-pair-${pairIndex}`} className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background break-inside-avoid">
            {pairItems.map((item, itemOffset) => (
              (() => {
                const displayText = getFlashcardDisplayText(pairItems[0], pairItems[1], itemOffset);
                const isSolvedBackFallback =
                  itemOffset === 1 &&
                  !pairItems[1]?.text?.trim() &&
                  flashcardBlankTokenPattern.test(pairItems[0]?.text ?? "");
                const showFooter = Boolean(footer) && itemOffset === 0;
                return (
              <div
                key={item.id || `${pairIndex}-${itemOffset}`}
                className={`relative flex h-[28mm] w-[36mm] flex-col p-2 ${itemOffset === 0 ? "border-r border-border" : ""} items-center justify-center`}
                style={
                  item.imageUrl
                    ? {
                        backgroundImage: `url(${item.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                {itemOffset === 0 && logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    className="absolute top-2 right-2 h-[18px] w-[18px] object-contain"
                  />
                ) : null}
                {!item.imageUrl ? (
                  <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                ) : null}
                {displayText.trim() ? (
                  <div className={`relative z-10 whitespace-pre-wrap text-center break-words rounded-sm bg-background/80 py-1 ${viewerTextClass}`}>
                    {isSolvedBackFallback ? renderSolvedFlashcardBackText(pairItems[0]?.text ?? "") : renderCardTextWithBlanks(displayText, { minHeight: "1.05em" })}
                  </div>
                ) : null}
                {showFooter ? (
                  <div className="absolute bottom-1.5 left-2 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                    {footer}
                  </div>
                ) : null}
              </div>
                );
              })()
            ))}
            {pairItems.length === 1 ? <div className="h-[28mm] w-[36mm] bg-background" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardPairsView({ block, mode, brand = "edoomio", primaryColor = "#1a1a1a", accentColor, headlineFont, headingWeights, headingColor }: { block: CardPairsBlock; mode: ViewMode; brand?: Brand; primaryColor?: string; accentColor?: string | null; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; headingColor?: string }) {
  const items = getCardPairItems(block.items);
  const pairs = getCardPairs(block);
  const pairingMode = block.pairingMode ?? "same";
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const viewerTextClass = getDominoEditorTextClass(block.textSize);
  const printFontSize = getDominoPrintFontSize(block.textSize);
  const previewImageInset = "2.5mm";
  const printImageInset = "2.5mm";
  const printRows = 3;
  const printColumns = 6;
  const cardsPerPrintPage = printRows * printColumns;
  const printGridHeightMm = CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM * printRows;
  const printGridTopOffsetMm = (CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM * 4 - printGridHeightMm) / 2;
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const resolvedAccentColor = accentColor || primaryColor;
  const titleStyle: React.CSSProperties = {
    width: "100%",
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
    textAlign: "left",
  };

  const renderCardBackSymbol = (sideIndex: number) => {
    const isFirstSymbol = sideIndex === 0;
    const color = isFirstSymbol ? primaryColor : resolvedAccentColor;
    return (
      <div
        style={{
          width: "18mm",
          height: "18mm",
          borderRadius: isFirstSymbol ? "9999px" : "2mm",
          background: color,
        }}
      />
    );
  };

  const renderPrintPage = (
    entries: Array<{ frontItem: CardPairsBlock["items"][number] | null; backItem: CardPairsBlock["items"][number] | null; sideIndex: number } | null>,
    pageKey: string,
    isBackSide: boolean,
  ) => (
    <CardCanvaPrintPageFrame
      key={pageKey}
      title={title}
      titleStyle={titleStyle}
      logoSrc={logoSrc}
      pageStyle={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        breakAfter: "page",
        pageBreakAfter: "always",
      }}
    >
      <CardCanvaPrintContentArea>
        <div
          style={{
            position: "relative",
            width: CARD_CANVA_FRAME_WIDTH,
            height: `${CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM * 4}mm`,
            isolation: "isolate",
          }}
        >
          {Array.from({ length: 7 }, (_, lineIndex) => (
            <React.Fragment key={`${pageKey}-v-${lineIndex}`}>
              <div
                style={{
                  position: "absolute",
                  top: `${printGridTopOffsetMm}mm`,
                  left: `${lineIndex * CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM}mm`,
                  height: `${printGridHeightMm}mm`,
                  borderLeft: CUT_LINE_DASHED_BORDER,
                  zIndex: 3,
                }}
              />
              <Scissors
                aria-hidden="true"
                style={{
                  ...CUT_ICON_STYLE_BASE,
                  left: `calc(${lineIndex * CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                  top: `calc(${printGridTopOffsetMm}mm - ${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                  transform: "rotate(90deg)",
                }}
              />
              <Scissors
                aria-hidden="true"
                style={{
                  ...CUT_ICON_STYLE_BASE,
                  left: `calc(${lineIndex * CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                  top: `calc(${printGridTopOffsetMm + printGridHeightMm}mm + ${CUT_ICON_GAP_MM}mm)`,
                  transform: "rotate(-90deg)",
                }}
              />
            </React.Fragment>
          ))}
          {Array.from({ length: printRows + 1 }, (_, lineIndex) => (
            <React.Fragment key={`${pageKey}-h-${lineIndex}`}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: `${printGridTopOffsetMm + lineIndex * CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM}mm`,
                  width: CARD_CANVA_FRAME_WIDTH,
                  borderTop: CUT_LINE_DASHED_BORDER,
                  zIndex: 3,
                }}
              />
              <Scissors
                aria-hidden="true"
                style={{
                  ...CUT_ICON_STYLE_BASE,
                  left: `calc(-${CUT_ICON_SIZE_MM}mm - ${CUT_ICON_GAP_MM}mm)`,
                  top: `calc(${printGridTopOffsetMm + lineIndex * CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                }}
              />
              <Scissors
                aria-hidden="true"
                style={{
                  ...CUT_ICON_STYLE_BASE,
                  left: `calc(${CARD_CANVA_FRAME_WIDTH} + ${CUT_ICON_GAP_MM}mm)`,
                  top: `calc(${printGridTopOffsetMm + lineIndex * CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM}mm - ${CUT_ICON_HALF_SIZE_MM}mm)`,
                  transform: "rotate(180deg)",
                }}
              />
            </React.Fragment>
          ))}
          <div
            style={{
              position: "absolute",
              top: `${printGridTopOffsetMm}mm`,
              left: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${printColumns}, ${CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM}mm)`,
              gridTemplateRows: `repeat(${printRows}, ${CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM}mm)`,
              width: CARD_CANVA_FRAME_WIDTH,
              height: `${printGridHeightMm}mm`,
              zIndex: 1,
            }}
          >
            {entries.map((entry, index) => {
              const displayItem = (entry?.sideIndex ?? 0) === 0
                ? entry?.frontItem ?? null
                : pairingMode === "same"
                  ? entry?.frontItem ?? null
                  : entry?.backItem ?? null;
              const displayText = getCardPairDisplayText(entry?.frontItem ?? null, entry?.backItem ?? null, entry?.sideIndex ?? 0, pairingMode);
              const showLogo = !isBackSide && ((index + 1) % 2 === 0);
              const showFooter = !isBackSide && Boolean(footer) && index % 2 === 0;

              return (
                <div
                  key={displayItem?.id || `${pageKey}-slot-${index}`}
                  style={{
                    position: "relative",
                    width: `${CARD_CANVA_CARD_PAIR_CELL_WIDTH_MM}mm`,
                    height: `${CARD_CANVA_CARD_PAIR_CELL_HEIGHT_MM}mm`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4mm",
                    textAlign: "center",
                    background: isBackSide ? "#ffffff" : undefined,
                  }}
                >
                  {!isBackSide && displayItem?.imageUrl ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: printImageInset,
                        borderRadius: "1.5mm",
                        overflow: "hidden",
                        backgroundImage: `url(${displayItem.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  ) : null}
                  {showLogo && logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt=""
                      style={{
                        position: "absolute",
                        top: "2.5mm",
                        right: "2.5mm",
                        width: "6.5mm",
                        height: "6.5mm",
                        objectFit: "contain",
                        zIndex: 1,
                      }}
                    />
                  ) : null}
                  {isBackSide ? (
                    renderCardBackSymbol(entry?.sideIndex ?? 0)
                  ) : displayText?.trim() ? (
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        padding: "1mm 2mm",
                        borderRadius: "1.5mm",
                        background: "rgba(255,255,255,0.9)",
                        fontSize: printFontSize,
                        fontWeight: 400,
                        lineHeight: 1.2,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        width: "100%",
                      }}
                    >
                      {renderCardTextWithBlanks(displayText, { minHeight: "1.1em" })}
                    </div>
                  ) : null}
                  {showFooter ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "2.5mm",
                        top: "2mm",
                        fontSize: "7pt",
                        fontWeight: 500,
                        lineHeight: 1.1,
                        maxWidth: "18mm",
                        textAlign: "left",
                        color: "#475569",
                        background: "rgba(255,255,255,0.82)",
                        borderRadius: "3px",
                        padding: "0.5mm 1mm",
                        zIndex: 1,
                      }}
                    >
                      {footer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </CardCanvaPrintContentArea>
    </CardCanvaPrintPageFrame>
  );

  if (mode === "print") {
    const pairChunks = Array.from({ length: Math.max(1, Math.ceil(pairs.length / 9)) }, (_, pageIndex) =>
      pairs.slice(pageIndex * 9, pageIndex * 9 + 9),
    );

    const mirrorBackEntries = <T,>(entries: T[]): T[] => {
      const mirrored: T[] = [];
      for (let rowIndex = 0; rowIndex < entries.length / printColumns; rowIndex += 1) {
        const row = entries.slice(rowIndex * printColumns, rowIndex * printColumns + printColumns);
        mirrored.push(...row.reverse());
      }
      return mirrored;
    };

    return (
      <>
        {pairChunks.flatMap((pairChunk, chunkIndex) => {
          const faceEntries = pairChunk.flatMap((pair) => ([
            { frontItem: pair?.pairItems[0] ?? null, backItem: pair?.pairItems[1] ?? null, sideIndex: 0 },
            { frontItem: pair?.pairItems[0] ?? null, backItem: pair?.pairItems[1] ?? null, sideIndex: 1 },
          ]));
          const frontEntries = Array.from({ length: cardsPerPrintPage }, (_, index) => faceEntries[index] ?? null);
          const backEntries = mirrorBackEntries(Array.from({ length: cardsPerPrintPage }, (_, index) => faceEntries[index] ?? null));
          const pages = [
            renderPrintPage(frontEntries, `card-pairs-front-${chunkIndex}`, false),
            renderPrintPage(backEntries, `card-pairs-back-${chunkIndex}`, true),
          ];
          const lastPageIndex = pages.length - 1;
          return pages.map((page, pageIndex) => React.cloneElement(page, {
            key: page.key,
            style: {
              ...(page.props.style || {}),
              breakAfter: chunkIndex === pairChunks.length - 1 && pageIndex === lastPageIndex ? undefined : "page",
              pageBreakAfter: chunkIndex === pairChunks.length - 1 && pageIndex === lastPageIndex ? undefined : "always",
            },
          }));
        })}
      </>
    );
  }

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? <h3 className="text-cv-xl" style={titleStyle}>{title}</h3> : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
        {pairs.map(({ pairItems, pairIndex }) => (
          <div key={`card-pairs-view-pair-${pairIndex}`} className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background break-inside-avoid">
            {pairItems.map((item, itemOffset) => {
              const displayItem = pairingMode === "same" && itemOffset === 1 ? pairItems[0] : item;
              const displayText = getCardPairDisplayText(pairItems[0], pairItems[1], itemOffset, pairingMode);
              const showLogo = itemOffset === 1;
              const showFooter = Boolean(footer) && itemOffset === 0;
              return (
                <div
                  key={item.id || `${pairIndex}-${itemOffset}`}
                  className={`relative flex h-[34mm] w-[34mm] flex-col p-2 ${itemOffset === 0 ? "border-r border-border" : ""} items-center justify-center`}
                >
                  {showLogo && logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt=""
                      className="absolute top-2 right-2 h-[18px] w-[18px] object-contain"
                    />
                  ) : null}
                  {displayItem?.imageUrl ? (
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        inset: previewImageInset,
                        borderRadius: "1.5mm",
                        backgroundImage: `url(${displayItem.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  ) : (
                    <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                  )}
                  {displayText.trim() ? (
                    <div className={`relative z-10 whitespace-pre-wrap text-center break-words bg-background/90 px-1 py-0.5 ${viewerTextClass}`} style={{ borderRadius: "1.5mm" }}>
                      {renderCardTextWithBlanks(displayText, { minHeight: "1.05em" })}
                    </div>
                  ) : null}
                  {showFooter ? (
                    <div className="absolute left-2 top-1.5 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                      {footer}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {pairItems.length === 1 ? <div className="h-[34mm] w-[34mm] bg-background" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function AufgabenkartenView({ block, mode, brand = "edoomio", primaryColor = "#1a1a1a", accentColor, headlineFont, headingWeights, headingColor }: { block: AufgabenkartenBlock; mode: ViewMode; brand?: Brand; primaryColor?: string; accentColor?: string | null; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; headingColor?: string }) {
  const items = block.items.length > 0
    ? block.items
    : Array.from({ length: 6 }, (_, index) => ({
        id: `aufgabenkarten-item-${index + 1}`,
        text: "",
        imageUrl: "",
      }));
  const title = block.title?.trim();
  const subtitle = block.subtitle?.trim() || "";
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const viewerTextClass = getDominoEditorTextClass(block.textSize);
  const printFontSize = getDominoPrintFontSize(block.textSize);
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const titleStyle: React.CSSProperties = {
    width: "100%",
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
    textAlign: "left",
  };
  const cutIconGap = "2.5mm";
  const cutIconStyleBase: React.CSSProperties = {
    position: "absolute",
    width: "3.5mm",
    height: "3.5mm",
    color: "#9ca3af",
    strokeWidth: 1.75,
    overflow: "visible",
  };

  const glueEllipsis = (value: string) => value.replace(/\s…/g, "\u00A0…");

  const getCardContent = (item: AufgabenkartenBlock["items"][number] | null) => {
    const cardTitle = glueEllipsis(item?.title?.trim() || "");
    const cardTask = glueEllipsis((item?.task ?? item?.text ?? "").trim());
    const chunkLine = glueEllipsis((item?.chunks ?? []).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0).join(" | "));
    return { cardTitle, cardTask, chunkLine };
  };

  const renderPrintPage = (pageItems: Array<AufgabenkartenBlock["items"][number] | null>, pageKey: string) => (
    <CardCanvaPrintPageFrame
      key={pageKey}
      title={title}
      titleStyle={titleStyle}
      logoSrc={logoSrc}
      pageStyle={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        breakAfter: "page",
        pageBreakAfter: "always",
      }}
    >
      <CardCanvaPrintContentArea>
        <div style={{ position: "relative", width: CARD_CANVA_FRAME_WIDTH, height: `${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM * 2}mm` }}>
          {Array.from({ length: 4 }, (_, lineIndex) => (
            <React.Fragment key={`${pageKey}-v-${lineIndex}`}>
              <div style={{ position: "absolute", top: 0, left: `${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM}mm`, height: `${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM * 2}mm`, borderLeft: "1px dashed #9ca3af" }} />
              <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM}mm - 1.75mm)`, top: `calc(-3.5mm - ${cutIconGap})`, transform: "rotate(90deg)" }} />
              <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM}mm - 1.75mm)`, top: `calc(${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM * 2}mm + ${cutIconGap})`, transform: "rotate(-90deg)" }} />
            </React.Fragment>
          ))}
          {Array.from({ length: 3 }, (_, lineIndex) => (
            <React.Fragment key={`${pageKey}-h-${lineIndex}`}>
              <div style={{ position: "absolute", left: 0, top: `${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM}mm`, width: CARD_CANVA_FRAME_WIDTH, borderTop: "1px dashed #9ca3af" }} />
              <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(-3.5mm - ${cutIconGap})`, top: `calc(${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM}mm - 1.75mm)` }} />
              <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${CARD_CANVA_FRAME_WIDTH} + ${cutIconGap})`, top: `calc(${lineIndex * CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM}mm - 1.75mm)`, transform: "rotate(180deg)" }} />
            </React.Fragment>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM}mm)`, gridTemplateRows: `repeat(2, ${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM}mm)`, width: CARD_CANVA_FRAME_WIDTH, height: `${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM * 2}mm` }}>
            {pageItems.map((item, index) => (
              (() => {
                const { cardTitle, cardTask, chunkLine } = getCardContent(item);
                return (
              <div
                key={item?.id || `${pageKey}-slot-${index}`}
                style={{
                  position: "relative",
                  width: `${CARD_CANVA_AUFGABENKARTEN_CELL_WIDTH_MM}mm`,
                  height: `${CARD_CANVA_AUFGABENKARTEN_CELL_HEIGHT_MM}mm`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  padding: "10mm 4mm 10mm",
                  textAlign: "left",
                  backgroundImage: item?.imageUrl ? `url(${item.imageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    style={{ position: "absolute", top: "3mm", right: "3mm", width: "7mm", height: "7mm", objectFit: "contain", zIndex: 1 }}
                  />
                ) : null}
                {cardTitle || cardTask || chunkLine ? (
                  <div
                    className="aufgabenkarten-card-content max-w-none"
                    style={{ position: "relative", zIndex: 1, padding: "2mm", borderRadius: "4px", background: "rgba(255,255,255,0.82)", fontSize: printFontSize, fontWeight: 500, lineHeight: 1.2, width: "100%", textAlign: "left" }}
                  >
                    {cardTitle ? <h3>{cardTitle}</h3> : null}
                    {cardTask ? <p>{cardTask}</p> : null}
                    {chunkLine ? <p className="aufgabenkarten-chunks" style={{ color: primaryColor }}>{chunkLine}</p> : null}
                  </div>
                ) : null}
                {subtitle ? (
                  <div style={{ position: "absolute", left: "3mm", bottom: "3mm", maxWidth: "calc(100% - 6mm)", fontSize: "7pt", lineHeight: 1.1, color: "#6b7280", whiteSpace: "pre-wrap", wordBreak: "break-word", ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}) }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>
                );
              })()
            ))}
          </div>
        </div>
      </CardCanvaPrintContentArea>
    </CardCanvaPrintPageFrame>
  );

  if (mode === "print") {
    const cardsPerPage = 6;
    const pageCount = Math.max(1, Math.ceil(items.length / cardsPerPage));
    const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
      const start = pageIndex * cardsPerPage;
      const pageItems = items.slice(start, start + cardsPerPage);
      return Array.from({ length: cardsPerPage }, (_, slotIndex) => pageItems[slotIndex] ?? null);
    });

    return (
      <>
        {pages.map((pageItems, pageIndex) => {
          const page = renderPrintPage(pageItems, `aufgabenkarten-${pageIndex}`);
          return React.cloneElement(page, {
            key: page.key,
            style: {
              ...(page.props.style || {}),
              breakAfter: pageIndex < pages.length - 1 ? "page" : undefined,
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : undefined,
            },
          });
        })}
      </>
    );
  }

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? <h3 className="text-cv-xl" style={titleStyle}>{title}</h3> : null}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", width: "fit-content" }}>
        {items.map((item, index) => {
          const { cardTitle, cardTask, chunkLine } = getCardContent(item);
          return (
          <div
            key={item.id || `aufgabenkarten-view-${index}`}
            className="relative flex h-[56mm] w-[36mm] flex-col items-start justify-start overflow-hidden rounded-md border border-border bg-background px-2 pb-8 pt-8"
            style={
              item.imageUrl
                ? {
                    backgroundImage: `url(${item.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
                : undefined
            }
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                style={{ position: "absolute", top: "3mm", right: "3mm", width: "7mm", height: "7mm", objectFit: "contain" }}
              />
            ) : null}
            {!item.imageUrl ? <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" /> : null}
            {cardTitle || cardTask || chunkLine ? (
              <div
                className={`aufgabenkarten-card-content relative z-10 w-full rounded-sm bg-background/80 px-1 py-1 ${viewerTextClass}`}
                style={{ textAlign: "left" }}
              >
                {cardTitle ? <h3>{cardTitle}</h3> : null}
                {cardTask ? <p>{cardTask}</p> : null}
                {chunkLine ? <p className="aufgabenkarten-chunks" style={{ color: primaryColor }}>{chunkLine}</p> : null}
              </div>
            ) : null}
            {subtitle ? (
              <div
                className="absolute z-10 whitespace-pre-wrap break-words"
                style={{ left: "3mm", bottom: "3mm", maxWidth: "calc(100% - 6mm)", fontSize: "7pt", lineHeight: 1.1, color: "#6b7280", ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}) }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function SyllableCardsView({ block, mode, brand = "edoomio", primaryColor = "#1a1a1a", accentColor, headlineFont, headingWeights, headingColor }: { block: SyllableCardsBlock; mode: ViewMode; brand?: Brand; primaryColor?: string; accentColor?: string | null; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; headingColor?: string }) {
  const items = getFlashcardItems(block.items);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const logoSrc = BRAND_ICON_LOGOS[brand] || BRAND_ICON_LOGOS.edoomio;
  const viewerTextClass = getDominoEditorTextClass(block.textSize);
  const printFontSize = getDominoPrintFontSize(block.textSize);
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.h3 ?? brandFonts.headlineWeight;
  const titleStyle: React.CSSProperties = {
    width: "100%",
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: headingColor || primaryColor,
    textAlign: "left",
  };
  const cutIconGap = "2.5mm";
  const cutIconStyleBase: React.CSSProperties = {
    position: "absolute",
    width: "3.5mm",
    height: "3.5mm",
    color: "#9ca3af",
    strokeWidth: 1.75,
    overflow: "visible",
  };
  const renderPrintPage = (pageItems: Array<SyllableCardsBlock["items"][number] | null>, pageKey: string) => (
    <CardCanvaPrintPageFrame
      key={pageKey}
      title={title}
      titleStyle={titleStyle}
      logoSrc={logoSrc}
      pageStyle={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        breakAfter: "page",
        pageBreakAfter: "always",
      }}
    >
      <CardCanvaPrintContentArea>
        <div style={{ position: "relative", width: CARD_CANVA_FRAME_WIDTH, height: `${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM * 4}mm` }}>
        {Array.from({ length: 4 }, (_, lineIndex) => (
          <React.Fragment key={`${pageKey}-v-${lineIndex}`}>
            <div style={{ position: "absolute", top: 0, left: `${lineIndex * CARD_CANVA_SYLLABLE_CELL_WIDTH_MM}mm`, height: `${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM * 4}mm`, borderLeft: "1px dashed #9ca3af" }} />
            <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${lineIndex * CARD_CANVA_SYLLABLE_CELL_WIDTH_MM}mm - 1.75mm)`, top: `calc(-3.5mm - ${cutIconGap})`, transform: "rotate(90deg)" }} />
            <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${lineIndex * CARD_CANVA_SYLLABLE_CELL_WIDTH_MM}mm - 1.75mm)`, top: `calc(${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM * 4}mm + ${cutIconGap})`, transform: "rotate(-90deg)" }} />
          </React.Fragment>
        ))}
        {Array.from({ length: 5 }, (_, lineIndex) => (
          <React.Fragment key={`${pageKey}-h-${lineIndex}`}>
            <div style={{ position: "absolute", left: 0, top: `${lineIndex * CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM}mm`, width: CARD_CANVA_FRAME_WIDTH, borderTop: "1px dashed #9ca3af" }} />
            <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(-3.5mm - ${cutIconGap})`, top: `calc(${lineIndex * CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM}mm - 1.75mm)` }} />
            <Scissors aria-hidden="true" style={{ ...cutIconStyleBase, left: `calc(${CARD_CANVA_FRAME_WIDTH} + ${cutIconGap})`, top: `calc(${lineIndex * CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM}mm - 1.75mm)`, transform: "rotate(180deg)" }} />
          </React.Fragment>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${CARD_CANVA_SYLLABLE_CELL_WIDTH_MM}mm)`, gridTemplateRows: `repeat(4, ${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM}mm)`, width: CARD_CANVA_FRAME_WIDTH, height: `${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM * 4}mm` }}>
          {pageItems.map((item, index) => (
            <div
              key={item?.id || `${pageKey}-slot-${index}`}
              style={{
                position: "relative",
                width: `${CARD_CANVA_SYLLABLE_CELL_WIDTH_MM}mm`,
                height: `${CARD_CANVA_SYLLABLE_CELL_HEIGHT_MM}mm`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4mm",
                textAlign: "center",
                backgroundImage: item?.imageUrl ? `url(${item.imageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {item?.text?.trim() ? (
                <div style={{ position: "relative", zIndex: 1, padding: "2mm 0", borderRadius: "4px", background: "rgba(255,255,255,0.82)", fontSize: printFontSize, fontWeight: 500, lineHeight: 1.2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  <SyllablesDisplay content={item.text} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        </div>
      </CardCanvaPrintContentArea>
    </CardCanvaPrintPageFrame>
  );

  if (mode === "print") {
    const itemChunks = Array.from({ length: Math.max(1, Math.ceil(items.length / 12)) }, (_, pageIndex) =>
      items.slice(pageIndex * 12, pageIndex * 12 + 12),
    );

    return (
      <>
        {itemChunks.map((itemChunk, chunkIndex) => {
          const pageItems = Array.from({ length: 12 }, (_, index) => itemChunk[index] ?? null);
          const page = renderPrintPage(pageItems, `syllable-cards-${chunkIndex}`);
          return React.cloneElement(page, {
            key: `syllable-cards-${chunkIndex}`,
            style: {
              ...(page.props.style || {}),
              breakAfter: chunkIndex === itemChunks.length - 1 ? undefined : "page",
              pageBreakAfter: chunkIndex === itemChunks.length - 1 ? undefined : "always",
            },
          });
        })}
      </>
      );
  }

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? <h3 className="text-cv-xl" style={titleStyle}>{title}</h3> : null}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", width: "fit-content" }}>
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="relative flex h-[28mm] w-[36mm] flex-col items-center justify-center overflow-hidden rounded-md border border-border bg-background px-2 pb-4 pt-2 break-inside-avoid"
            style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
          >
            {logoSrc ? <img src={logoSrc} alt="" style={{ position: "absolute", top: "2.5mm", right: "2.5mm", width: "6.5mm", height: "6.5mm", objectFit: "contain" }} /> : null}
            {item.text?.trim() ? (
              <div className={`relative z-10 rounded-sm bg-background/80 px-1 py-1 ${viewerTextClass}`}>
                <SyllablesDisplay content={item.text} textClassName="text-inherit whitespace-pre-wrap text-center break-words" />
              </div>
            ) : null}
            {footer ? (
              <div className="absolute bottom-1.5 left-2 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                {footer}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order Items View ────────────────────────────────────────
 function OrderItemsView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: OrderItemsBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  const isOnline = mode === "online";
  // Local state for when no external answer/onAnswer is provided (e.g. course viewer)
  const [localOrder, setLocalOrder] = React.useState<string[]>([]);
  const externalOrder = (answer as string[] | undefined) || [];
  const userOrder = answer !== undefined ? externalOrder : localOrder;
  const handleAnswer = (val: unknown) => {
    if (answer !== undefined) {
      onAnswer(val);
    } else {
      setLocalOrder(val as string[]);
    }
  };

  // Shuffle items deterministically based on block id for print/initial state
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.id]);

  // Initialize user order from shuffled if empty
  React.useEffect(() => {
    if (!isPrint && userOrder.length === 0 && block.items.length > 0) {
      handleAnswer(shuffledItems.map((item) => item.id));
    }
  }, [isPrint, block.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems =
    userOrder.length > 0
      ? userOrder
          .map((id) => block.items.find((item) => item.id === id))
          .filter(Boolean)
      : shuffledItems;

  const moveItem = (currentIndex: number, direction: -1 | 1) => {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= displayItems.length) return;
    const order = userOrder.length > 0 ? [...userOrder] : shuffledItems.map((item) => item.id);
    [order[currentIndex], order[newIndex]] = [
      order[newIndex],
      order[currentIndex],
    ];
    handleAnswer(order);
  };

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      <div>
        {displayItems.map((item, i) => {
          if (!item) return null;
          const isCorrect = item.correctPosition === i + 1;
          const indicatorClass = !showResults
            ? CONTROL_BOX_CLASS
            : isCorrect
              ? CONTROL_BOX_FILLED_CLASS
              : `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`;

          return (
            <div
              key={item.id}
              className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}
            >
              <ItemNumberBadge index={i + 1} className="shrink-0" />
              {isPrint && <div className={indicatorClass} />}
              <span className="flex-1">{item.text}</span>
              {!isPrint && (
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    style={{ color: "var(--viewer-interactive-color, var(--color-primary))" }}
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    aria-label={t("moveUp")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    style={{ color: "var(--viewer-interactive-color, var(--color-primary))" }}
                    onClick={() => moveItem(i, 1)}
                    disabled={i === displayItems.length - 1}
                    aria-label={t("moveDown")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inline Choices View ─────────────────────────────────────

/** Simple numeric hash for deterministic shuffle seeds. */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return hash;
}

/** Deterministic Fisher-Yates shuffle using a simple LCG PRNG. */
function seededShuffleArr<T>(arr: T[], seed: number): { item: T; originalIndex: number }[] {
  const indexed = arr.map((item, i) => ({ item, originalIndex: i }));
  let s = seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}

/** Render one inline-choices line with interactive/print mode support. */
function renderInlineChoiceViewLine(
  content: string,
  lineKey: string,
  interactive: boolean,
  selections: Record<string, string>,
  onAnswer: (value: unknown) => void,
  showResults: boolean,
  choiceCounter: { value: number },
  showSolutions = false,
  shuffleChoices = true,
  showExample = false,
): React.ReactNode[] {
  const parts = content.split(/(\{\{(?:choice:)?[^}]+\}\})/g);
  // Track whether any visible text appeared before the current part
  let hasTextBefore = false;
  let exampleUsed = false;
  return parts.map((part, i) => {
    const match = part.match(/\{\{(?:choice:)?(.+)\}\}/);
    if (match) {
      const rawOptions = match[1].split("|");
      const atStart = !hasTextBefore;
      const capitalise = (s: string) => atStart ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      const key = showExample ? `${lineKey}-example-${i}` : `choice-${choiceCounter.value}`;
      if (!showExample) {
        choiceCounter.value++;
      }
      const selectedValue = selections[key] || "";

      const starIdx = rawOptions.findIndex((o) => o.startsWith("*"));
      const options = rawOptions.map((option) => option.startsWith("*") ? option.slice(1) : option);
      const correctIndex = starIdx >= 0 ? starIdx : 0;

      const seed = hashCode(`${lineKey}-${i}`);
      const displayed = shuffleChoices
        ? seededShuffleArr(options, seed)
        : options.map((item, originalIndex) => ({ item, originalIndex }));

      const renderAsExample = showExample && !exampleUsed;
      if (renderAsExample) {
        exampleUsed = true;
        return (
          <span key={`${lineKey}-${i}`} style={{ marginLeft: 2, marginRight: 2 }}>
            {displayed.map((sh, oi) => {
              const isCorrectOpt = sh.originalIndex === correctIndex;
              const label = capitalise(sh.item);
              return (
                <span key={oi} style={{ marginRight: oi < displayed.length - 1 ? 6 : 0 }}>
                  <span
                    className={CONTROL_BOX_CLASS}
                    style={{
                      position: 'relative',
                      verticalAlign: '-3px',
                    }}
                  >
                    {isCorrectOpt ? (
                      <span
                        className="absolute inset-0 flex items-center justify-center leading-none"
                        style={{
                          fontFamily: EXAMPLE_HANDWRITING_FONT,
                          color: '#0097dc',
                          fontSize: '22px',
                          top: '-2px',
                        }}
                      >
                        X
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold" style={{ marginLeft: 3, ...(isCorrectOpt ? { color: '#0097dc' } : {}) }}>{label}</span>
                </span>
              );
            })}
          </span>
        );
      }

      if (interactive) {
        return (
          <span key={`${lineKey}-${i}`} className="inline-flex items-center gap-1 mx-0.5">
            {displayed.map((sh, oi) => {
              const isCorrectOpt = sh.originalIndex === correctIndex;
              const label = capitalise(sh.item);
              const isSelected = selectedValue === label;

              let btnClass =
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors";
              if (showResults) {
                if (isCorrectOpt) {
                  btnClass += " bg-green-100 text-green-800 font-semibold";
                } else if (isSelected && !isCorrectOpt) {
                  btnClass += " bg-red-100 text-red-800 line-through";
                } else {
                  btnClass += " text-muted-foreground";
                }
              } else if (isSelected) {
                btnClass += " bg-primary/10 text-primary font-semibold";
              } else {
                btnClass += " hover:bg-muted";
              }

              return (
                <span key={oi} className="inline-flex items-center">
                  {oi > 0 && (
                    <span className="mx-0.5 text-muted-foreground">/</span>
                  )}
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() => {
                      if (showResults) return;
                      onAnswer({ ...selections, [key]: label });
                    }}
                    disabled={showResults}
                  >
                    <span
                      className={isSelected ? `${CONTROL_BOX_CLASS} ${s.controlBoxActive}` : CONTROL_BOX_CLASS}
                    />
                    {label}
                  </button>
                </span>
              );
            })}
          </span>
        );
      }

      return (
        <span key={`${lineKey}-${i}`} style={{ marginLeft: 2, marginRight: 2 }}>
          {displayed.map((sh, oi) => {
            const isCorrectOpt = sh.originalIndex === correctIndex;
            const label = capitalise(sh.item);
            return (
              <span key={oi} style={{ marginRight: oi < displayed.length - 1 ? 6 : 0 }}>
                <span
                  className={CONTROL_BOX_CLASS}
                  style={{
                    position: 'relative',
                    verticalAlign: '-3px',
                  }}
                >
                  {isCorrectOpt && showSolutions ? (
                    <span
                      className="absolute inset-0 flex items-center justify-center leading-none"
                      style={{
                        fontFamily: EXAMPLE_HANDWRITING_FONT,
                        color: '#15803d',
                        fontSize: '22px',
                        top: '-2px',
                      }}
                    >
                      X
                    </span>
                  ) : null}
                </span>
                <span
                  className="font-semibold"
                  style={{
                    marginLeft: 3,
                    ...(isCorrectOpt && showSolutions ? { color: '#15803d' } : {}),
                  }}
                >
                  {label}
                </span>
              </span>
            );
          })}
        </span>
      );
    }
    if (part.trim().length > 0) hasTextBefore = true;
    return <span key={`${lineKey}-${i}`}>{renderTextWithSup(part)}</span>;
  });
}

function InlineChoicesView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
  accentColor,
  instructionIndex,
}: {
  block: InlineChoicesBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const selections = (answer as Record<string, string> | undefined) || {};
  const items = migrateInlineChoicesBlock(block);
  const choiceCounter = { value: 0 };
  const isOnline = mode === "online";
  const exampleItemId = block.showFirstAsExample ? items.find((item) => !item.isSpacer)?.id : undefined;

  return (
    <div>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )}
          {items.length > 0 && <SectionGap size="small" />}
        </>
      )}
      {items.map((item, idx) => (
        item.isSpacer ? (
          <div
            key={item.id || idx}
            className="flex items-center border-b last:border-b-0"
            style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
          >
            <span className="flex-1">&nbsp;</span>
          </div>
        ) : (
          <div
            key={item.id || idx}
            className="flex items-center border-b last:border-b-0"
            style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
          >
            <ItemNumberBadge index={items.slice(0, idx + 1).filter((entry) => !entry.isSpacer).length} />
            <span className="flex-1">
              {renderInlineChoiceViewLine(
                item.content,
                `line-${idx}`,
                interactive,
                selections,
                onAnswer,
                showResults,
                choiceCounter,
                showSolutions,
                block.shuffleChoices !== false,
                item.id === exampleItemId,
              )}
            </span>
          </div>
        )
      ))}
    </div>
  );
}

function MCQRowsView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: MCQRowsBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const [currentItemIndex, setCurrentItemIndex] = React.useState(0);
  const selections = (answer as Record<string, string> | undefined) || {};
  const isOnline = mode === "online";
  const exampleItemId = block.showFirstAsExample ? block.items[0]?.id : undefined;
  const choicesPerItem = Math.max(2, Math.min(6, Math.round(block.choicesPerItem || 3)));
  const choiceGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${choicesPerItem}, minmax(0, 120px))`,
  };
  const getChoiceLabel = (label: string | undefined, index: number) => {
    const value = (label || "").trim();
    return value.length > 0 ? value : String.fromCharCode(65 + index);
  };

  const currentItem = block.items[currentItemIndex];

  return (
    <div>
      {/* Mobile wizard view */}
      <div className="md:hidden overflow-x-hidden">
        <div>
          {block.instruction && (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          )}
        </div>

        {currentItem && (
          <div className="mt-4">
            {/* Item text */}
            <div className="flex items-center font-medium text-foreground">
              <span dangerouslySetInnerHTML={{ __html: normalizeInlineViewerHtml(currentItem.text) }} />
            </div>

            {/* Choices as buttons */}
            <div className="flex flex-col gap-2 mt-2">
              {currentItem.choices.map((choice, choiceIndex) => {
                const isSelected = selections[currentItem.id] === choice.id;
                const isCorrect = currentItem.correctChoiceId === choice.id;
                const effectiveShowResults = showResults || isSelected;
                const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
                const choiceLabel = getChoiceLabel(choice.label, choiceIndex);

                let bgColor = `${resolvedInteractiveColor}15`;
                if (effectiveShowResults && isOnline) {
                  if (isCorrect) {
                    bgColor = "#dcfce7";
                  } else if (isSelected && !isCorrect) {
                    bgColor = "#fee2e2";
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="flex items-center gap-3 px-4 py-2 rounded-sm text-left w-full"
                    style={{ backgroundColor: bgColor }}
                    onClick={() => {
                      if (!interactive) return;
                      onAnswer({ ...selections, [currentItem.id]: choice.id });
                    }}
                    disabled={!interactive}
                  >
                    <span className="text-xs font-bold uppercase text-muted-foreground shrink-0">
                      {choiceLabel}
                    </span>
                    <span className="flex-1">{choice.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons with progress dots */}
            <div className="flex gap-2 justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                disabled={currentItemIndex === 0}
                className="p-0 flex items-center justify-center border bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: "48px", height: "24px", lineHeight: "1", padding: "0", borderRadius: "2px" }}
              >
                ←
              </button>

              {/* Progress dots */}
              <div className="flex gap-1">
                {block.items.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentItemIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentItemIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to item ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentItemIndex(Math.min(block.items.length - 1, currentItemIndex + 1))}
                disabled={currentItemIndex === block.items.length - 1}
                className="p-0 flex items-center justify-center border bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ width: "48px", height: "24px", lineHeight: "1", padding: "0", borderRadius: "2px" }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <div>
          {block.instruction && (
            <>
              {isOnline ? (
                <div
                  className={CONSISTENT_INSTRUCTION_ROW_CLASS}
                  style={{ color: accentColor || "var(--color-primary)" }}
                >
                  <InstructionBadge instructionIndex={instructionIndex} />
                  <p className="min-w-0 flex-1">{block.instruction}</p>
                </div>
              ) : (
                <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
              )}
              {block.items.length > 0 && <SectionGap size="small" />}
            </>
          )}
        </div>

        {block.items.map((item, index) => {
          const selectedChoiceId = selections[item.id] || "";
          const isExampleRow = item.id === exampleItemId;
        return (
          <div
            key={item.id}
            className="flex items-center border-b last:border-b-0"
            style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
          >
            <ItemNumberBadge index={index + 1} />
            <span className="flex-1 min-w-0" dangerouslySetInnerHTML={{ __html: normalizeInlineViewerHtml(item.text) }} />
            <div className="grid shrink-0 gap-2" style={choiceGridStyle}>
              {item.choices.map((choice, choiceIndex) => {
                const isCorrect = item.correctChoiceId === choice.id;
                const isSelected = selectedChoiceId === choice.id;
                const showCorrect = showResults || showSolutions;
                const showSolutionOverlay = showSolutions && isCorrect;
                const showExampleOverlay = isExampleRow && isCorrect;
                const choiceLabel = getChoiceLabel(choice.label, choiceIndex);

                let className = "inline-flex items-center gap-1.5 text-left transition-colors";
                let choiceStyle: React.CSSProperties | undefined;
                if (showExampleOverlay) {
                  choiceStyle = { color: "#0097dc" };
                } else if (showCorrect && isCorrect) {
                  className += " text-green-700";
                } else if (showResults && isSelected && !isCorrect) {
                  className += " text-red-700";
                } else if (isSelected) {
                  className += " text-primary";
                } else {
                  className += " text-foreground";
                }

                const indicatorClass = showCorrect && isCorrect
                  ? CONTROL_BOX_FILLED_CLASS
                  : isSelected
                    ? `${CONTROL_BOX_CLASS} ${s.controlBoxActive}`
                    : CONTROL_BOX_CLASS;

                const content = (
                  <>
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">
                      {choiceLabel}
                    </span>
                    {showExampleOverlay
                      ? renderHandwrittenMatrixIndicator("#0097dc")
                      : showSolutionOverlay
                      ? renderHandwrittenMatrixIndicator("#15803d")
                      : <span className={indicatorClass} />}
                    <span>{choice.text}</span>
                  </>
                );

                if (interactive) {
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={className}
                      style={choiceStyle}
                      onClick={() => {
                        if (showResults || isExampleRow) return;
                        onAnswer({ ...selections, [item.id]: choice.id });
                      }}
                      disabled={showResults || isExampleRow}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <span key={choice.id} className={className} style={choiceStyle}>
                    {content}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/** Render text that may contain <sup>...</sup> tags as React elements. */
function renderTextWithSup(text: string): React.ReactNode[] {
  const parts = text.split(/(<sup>[^<]*<\/sup>)/g);
  return parts.map((p, i) => {
    const m = p.match(/^<sup>([^<]*)<\/sup>$/);
    if (m) {
      return (
        <span
          key={i}
          className="text-muted-foreground"
          style={{ fontSize: '0.6em', position: 'relative', top: '-0.5em', marginLeft: 2, lineHeight: 0 }}
        >
          {m[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ─── Word Search View ────────────────────────────────────────
 function WordSearchView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: WordSearchBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const selectedCells = (answer as string[] | undefined) || [];
  const isPrint = mode === "print";
  const isOnline = mode === "online";
  const rowHeight = block.rowHeight ?? 1.9;
  const gridContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const exampleWord = block.showFirstAsExample ? block.words[0] : undefined;
  const examplePlacement = useMemo(
    () => (exampleWord ? findWordSearchPlacements(block.grid, [exampleWord], block.allowedDirections)[0] ?? null : null),
    [block.allowedDirections, block.grid, exampleWord],
  );

  const solutionPlacements = useMemo(
    () => (!interactive && showSolutions ? findWordSearchPlacements(block.grid, block.words, block.allowedDirections) : []),
    [block.allowedDirections, block.grid, block.words, interactive, showSolutions],
  );

  React.useLayoutEffect(() => {
    const needsHighlightMeasurement = !interactive && (!!examplePlacement || showSolutions);
    if (!needsHighlightMeasurement) {
      setGridSize((current) => (current.width === 0 && current.height === 0 ? current : { width: 0, height: 0 }));
      return;
    }

    const container = gridContainerRef.current;
    if (!container) return;

    const measure = () => {
      setGridSize({ width: container.offsetWidth, height: container.offsetHeight });
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [interactive, showSolutions, block.grid, examplePlacement]);

  const solutionHighlights = useMemo(() => {
    if (interactive || gridSize.width <= 0 || gridSize.height <= 0 || block.grid.length === 0) {
      return [];
    }

    const colCount = block.grid[0]?.length || 0;
    const rowCount = block.grid.length;
    if (colCount === 0 || rowCount === 0) return [];

    const cellWidth = gridSize.width / colCount;
    const cellHeight = gridSize.height / rowCount;

    const buildHighlight = (placement: { startRow: number; startCol: number; endRow: number; endCol: number }, stroke: string) => {
      const startX = (placement.startCol + 0.5) * cellWidth;
      const startY = (placement.startRow + 0.5) * cellHeight;
      const endX = (placement.endCol + 0.5) * cellWidth;
      const endY = (placement.endRow + 0.5) * cellHeight;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const centerX = (startX + endX) / 2;
      const centerY = (startY + endY) / 2;
      const segmentLength = Math.hypot(deltaX, deltaY);
      const unitX = segmentLength > 0 ? deltaX / segmentLength : 1;
      const unitY = segmentLength > 0 ? deltaY / segmentLength : 0;
      const alongCellExtent = Math.abs(unitX) * cellWidth + Math.abs(unitY) * cellHeight;
      const acrossCellExtent = Math.abs(unitY) * cellWidth + Math.abs(unitX) * cellHeight;

      return {
        x: centerX,
        y: centerY,
        width: segmentLength + alongCellExtent * 0.92,
        height: Math.max(14, acrossCellExtent * 0.76),
        angle: Math.atan2(deltaY, deltaX) * 180 / Math.PI,
        stroke,
      };
    };

    const highlights = examplePlacement ? [buildHighlight(examplePlacement, "#0097dc")] : [];

    if (showSolutions) {
      solutionPlacements
        .filter((placement) => placement.wordIndex !== 0 || !block.showFirstAsExample)
        .forEach((placement) => {
          highlights.push(buildHighlight(placement, "#15803d"));
        });
    }

    return highlights;
  }, [showSolutions, interactive, gridSize, block.grid, solutionPlacements, examplePlacement, block.showFirstAsExample]);

  const toggleCell = (key: string) => {
    if (!interactive) return;
    const newSelection = selectedCells.includes(key)
      ? selectedCells.filter((k) => k !== key)
      : [...selectedCells, key];
    onAnswer(newSelection);
  };

  if (block.grid.length === 0) return null;

  return (
    <div>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
                <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
              <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )}
          {(block.showWordList || block.grid.length > 0) && <SectionGap size="large" />}
        </>
      )}
      {block.showWordList && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {block.words.map((word, i) => (
              <span
                key={i}
                className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} bg-background`}
                style={block.showFirstAsExample && i === 0 ? { color: "#0097dc" } : undefined}
              >
                {block.showFirstAsExample && i === 0 ? <RoughExampleStrike>{word}</RoughExampleStrike> : word}
              </span>
            ))}
          </div>
          {block.grid.length > 0 && <SectionGap size="medium" />}
        </>
      )}
      <div ref={gridContainerRef} className="relative w-full">
        <RoughRoundedRectHighlights
          highlights={solutionHighlights}
          width={gridSize.width}
          height={gridSize.height}
        />
        <table className="w-full table-fixed border-separate border-spacing-0">
          <tbody>
            {block.grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const key = `${ri}-${ci}`;
                  const isSpaceCell = cell === " ";
                  const isSelected = selectedCells.includes(key);
                  const isTop = ri === 0;
                  const isLeft = ci === 0;
                  const isTopLeft = isTop && isLeft;
                  const isTopRight = isTop && ci === row.length - 1;
                  const isBottomLeft = ri === block.grid.length - 1 && isLeft;
                  const isBottomRight = ri === block.grid.length - 1 && ci === row.length - 1;
                  const cellStyle: React.CSSProperties = {
                    ...(isSpaceCell ? {
                      backgroundColor: "transparent",
                    } : {}),
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    ...(isTop ? { borderTop: '1px solid var(--color-border)' } : {}),
                    ...(isLeft ? { borderLeft: '1px solid var(--color-border)' } : {}),
                    ...(isTopLeft ? { borderTopLeftRadius: 4 } : {}),
                    ...(isTopRight ? { borderTopRightRadius: 4 } : {}),
                    ...(isBottomLeft ? { borderBottomLeftRadius: 4 } : {}),
                    ...(isBottomRight ? { borderBottomRightRadius: 4 } : {}),
                    ...(isPrint ? { fontWeight: 500 } : {}),
                  };
                  return (
                    <td
                      key={ci}
                      className={`p-0 text-center font-mono select-none transition-colors ${isPrint ? '' : 'font-medium'}
                        ${!isSpaceCell && interactive ? "cursor-pointer hover:bg-primary/10" : ""}
                        ${isSelected && !isSpaceCell ? "bg-primary/20 text-primary" : ""}`}
                      style={{
                        ...cellStyle,
                        height: `${rowHeight}rem`,
                      }}
                      onClick={() => !isSpaceCell && toggleCell(key)}
                    >
                      <div className="flex h-full items-center justify-center leading-none">
                        {!isSpaceCell && cell}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrosswordView({
  block,
  mode,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: CrosswordBlock;
  mode: ViewMode;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  const isOnline = mode === "online";
  const itemNumberFormat = React.useContext(ItemNumberFormatContext);

  if (block.generationError) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {t("generationFailed")}
      </div>
    );
  }

  if (block.grid.length === 0) {
    return null;
  }

  return (
    <div>
      {block.instruction ? (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      ) : null}
      <div className="mt-5">
        <CrosswordLayout
          grid={block.grid}
          placements={block.placements}
          showSolutions={showSolutions}
          cellSize="30px"
          fixedCellSize
          clueTextClassName="text-foreground"
          clueNumberFormat={itemNumberFormat}
          renderClueNumber={(clueNumber) => <ItemNumberBadge index={clueNumber} />}
        />
      </div>
    </div>
  );
}

// ─── Sorting Categories View ────────────────────────────────
// ─── Sorting Categories View ──────────────────────────────
 function SortingCategoriesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: SortingCategoriesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
})  {
  const t = useTranslations("viewer");
  const userSorting = (answer as Record<string, string[]> | undefined) || {};
  const [dragItem, setDragItem] = useState<string | null>(null);
  const isOnline = mode === "online";
  const colorCodeEnabled = !!block.colorCode;
  const useTwoColumnCategoryLines = block.categories.length === 2 && !!block.twoColumnCategoryLines;

  const categoryPalette = [
    { headerBg: "#F9F1EA", headerText: "#334155", headerBorder: "#F9F1EA", itemBg: "#FCF8F5", itemText: "#334155", itemBorder: "#F9F1EA" },
    { headerBg: "#EDF8EE", headerText: "#334155", headerBorder: "#EDF8EE", itemBg: "#F6FCF7", itemText: "#334155", itemBorder: "#EDF8EE" },
    { headerBg: "#ECF3F9", headerText: "#334155", headerBorder: "#ECF3F9", itemBg: "#F6F9FC", itemText: "#334155", itemBorder: "#ECF3F9" },
    { headerBg: "#F9EEF0", headerText: "#334155", headerBorder: "#F9EEF0", itemBg: "#FCF7F8", itemText: "#334155", itemBorder: "#F9EEF0" },
    { headerBg: "#EFEBF6", headerText: "#334155", headerBorder: "#EFEBF6", itemBg: "#F7F5FB", itemText: "#334155", itemBorder: "#EFEBF6" },
    { headerBg: "#F9F6ED", headerText: "#334155", headerBorder: "#F9F6ED", itemBg: "#FCFBF6", itemText: "#334155", itemBorder: "#F9F6ED" },
    { headerBg: "#F5EDF7", headerText: "#334155", headerBorder: "#F5EDF7", itemBg: "#FAF6FB", itemText: "#334155", itemBorder: "#F5EDF7" },
    { headerBg: "#F2F2F6", headerText: "#334155", headerBorder: "#F2F2F6", itemBg: "#F9F9FB", itemText: "#334155", itemBorder: "#F2F2F6" },
  ] as const;

  const getCategoryTheme = (catId: string) => {
    const catIndex = block.categories.findIndex((cat) => cat.id === catId);
    const index = catIndex >= 0 ? catIndex : 0;
    return categoryPalette[index % categoryPalette.length];
  };

  const sortedItemIds = Object.values(userSorting).flat();

  // Deterministic shuffle for initial display
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.id]);

  const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
  const exampleCategory = exampleItem
    ? block.categories.find((cat) => cat.correctItems.includes(exampleItem.id))
    : undefined;
  const exampleItemId = exampleItem?.id;
  const effectiveAnswer = exampleItemId && exampleCategory
    ? {
        ...userSorting,
        [exampleCategory.id]: [
          exampleItemId,
          ...(userSorting[exampleCategory.id] || []).filter((id) => id !== exampleItemId),
        ],
      }
    : userSorting;

  const getItemTheme = (itemId: string) => {
    const correctCat = block.categories.find((cat) => cat.correctItems.includes(itemId));
    return correctCat ? getCategoryTheme(correctCat.id) : categoryPalette[0];
  };

  const splitItemsLeftFirst = <T,>(items: T[]): [T[], T[]] => {
    const leftCount = Math.ceil(items.length / 2);
    return [items.slice(0, leftCount), items.slice(leftCount)];
  };

  const displayUnsorted = shuffledItems.filter(
    (item) => item.id === exampleItemId || !Object.values(effectiveAnswer).flat().includes(item.id)
  );

  const addToCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    for (const key of Object.keys(newSorting)) {
      newSorting[key] = newSorting[key].filter((id) => id !== itemId);
    }
    newSorting[catId] = [...(newSorting[catId] || []), itemId];
    onAnswer(newSorting);
  };

  const removeFromCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    newSorting[catId] = (newSorting[catId] || []).filter((id) => id !== itemId);
    onAnswer(newSorting);
  };

  const getItemById = (id: string) => block.items.find((item) => item.id === id);
  const SORT_ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;
  const SORT_WRITING_ROW_CLASS = isOnline
    ? "flex min-h-[49px] items-center gap-3"
    : "flex min-h-[32.5px] items-center gap-3";
  const maxItemsPerCat = Math.max(...block.categories.map((cat) => cat.correctItems.length), 0);
  const writingLineStyle = { borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 } as const;
  const writingLineBoxClass = "relative flex-1 h-8 overflow-hidden";
  const renderWritingRows = (rows: React.ReactElement[]) => {
    if (!useTwoColumnCategoryLines) {
      return <div>{rows}</div>;
    }

    const [leftRows, rightRows] = splitItemsLeftFirst(rows);
    return (
      <div className="grid grid-cols-2 gap-x-3">
        <div>{leftRows}</div>
        <div>{rightRows}</div>
      </div>
    );
  };

  // Print mode: show all items as chips + empty category boxes with writing lines
  if (!interactive) {
    return (
      <div>
        {block.instruction && (
          <>
            <InstructionRow instruction={block.instruction} accentColor={accentColor} instructionIndex={instructionIndex} />
            <SectionGap size="large" />
          </>
        )}
        <div className={CONSISTENT_ITEM_BANK_CLASS}>
          {displayUnsorted.map((item) => {
            const itemTheme = getItemTheme(item.id);
            const isExampleItem = item.id === exampleItemId;
            return (
              <span
                key={item.id}
                className={CONSISTENT_ITEM_BANK_CHIP_CLASS}
                style={colorCodeEnabled
                  ? {
                      backgroundColor: itemTheme.itemBg,
                      borderColor: itemTheme.itemBg,
                      color: isExampleItem ? itemTheme.itemText : undefined,
                    }
                  : undefined}
              >
                <span
                  style={{
                    color: isExampleItem ? '#0097dc' : undefined,
                  }}
                >
                  {isExampleItem ? <RoughExampleStrike>{item.text}</RoughExampleStrike> : item.text}
                </span>
              </span>
            );
          })}
        </div>
        <SectionGap size="medium" />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
          {block.categories.map((cat) => {
            const catTheme = getCategoryTheme(cat.id);
            const categoryExampleItem = exampleCategory?.id === cat.id ? exampleItem : undefined;
            const remainingSolutionItems = categoryExampleItem
              ? cat.correctItems
                  .filter((itemId) => itemId !== categoryExampleItem.id)
                  .map((itemId) => block.items.find((it) => it.id === itemId))
                  .filter((item): item is NonNullable<typeof item> => !!item)
              : [];
            return (
              <div
                key={cat.id}
                className="rounded overflow-hidden"
              >
              <div
                className="border-b border-t border-t-transparent flex items-center pl-2.5 pr-2 py-0.5 rounded-bl rounded-br"
                style={colorCodeEnabled
                  ? {
                      backgroundColor: catTheme.headerBg,
                      color: catTheme.headerText,
                      borderTopColor: catTheme.headerBg,
                      borderBottomColor: catTheme.headerBorder,
                    }
                  : { backgroundColor: "#f8fafc", borderTopColor: "#f8fafc", borderBottomColor: "#f8fafc" }}
              >
                <span className="font-semibold">{cat.label}</span>
              </div>
              <div>
                {categoryExampleItem ? (() => {
                  const rows: React.ReactElement[] = [
                    <div
                      key={`${cat.id}-example`}
                      className={`${SORT_WRITING_ROW_CLASS} text-cv-sm`}
                      style={colorCodeEnabled
                        ? {
                            color: catTheme.itemText,
                            borderBottomColor: catTheme.itemBorder,
                          }
                        : undefined}
                    >
                      <div className={writingLineBoxClass} style={writingLineStyle}>
                        <span
                          className="absolute inset-x-0 block leading-none"
                          style={{ bottom: '6px', fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#0097dc', fontSize: '18px' }}
                        >
                          {categoryExampleItem.text}
                        </span>
                      </div>
                    </div>,
                  ];

                  if (!showSolutions && (block.showWritingLines ?? true) && maxItemsPerCat > 1) {
                    rows.push(
                      ...Array.from({ length: maxItemsPerCat - 1 }).map((_, i) => (
                        <div key={`${cat.id}-empty-${i}`} className={SORT_WRITING_ROW_CLASS}>
                          <div className={writingLineBoxClass} style={{ ...writingLineStyle, minWidth: 80 }} />
                        </div>
                      ))
                    );
                  }

                  if (showSolutions && remainingSolutionItems.length > 0) {
                    rows.push(
                      ...remainingSolutionItems.map((item) => (
                        <div
                          key={item.id}
                          className={`${SORT_WRITING_ROW_CLASS} text-cv-sm`}
                          style={colorCodeEnabled
                            ? {
                                color: catTheme.itemText,
                                borderBottomColor: catTheme.itemBorder,
                              }
                            : undefined}
                        >
                          <div className={writingLineBoxClass} style={writingLineStyle}>
                            <span
                              className="absolute inset-x-0 block leading-none"
                              style={{ bottom: '6px', fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#15803d', fontSize: '18px' }}
                            >
                              {item.text}
                            </span>
                          </div>
                        </div>
                      ))
                    );
                  }

                  return renderWritingRows(rows);
                })() : showSolutions ? renderWritingRows(
                  cat.correctItems.flatMap((itemId) => {
                    const item = block.items.find((it) => it.id === itemId);
                    return item ? [
                      <div
                        key={itemId}
                        className={`${SORT_WRITING_ROW_CLASS} text-cv-sm`}
                        style={colorCodeEnabled
                          ? {
                              color: catTheme.itemText,
                              borderBottomColor: catTheme.itemBorder,
                            }
                          : undefined}
                      >
                        <div className={writingLineBoxClass} style={writingLineStyle}>
                          <span
                            className="absolute inset-x-0 block leading-none"
                            style={{ bottom: '6px', fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#15803d', fontSize: '18px' }}
                          >
                            {item.text}
                          </span>
                        </div>
                      </div>
                    ] : [];
                  })
                ) : (block.showWritingLines ?? true) && maxItemsPerCat > 0 ? renderWritingRows(
                  Array.from({ length: maxItemsPerCat }).map((_, i) => (
                    <div key={`${cat.id}-blank-${i}`} className={SORT_WRITING_ROW_CLASS}>
                      <div className={writingLineBoxClass} style={{ ...writingLineStyle, minWidth: 80 }} />
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          );})}
        </div>
      </div>
    );
  }

  return (
    <div>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{ color: accentColor || "var(--color-primary)" }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
          )}
          {(displayUnsorted.length > 0 || block.categories.length > 0) && <SectionGap size="large" />}
        </>
      )}
      {/* Unsorted items */}
      {displayUnsorted.length > 0 && (
        <>
          <div className={CONSISTENT_ITEM_BANK_CLASS}>
            {displayUnsorted.map((item) => {
              const catTheme = getItemTheme(item.id);
              const isExampleItem = item.id === exampleItemId;
              return (
                <span
                  key={item.id}
                  className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} cursor-grab transition-colors
                    ${dragItem === item.id ? "border-primary" : "hover:opacity-80"}`}
                  draggable={!isExampleItem}
                  onDragStart={() => {
                    if (!isExampleItem) setDragItem(item.id);
                  }}
                  onDragEnd={() => setDragItem(null)}
                  style={colorCodeEnabled
                    ? {
                        backgroundColor: catTheme.itemBg,
                        borderColor: catTheme.itemBg,
                        color: catTheme.itemText,
                      }
                    : {
                        backgroundColor: dragItem === item.id ? "var(--color-primary, #0ea5e9)" : "var(--color-background, #ffffff)",
                        borderColor: dragItem === item.id ? "var(--color-primary, #0ea5e9)" : "var(--color-border, #e2e8f0)",
                      }}
                >
                  <span
                    style={{
                      color: isExampleItem ? '#0097dc' : undefined,
                    }}
                  >
                      {isExampleItem ? <RoughExampleStrike>{item.text}</RoughExampleStrike> : item.text}
                  </span>
                </span>
              );
            })}
          </div>
          <SectionGap size="medium" />
        </>
      )}
      {/* Category boxes */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
        {block.categories.map((cat) => {
          const catTheme = getCategoryTheme(cat.id);
          const catItemIds = effectiveAnswer[cat.id] || [];
          return (
            <div
              key={cat.id}
                  className="rounded overflow-hidden transition-shadow"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-primary");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-primary");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-primary");
                if (dragItem) {
                  addToCategory(cat.id, dragItem);
                  setDragItem(null);
                }
              }}
            >
                <div
                  className="border-b border-t border-t-transparent flex items-center pl-2.5 pr-2 py-0.5 rounded-bl rounded-br"
                  style={colorCodeEnabled
                    ? {
                        backgroundColor: catTheme.headerBg,
                        color: catTheme.headerText,
                        borderTopColor: catTheme.headerBg,
                        borderBottomColor: catTheme.headerBorder,
                      }
                    : { backgroundColor: "#f8fafc", borderTopColor: "#f8fafc", borderBottomColor: "#f8fafc" }}
                >
                <span className="font-semibold">{cat.label}</span>
              </div>
              <div className="min-h-[60px]">
                {catItemIds.map((itemId, rowIndex) => {
                  const item = getItemById(itemId);
                  if (!item) return null;
                  const isCorrect = cat.correctItems.includes(item.id);
                  const indicatorClass = !showResults
                    ? CONTROL_BOX_CLASS
                    : isCorrect
                      ? CONTROL_BOX_FILLED_CLASS
                      : `${CONTROL_BOX_CLASS} border-red-500 bg-red-500 text-white`;
                  const isExampleItem = item.id === exampleItemId && cat.id === exampleCategory?.id;
                  return (
                    <div
                      key={item.id}
                        className={`${SORT_WRITING_ROW_CLASS} transition-colors`}
                      style={colorCodeEnabled
                        ? {
                            color: catTheme.itemText,
                            borderBottomColor: catTheme.itemBorder,
                          }
                        : undefined}
                    >
                      {!isExampleItem && <div className={indicatorClass} />}
                      <div className={writingLineBoxClass} style={writingLineStyle}>
                        <span
                          className="absolute inset-x-0 block leading-none"
                          style={{
                            bottom: isExampleItem ? '6px' : '4px',
                            fontFamily: isExampleItem ? EXAMPLE_HANDWRITING_FONT : undefined,
                            color: isExampleItem ? '#0097dc' : undefined,
                            fontSize: isExampleItem ? '18px' : undefined,
                          }}
                        >
                          {item.text}
                        </span>
                      </div>
                      {!showResults && !isExampleItem && (
                        <button
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground shrink-0"
                          onClick={() => removeFromCategory(cat.id, item.id)}
                          aria-label={t("removeFromCategory")}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                      {showResults && (
                        <span className={`text-cv-xs font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                          {isCorrect ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                  );
                })}
                {(block.showWritingLines ?? true) && maxItemsPerCat > catItemIds.length && (
                  <div>
                    {Array.from({ length: maxItemsPerCat - catItemIds.length }).map((_, offset) => {
                      const slotIndex = catItemIds.length + offset;
                      return (
                        <div key={`empty-${cat.id}-${slotIndex}`} className={SORT_WRITING_ROW_CLASS}>
                          <div className={writingLineBoxClass} style={{ ...writingLineStyle, minWidth: 80 }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showResults && (
        <>
          <SectionGap size="medium" />
          <p className="text-cv-xs text-muted-foreground">
            {t("resultCount", { correct: Object.entries(userSorting).reduce((total, [catId, itemIds]) => {
              const cat = block.categories.find((c) => c.id === catId);
              if (!cat) return total;
              return total + itemIds.filter((id) => cat.correctItems.includes(id)).length;
            }, 0), total: block.items.length })}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Unscramble Words View ───────────────────────────────
function scrambleWordDeterministic(
  word: string,
  keepFirst: boolean,
  lowercase: boolean,
  seed: number
): string {
  let letters = word.replace(/\s+/g, "").split("");
  let firstLetter = "";
  if (keepFirst && letters.length > 1) {
    firstLetter = letters[0];
    letters = letters.slice(1);
  }
  // Deterministic Fisher-Yates shuffle
  let s = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = Math.abs(s) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  let result = keepFirst ? firstLetter + letters.join("") : letters.join("");
  if (lowercase) result = result.toLowerCase();
  return result;
}

function UnscrambleWordsView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  bodyFont,
  bodyFontSize,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: UnscrambleWordsBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  bodyFont?: string;
  bodyFontSize?: string;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const isPrint = mode === "print";
  const fontFamily = bodyFont || "inherit";
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const isOnline = mode === "online";
  const [localAnswers, setLocalAnswers] = React.useState<Record<string, string>>({});
  const externalAnswers = (answer as Record<string, string> | undefined) || {};
  const userAnswers = answer !== undefined ? externalAnswers : localAnswers;
  const handleAnswer = (val: unknown) => {
    if (answer !== undefined) {
      onAnswer(val);
    } else {
      setLocalAnswers(val as Record<string, string>);
    }
  };

  // Compute a seed per word based on block id + word id
  const getSeed = (wordId: string) => {
    let seed = 0;
    const combined = block.id + wordId;
    for (let i = 0; i < combined.length; i++) {
      seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(seed);
  };

  // Compute max word length for consistent arrow alignment
  const maxWordLength = Math.max(...block.words.map((item) => item.word.length), 0);

  // Use persisted itemOrder if available
  const orderedWords = block.itemOrder
    ? block.itemOrder
        .map((id) => block.words.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => !!w)
        .concat(block.words.filter((w) => !block.itemOrder!.includes(w.id)))
    : block.words;

  return (
    <div className="text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{
              color: accentColor || "var(--color-primary)",
              ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
            }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow
            instruction={block.instruction}
            accentColor={accentColor}
            style={bodyFontSize ? { fontSize: bodyFontSize } : undefined}
            mode={mode}
            instructionIndex={instructionIndex}
          />
        )
      )}
      <div>
        {orderedWords.map((item, i) => {
          const scrambled = scrambleWordDeterministic(
            item.word,
            block.keepFirstLetter,
            block.lowercaseAll,
            getSeed(item.id)
          );
          const userValue = userAnswers[item.id] || "";
          const hasInput = userValue.trim() !== "";
          const isCorrect =
            hasInput &&
            userValue.trim().toLowerCase() === item.word.toLowerCase();
          const isWrong = hasInput && !isCorrect;

          return (
            <div
              key={item.id}
              className="flex min-h-[49px] items-center gap-3 border-b"
            >
              <ItemNumberBadge index={i + 1} className="shrink-0" />
              <span className="select-none shrink-0 inline-block text-left" style={{ width: `${maxWordLength * 0.7}em` }}>
                {scrambled}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              {isPrint && showSolutions ? (
                <span className="flex-1 text-green-800 font-semibold">{item.word}</span>
              ) : isPrint ? (
                <span className="flex-1 inline-block h-8 rounded" style={{ minWidth: 80 }}>
                  &nbsp;
                </span>
              ) : (
                <div className="flex-1">
                  <input
                    type="text"
                    value={userValue}
                    onChange={(e) =>
                      handleAnswer({ ...userAnswers, [item.id]: e.target.value })
                    }
                    className={`w-full h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors ${
                      isCorrect
                        ? "bg-green-50 text-green-700"
                        : isWrong
                          ? "bg-red-50 text-red-700"
                          : ""
                    }`}
                    style={!isCorrect && !isWrong ? {
                      backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)",
                    } : undefined}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CorrectSpellingView({
  block,
  mode,
  showSolutions = false,
  accentColor,
  bodyFont,
  bodyFontSize,
  instructionIndex,
}: {
  block: CorrectSpellingBlock | CorrectNumbersBlock | MissingLettersBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  bodyFont?: string;
  bodyFontSize?: string;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const isOnline = mode === "online";
  const fontFamily = bodyFont || "inherit";
  const legacyDisplayCount = block.displayCount ?? 10;
  const buildRow = block.type === "missing-letters"
    ? buildMissingLettersRow
    : block.type === "correct-numbers"
      ? buildCorrectNumbersRow
      : buildCorrectSpellingRow;
  const legacyKeepLeftCharacters = "keepFirstLetter" in block && block.keepFirstLetter ? 1 : 0;
  const legacyKeepRightCharacters = "keepLastLetter" in block && block.keepLastLetter ? 1 : 0;
  const keepLeftCharacters = block.keepLeftCharacters ?? legacyKeepLeftCharacters;
  const keepRightCharacters = block.keepRightCharacters ?? legacyKeepRightCharacters;
  const exampleWordId = block.showFirstAsExample ? block.words[0]?.id : undefined;
  const useEqualItemWidth = block.type === "correct-numbers" && !!block.equalItemWidth;

  const orderedWords = React.useMemo(() => {
    const exampleWord = exampleWordId ? block.words.find((word) => word.id === exampleWordId) : undefined;
    const remainingWords = block.words.filter((word) => word.id !== exampleWordId);
    const orderedRemainingWords = block.itemOrder
      ? block.itemOrder
          .map((id) => remainingWords.find((word) => word.id === id))
          .filter((word): word is NonNullable<typeof word> => !!word)
          .concat(remainingWords.filter((word) => !block.itemOrder!.includes(word.id)))
      : remainingWords;

    return exampleWord ? [exampleWord, ...orderedRemainingWords] : orderedRemainingWords;
  }, [block.itemOrder, block.words, exampleWordId]);

  const equalItemWidthCh = React.useMemo(() => {
    if (!useEqualItemWidth) return 0;

    let maxChars = 0;
    for (const item of orderedWords) {
      const displayCount = item.displayCount ?? legacyDisplayCount;
      const variants = buildRow(
        item.word,
        keepLeftCharacters,
        keepRightCharacters,
        `${block.id}:${item.id}`,
        displayCount,
      );
      for (const variant of variants) {
        maxChars = Math.max(maxChars, variant.text.length + 1);
      }
    }

    return Math.max(6, maxChars);
  }, [
    block.id,
    block.type,
    useEqualItemWidth,
    orderedWords,
    legacyDisplayCount,
    keepLeftCharacters,
    keepRightCharacters,
    buildRow,
  ]);

  return (
    <div className="text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
      {block.instruction && (
        <>
          {isOnline ? (
            <div
              className={CONSISTENT_INSTRUCTION_ROW_CLASS}
              style={{
                color: accentColor || "var(--color-primary)",
                ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
              }}
            >
              <InstructionBadge instructionIndex={instructionIndex} />
              <p className="min-w-0 flex-1">{block.instruction}</p>
            </div>
          ) : (
            <InstructionRow
              instruction={block.instruction}
              accentColor={accentColor}
              style={bodyFontSize ? { fontSize: bodyFontSize } : undefined}
              mode={mode}
              instructionIndex={instructionIndex}
            />
          )}
          {block.words.length > 0 && <SectionGap size="x-small" />}
        </>
      )}
      <div>
        {orderedWords.map((item, i) => {
          const displayCount = item.displayCount ?? legacyDisplayCount;
          const isExampleRow = item.id === exampleWordId;
          const useEqualItemWidth = equalItemWidthCh > 0;
          const variants = buildRow(
            item.word,
            keepLeftCharacters,
            keepRightCharacters,
            `${block.id}:${item.id}`,
            displayCount,
          );
          let exampleGapShown = false;
          let exampleChipShown = false;

          return (
            <div key={item.id} className="flex min-h-[49px] items-center gap-3 border-b">
              <ItemNumberBadge index={i + 1} className="shrink-0" />
              <div className="flex flex-1 flex-wrap items-center gap-2 py-1">
                {variants.map((variant, variantIndex) =>
                  (() => {
                    const isCorrectChoiceBlock = block.type === "correct-spelling" || block.type === "correct-numbers";
                    const showExampleChip =
                      isCorrectChoiceBlock &&
                      isExampleRow &&
                      !exampleChipShown &&
                      variant.isOriginal &&
                      variantIndex !== 0;
                    const showExampleGap =
                      block.type === "missing-letters" &&
                      isExampleRow &&
                      !exampleGapShown &&
                      variant.text.includes("{{blank:");

                    if (showExampleChip) {
                      exampleChipShown = true;
                    }

                    if (showExampleGap) {
                      exampleGapShown = true;
                    }

                    const showSolutionCircle =
                      isCorrectChoiceBlock &&
                      showSolutions &&
                      variant.isOriginal &&
                      variantIndex !== 0 &&
                      !showExampleChip;
                    const shouldHighlightVariant =
                      isCorrectChoiceBlock
                        ? variantIndex === 0
                        : variantIndex === 0 || (showSolutions && variant.isOriginal);
                    const highlightClass = "text-green-700 border-green-300 bg-green-50";

                    return (
                      <span
                        key={`${item.id}-${variantIndex}`}
                        className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} ${shouldHighlightVariant ? highlightClass : "bg-background"} ${useEqualItemWidth ? "inline-flex justify-center" : ""}`}
                        style={useEqualItemWidth ? { width: `${equalItemWidthCh}ch` } : undefined}
                      >
                        {block.type === "missing-letters"
                          ? renderMissingLetterText(variant.text, showExampleGap, showSolutions && !variant.isOriginal)
                          : showExampleChip
                            ? <RoughExampleCircle>{variant.text}</RoughExampleCircle>
                            : showSolutionCircle
                              ? <RoughExampleCircle stroke="#15803d">{variant.text}</RoughExampleCircle>
                              : variant.text}
                      </span>
                    );
                  })()
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fix Sentences View ─────────────────────────────────
function FixSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions,
  accentColor,
  instructionIndex,
}: {
  block: FixSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  const isOnline = mode === "online";
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;
  // answer: Record<sentenceId, string[]> where string[] is user-ordered parts
  const userOrders = (answer as Record<string, string[]> | undefined) || {};

  // Deterministic shuffle based on block id + sentence id
  const getShuffledParts = (sentenceId: string, parts: string[]): string[] => {
    if (parts.length <= 1) {
      return parts;
    }

    return deterministicDerangement(
      parts.map((part, index) => ({ id: `${sentenceId}:${index}`, part })),
      `fix-sentences:${block.id}:${sentenceId}`,
    ).map(({ part }) => part);
  };

  // Initialize user orders if empty
  React.useEffect(() => {
    if (interactive) {
      const needsInit = block.sentences.some((s) => !userOrders[s.id]);
      if (needsInit) {
        const newOrders: Record<string, string[]> = { ...userOrders };
        for (const s of block.sentences) {
          if (!newOrders[s.id]) {
            const parts = s.sentence.split(" | ").map((p) => p.trim());
            newOrders[s.id] = getShuffledParts(s.id, parts);
          }
        }
        onAnswer(newOrders);
      }
    }
  }, [interactive, block.sentences.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const movePart = (
    sentenceId: string,
    currentIndex: number,
    direction: -1 | 1
  ) => {
    if (showResults) return;
    const order = [...(userOrders[sentenceId] || [])];
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[currentIndex], order[newIndex]] = [
      order[newIndex],
      order[currentIndex],
    ];
    onAnswer({ ...userOrders, [sentenceId]: order });
  };

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {block.sentences.length > 0 && <SectionGap size="small" />}
      <div>
        {block.sentences.map((item, i) => {
          const correctParts = item.sentence.split(" | ").map((p) => p.trim());
          const isExampleSentence = item.id === exampleSentenceId;
          const displayParts = interactive
            ? userOrders[item.id] || getShuffledParts(item.id, correctParts)
            : getShuffledParts(item.id, correctParts);
          const isFullyCorrect =
            showResults &&
            displayParts.length === correctParts.length &&
            displayParts.every((p, idx) => p === correctParts[idx]);

          return (
            <div
              key={item.id}
              className={`py-2 transition-colors ${isPrint ? '' : 'border-b last:border-b-0'} ${
                showResults
                  ? isFullyCorrect
                    ? "bg-green-50"
                    : "bg-red-50"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <ItemNumberBadge index={i + 1} className="shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {displayParts.map((part, pi) => (
                      <div key={pi} className="flex items-center gap-0.5">
                        {!isExampleSentence && interactive && !showResults && (
                          <div className="flex flex-col gap-0">
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              style={{ color: "var(--viewer-interactive-color, var(--color-primary))" }}
                              onClick={() => movePart(item.id, pi, -1)}
                              disabled={pi === 0}
                              aria-label={t("moveUp")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            </button>
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              style={{ color: "var(--viewer-interactive-color, var(--color-primary))" }}
                              onClick={() => movePart(item.id, pi, 1)}
                              disabled={pi === displayParts.length - 1}
                              aria-label={t("moveDown")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <span
                          className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} font-medium ${
                            showResults
                              ? part === correctParts[pi]
                                ? "bg-green-100 border-green-300 text-green-800"
                                : "bg-red-100 border-red-300 text-red-800"
                              : "bg-muted border-border"
                          }`}
                        >
                          {part}
                        </span>
                      </div>
                    ))}
                  </div>
                  {showResults && !isExampleSentence && !isFullyCorrect && (
                    <p className="text-cv-xs text-green-600 mt-2">
                      {correctParts.join(" ")}
                    </p>
                  )}
                </div>
              </div>
              {isExampleSentence ? (
                <div className="mt-2">
                  <div
                    className="relative flex-1 h-8 overflow-hidden"
                    style={{ borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 1.0 }}
                  >
                    <span
                      className="absolute inset-x-0 block leading-none"
                      style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#0097dc", fontSize: "18px" }}
                    >
                      {correctParts.join(" ")}
                    </span>
                  </div>
                </div>
              ) : isPrint && showSolutions && !block.hideSolutionsInSolutionRender ? (
                <div className="mt-2">
                  <div
                    className="relative flex-1 h-8 overflow-hidden"
                    style={{ borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 1.0 }}
                  >
                    <span
                      className="absolute inset-x-0 block leading-none"
                      style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#15803d", fontSize: "18px" }}
                    >
                      {correctParts.join(" ")}
                    </span>
                  </div>
                </div>
              ) : isPrint ? (
                <div className="mt-2" style={{ height: '1.8em', borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
              ) : null}
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", {
            correct: block.sentences.filter((s) => {
              const correctParts = s.sentence.split(" | ").map((p) => p.trim());
              const userParts = userOrders[s.id] || [];
              return (
                userParts.length === correctParts.length &&
                userParts.every((p, idx) => p === correctParts[idx])
              );
            }).length,
            total: block.sentences.length,
          })}
        </p>
      )}
    </div>
  );
}

// ─── Complete Sentences View ───────────────────────────────────
function CompleteSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: CompleteSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const isOnline = mode === "online";
  const ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
              <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
            <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      <div>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className={ROW_CLASS}
          >
            <ItemNumberBadge index={i + 1} className="shrink-0" />
            <span className="shrink-0">{item.beginning}</span>
            {interactive ? (
              <input
                type="text"
                value={userAnswers[item.id] || ""}
                onChange={(e) => onAnswer({ ...userAnswers, [item.id]: e.target.value })}
                className="flex-1 h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors"
                style={{
                  backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10),
                }}
              />
            ) : (
              <div className="flex-1 border-b border-dashed border-muted-foreground/30 min-h-[14px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Start Sentences View ─────────────────────────────────────
// Variant of CompleteSentencesView with the writing line above the fragment.
function StartSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: StartSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const isOnline = mode === "online";
  const rowMinHeight = isOnline ? "min-h-[49px]" : "min-h-[32.5px]";

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      <div>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="flex flex-col gap-1 py-1 border-b last:border-b-0">
            <div className={`flex items-center gap-3 ${rowMinHeight}`}>
              <ItemNumberBadge index={i + 1} className="shrink-0" />
              {interactive ? (
                <input
                  type="text"
                  value={userAnswers[item.id] || ""}
                  onChange={(e) => onAnswer({ ...userAnswers, [item.id]: e.target.value })}
                  className="flex-1 h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors"
                  style={{
                    backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10),
                  }}
                />
              ) : (
                <div className="flex-1 border-b border-dashed border-muted-foreground/30 min-h-[14px]" />
              )}
              {item.ending && <span className="shrink-0">{item.ending}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-6" />
              <span>{item.beginning}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transform Sentences View ─────────────────────────────────
function TransformSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: TransformSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const isOnline = mode === "online";
  const TRANSFORM_ROW_CLASS = isOnline
    ? "flex min-h-[49px] items-center gap-3"
    : "flex min-h-[32.5px] items-center gap-3";
  const TRANSFORM_FOLLOWUP_ROW_CLASS = isOnline
    ? "flex min-h-[49px] items-center gap-3"
    : "flex min-h-[32.5px] items-center gap-3";
  const resolvedInteractiveColor = interactiveColor || "#0ea5e9";
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p>{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {block.sentences.length > 0 && <SectionGap size="small" />}
      <div>
        {block.sentences.map((item, i) => {
          const userVal = userAnswers[item.id] || "";
          const hasSolution = !!item.solution;
          const isCorrect = showResults && hasSolution && userVal.trim().toLowerCase() === item.solution!.trim().toLowerCase();
          const isWrong = showResults && hasSolution && userVal.trim() !== "" && !isCorrect;
          const isExampleSentence = item.id === exampleSentenceId && !!item.solution;

          return (
            <div key={item.id} className={item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"}>
              {item.src ? (
                <div className="row-span-2 pr-3 pt-[10px] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt=""
                    className="block max-h-full max-w-full h-auto w-auto object-contain"
                    style={{
                      borderRadius: "3px",
                    }}
                  />
                </div>
              ) : null}
              <div className={TRANSFORM_ROW_CLASS}>
                <ItemNumberBadge index={i + 1} className="shrink-0" />
                <span>{item.beginning}</span>
              </div>
              {isExampleSentence ? (
                <div className={TRANSFORM_FOLLOWUP_ROW_CLASS}>
                  <div
                    className="relative flex-1 h-8 overflow-hidden"
                    style={{ borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 1.0 }}
                  >
                    <span
                      className="absolute inset-x-0 block leading-none"
                      style={{ bottom: '6px', fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#0097dc', fontSize: '18px' }}
                    >
                      {item.solution}
                    </span>
                  </div>
                </div>
              ) : !interactive && showSolutions && hasSolution ? (
                <div className={TRANSFORM_FOLLOWUP_ROW_CLASS}>
                  <div
                    className="relative flex-1 h-8 overflow-hidden"
                    style={{ borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 1.0 }}
                  >
                    <span
                      className="absolute inset-x-0 block leading-none"
                      style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#15803d", fontSize: "18px" }}
                    >
                      {item.solution}
                    </span>
                  </div>
                </div>
              ) : interactive ? (
                <div className={TRANSFORM_FOLLOWUP_ROW_CLASS}>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={userVal}
                      onChange={(e) => onAnswer({ ...userAnswers, [item.id]: e.target.value })}
                      disabled={showResults}
                      className={`w-full h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors ${
                        showResults
                          ? isCorrect
                            ? "border-green-500 bg-green-50 text-green-700"
                            : isWrong
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-muted-foreground/40 bg-transparent"
                          : "border-muted-foreground/40 focus:border-primary"
                      }`}
                      style={!showResults && isOnline ? {
                        backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)",
                      } : undefined}
                    />
                    {showResults && isWrong && hasSolution && (
                      <span className="text-cv-xs text-green-600 mt-0.5 block">{item.solution}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className={TRANSFORM_FOLLOWUP_ROW_CLASS}>
                  <div
                    className="flex-1"
                    style={{ height: '1.8em', borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0, minWidth: 80 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadingComprehensionView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  accentColor,
  interactiveColor,
  instructionIndex,
  allBlocks,
}: {
  block: ReadingComprehensionBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
  allBlocks?: WorksheetBlock[];
}) {
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const isOnline = mode === "online";
  const ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;
  const FOLLOWUP_ROW_CLASS = isOnline
    ? "flex min-h-[49px] items-center gap-3"
    : "flex min-h-[32.5px] items-center gap-3";
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;
  const useLetterItemNumbering = !!block.letterItemNumbering;
  const isTrueFalseLayout = block.layoutType === "true-false";
  const isPrefilledFormLayout = block.layoutType === "prefilled-form";
  const isFormLayout = block.layoutType === "form" || isPrefilledFormLayout;
  const formFieldLabels = block.formFieldLabels && block.formFieldLabels.length > 0 ? block.formFieldLabels : [""];
  const formColumns = Math.max(1, Math.min(4, block.formColumns ?? 2));
  const tc = useTranslations("common");

  const numberingOffsets = React.useMemo(() => {
    if (!useLetterItemNumbering || !block.continueNumbering || !allBlocks) {
      return { sentenceOffset: 0, readingTextOffset: 0 };
    }

    const currentIndex = allBlocks.findIndex((candidate) => candidate.id === block.id);
    if (currentIndex <= 0) {
      return { sentenceOffset: 0, readingTextOffset: 0 };
    }

    let sentenceOffset = 0;
    let readingTextOffset = 0;
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const previousBlock = allBlocks[index];
      if (previousBlock.type !== "reading-comprehension") {
        break;
      }

      if (!previousBlock.letterItemNumbering) {
        break;
      }

      sentenceOffset += previousBlock.sentences.length;
      if (previousBlock.layoutType === "true-false" && (previousBlock.readingText || "").trim().length > 0) {
        readingTextOffset += 1;
      }
    }

    return { sentenceOffset, readingTextOffset };
  }, [allBlocks, block.continueNumbering, block.id, useLetterItemNumbering]);

  const readingTextNumber = isTrueFalseLayout && (block.readingText || "").trim().length > 0
    ? numberingOffsets.readingTextOffset + 1
    : undefined;

  const renderSentenceIndex = (index: number) => {
    if (!useLetterItemNumbering) {
      return <ItemNumberBadge index={index} className="shrink-0" />;
    }

    return (
      <span className="w-6 min-w-6 shrink-0 bg-transparent text-slate-700 ring-0 font-medium text-[1em] leading-none tabular-nums">
        {`${toAlphabeticLabel(numberingOffsets.sentenceOffset + index, false)}.`}
      </span>
    );
  };

  if (isTrueFalseLayout) {
    const tfAnswers = (answer as Record<string, boolean | undefined> | undefined) || {};
    const trueLabelText = block.trueLabel || tc("true");
    const falseLabelText = block.falseLabel || tc("false");
    const optionColumnWidth = `${Math.max(80, Math.min(180, Math.max(trueLabelText.length, falseLabelText.length) * 8 + 28))}px`;

    const handleSelect = (itemId: string, value: boolean) => {
      if (!interactive || showResults || itemId === exampleSentenceId) return;
      onAnswer({ ...tfAnswers, [itemId]: value });
    };

    const getOptionClass = (selected: boolean | undefined, correctAnswer: boolean, optionValue: boolean, isExampleRow: boolean) => {
      if (isExampleRow) return "border-muted-foreground/30";
      if (selected === undefined) return "border-muted-foreground/30 hover:border-primary/50";
      if (selected === optionValue) {
        return selected === correctAnswer
          ? `${s.controlBoxFilled}`
          : "border-red-500 bg-red-500 text-white";
      }
      if (showResults && correctAnswer === optionValue) {
        return "border-blue-500 bg-blue-500 text-white";
      }
      return "border-muted-foreground/30";
    };

    return (
      <div className="space-y-2">
        <div>
          {block.instruction && (
            isOnline ? (
              <div
                className={CONSISTENT_INSTRUCTION_ROW_CLASS}
                style={{ color: accentColor || "var(--color-primary)" }}
              >
                <InstructionBadge instructionIndex={instructionIndex} />
                <div className="flex w-full min-w-0 items-center gap-3 flex-1">
                  <p className="min-w-0 flex-1">{block.instruction}</p>
                  <div className="shrink-0" style={{ width: optionColumnWidth }} aria-hidden="true" />
                  <div className="shrink-0" style={{ width: optionColumnWidth }} aria-hidden="true" />
                </div>
              </div>
            ) : (
              <InstructionRow
                instruction={block.instruction}
                accentColor={accentColor}
                mode={mode}
                instructionIndex={instructionIndex}
              />
            )
          )}
          {(block.readingText || "").trim() ? (
            <div className="flex items-baseline gap-2 py-2">
              {useLetterItemNumbering ? (
                <span className="w-6 min-w-6 shrink-0 bg-transparent text-slate-700 ring-0 font-medium text-[1em] leading-none tabular-nums">
                  {`${readingTextNumber ?? numberingOffsets.readingTextOffset + 1}.`}
                </span>
              ) : null}
              <div className="flex-1 whitespace-pre-wrap leading-5 text-foreground">{block.readingText}</div>
            </div>
          ) : null}
          <div className={ROW_CLASS}>
            <span className="w-6 shrink-0" aria-hidden="true" />
            <div className="flex-1 font-bold text-foreground" />
            <div className="shrink-0 text-center font-semibold text-foreground text-[14px]" style={{ width: optionColumnWidth }}>{trueLabelText}</div>
            <div className="shrink-0 text-center font-semibold text-foreground text-[14px]" style={{ width: optionColumnWidth }}>{falseLabelText}</div>
          </div>
          <div>
            {block.sentences.map((item, i) => {
              const correctAnswer = item.correctAnswer !== false;
              const selected = tfAnswers[item.id];
              const isExampleRow = item.id === exampleSentenceId;
              const showExampleMarker = isExampleRow;

              return (
                <div key={item.id} className={`${item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"} border-b`}>
                  {item.src ? (
                    <div className="row-span-2 pr-3 flex items-center justify-center">
                      <img
                        src={item.src}
                        alt=""
                        className="block max-h-full max-w-full h-auto w-auto object-contain"
                        style={{ borderRadius: "3px" }}
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 py-2">
                    {renderSentenceIndex(i + 1)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.question}</p>
                    </div>
                    <div className="shrink-0 self-center flex items-center justify-center" style={{ width: optionColumnWidth }}>
                      {!interactive && showSolutions ? (
                        correctAnswer ? <div className={CONTROL_BOX_FILLED_CLASS} /> : <div className={CONTROL_BOX_CLASS} />
                      ) : showExampleMarker && correctAnswer ? (
                        renderHandwrittenMatrixIndicator("#0097dc")
                      ) : (
                        <button
                          type="button"
                          className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(selected, correctAnswer, true, isExampleRow)}`}
                          onClick={() => handleSelect(item.id, true)}
                          disabled={!interactive || showResults || isExampleRow}
                        />
                      )}
                    </div>
                    <div className="shrink-0 self-center flex items-center justify-center" style={{ width: optionColumnWidth }}>
                      {!interactive && showSolutions ? (
                        !correctAnswer ? <div className={CONTROL_BOX_FILLED_CLASS} /> : <div className={CONTROL_BOX_CLASS} />
                      ) : showExampleMarker && !correctAnswer ? (
                        renderHandwrittenMatrixIndicator("#0097dc")
                      ) : (
                        <button
                          type="button"
                          className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(selected, correctAnswer, false, isExampleRow)}`}
                          onClick={() => handleSelect(item.id, false)}
                          disabled={!interactive || showResults || isExampleRow}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {block.sentences.length > 0 && <SectionGap size="medium" />}
      <div>
        {block.sentences.map((item, i) => {
          const userVal = userAnswers[item.id] || "";
          const hasSolution = !!item.solution;
          const isCorrect = showResults && hasSolution && userVal.trim().toLowerCase() === item.solution!.trim().toLowerCase();
          const isWrong = showResults && hasSolution && userVal.trim() !== "" && !isCorrect;
          const isExampleSentence = item.id === exampleSentenceId && !!item.solution;

          return (
            <div key={item.id} className={`${item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"} border-b`}>
              {item.src ? (
                <div className="row-span-2 pr-3 flex items-center justify-center">
                  <img
                    src={item.src}
                    alt=""
                    className="block max-h-full max-w-full h-auto w-auto object-contain"
                    style={{ borderRadius: "3px" }}
                  />
                </div>
              ) : null}
              <div className={`${isFormLayout ? FOLLOWUP_ROW_CLASS : ROW_CLASS} items-start ${isFormLayout ? 'pt-2 pb-0' : 'py-2'}`}>
                {renderSentenceIndex(i + 1)}
                <div className="flex-1">
                  <p className="font-medium">{item.question}</p>
                  {!isFormLayout && item.beginning && <p className="text-sm text-muted-foreground">{item.beginning}</p>}
                </div>
              </div>
              {isFormLayout ? (
                <div className="flex gap-3 pb-4 pt-2">
                  <div className={NUMBER_BADGE_LAYOUT_CLASS} aria-hidden="true" />
                  <div className="flex-1">
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))` }}>
                      {formFieldLabels.map((label, fieldIndex) => {
                        const shouldStretchLastField =
                          fieldIndex === formFieldLabels.length - 1 &&
                          formFieldLabels.length % formColumns === 1;
                        const answerKey = `${item.id}_${fieldIndex}`;
                        const parsedValue = parseReadingComprehensionFieldValue(item.fieldValues?.[fieldIndex]);
                        const prefilledValue = parsedValue.prefilled || parsedValue.solution;
                        const userFieldVal = userAnswers[answerKey] ?? (isPrefilledFormLayout ? prefilledValue : "");
                        const solution = parsedValue.solution;
                        const hasFieldSolution = solution.trim() !== "";
                        const isFieldCorrect = showResults && hasFieldSolution && userFieldVal.trim().toLowerCase() === solution.trim().toLowerCase();
                        const isFieldWrong = showResults && hasFieldSolution && userFieldVal.trim() !== "" && !isFieldCorrect;
                        const isExampleField = item.id === exampleSentenceId && fieldIndex === 0 && prefilledValue.trim() !== "";
                        const showFieldSolution = !interactive && showSolutions && hasFieldSolution && !isExampleField;
                        const shouldShowPrefilledCorrection = parsedValue.hasCorrection && (
                          isExampleField ||
                          (interactive && showResults && isFieldWrong) ||
                          (!interactive && showSolutions)
                        );
                        const renderPrefilledValue = () => (
                          <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                            {prefilledValue ? (
                              <span
                                className="absolute inset-0 flex items-center px-2"
                                style={{ color: "currentColor" }}
                              >
                                {prefilledValue}
                              </span>
                            ) : <span>&nbsp;</span>}
                          </div>
                        );
                        const renderPrefilledCorrection = (correctionColor: string, prefilledColor?: string) => (
                          <div className="relative h-7 w-full overflow-hidden rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                            <span
                              className="absolute inset-0 flex items-center px-2"
                            >
                              {renderReadingComprehensionCorrectionSegments(parsedValue, correctionColor, prefilledColor)}
                            </span>
                          </div>
                        );

                        return (
                          <div
                            key={fieldIndex}
                            className="space-y-1 min-w-0"
                            style={shouldStretchLastField ? { gridColumn: "1 / -1" } : undefined}
                          >
                            <div className="font-semibold">{label || `Field ${fieldIndex + 1}`}</div>
                            {isPrefilledFormLayout ? (
                              interactive && !isExampleField ? (
                                <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                                  <input
                                    type="text"
                                    value={userFieldVal}
                                    onChange={(e) => onAnswer({ ...userAnswers, [answerKey]: e.target.value })}
                                    disabled={showResults}
                                    className={`w-full h-7 rounded-[3px] border-0 bg-transparent px-2 py-0 text-left leading-5 focus:outline-none transition-colors ${
                                      showResults
                                        ? isFieldCorrect
                                          ? "bg-green-100 text-green-700"
                                          : isFieldWrong
                                            ? "bg-red-50 text-red-700"
                                            : "text-foreground"
                                        : "focus:ring-1 focus:ring-primary/50"
                                    }`}
                                    style={{
                                      ...(!showResults && isOnline ? {
                                        backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)",
                                      } : undefined),
                                    }}
                                  />
                                  {shouldShowPrefilledCorrection ? (
                                    <div className="mt-1">{renderPrefilledCorrection("#15803d")}</div>
                                  ) : null}
                                </div>
                              ) : (
                                shouldShowPrefilledCorrection
                                  ? renderPrefilledCorrection(isExampleField ? "#0097dc" : "#15803d")
                                  : renderPrefilledValue()
                              )
                            ) : isExampleField ? (
                              <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                                <span
                                  className="absolute inset-0 flex items-center px-2"
                                  style={{ fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#0097dc', fontSize: '18px' }}
                                >
                                  {solution}
                                </span>
                              </div>
                            ) : showFieldSolution ? (
                              (
                                <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                                  <span
                                    className="absolute inset-0 flex items-center px-2"
                                    style={{ fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#15803d', fontSize: '18px' }}
                                  >
                                    {solution}
                                  </span>
                                </div>
                              )
                            ) : interactive ? (
                              <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5">
                                <input
                                  type="text"
                                  value={userFieldVal}
                                  onChange={(e) => onAnswer({ ...userAnswers, [answerKey]: e.target.value })}
                                  disabled={showResults}
                                  className={`w-full h-7 rounded-[3px] border-0 bg-transparent px-2 py-0 text-left leading-5 focus:outline-none transition-colors ${
                                    showResults
                                      ? isFieldCorrect
                                        ? "bg-green-100 text-green-700"
                                        : isFieldWrong
                                          ? "bg-red-50 text-red-700"
                                          : "text-foreground"
                                      : "focus:ring-1 focus:ring-primary/50"
                                  }`}
                                  style={{
                                    ...(!showResults && isOnline ? {
                                      backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)",
                                    } : undefined),
                                  }}
                                />
                                {showResults && isFieldWrong && hasFieldSolution ? (
                                  <span className="text-cv-xs text-green-600 mt-0.5 block">{solution}</span>
                                ) : null}
                              </div>
                            ) : (
                              <div className="h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5 text-muted-foreground text-xs">&nbsp;</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : isExampleSentence ? (
                <div className={FOLLOWUP_ROW_CLASS}>
                  <span
                    className="flex-1"
                    style={{ fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#0097dc', fontSize: '18px' }}
                  >
                    {item.solution}
                  </span>
                </div>
              ) : !interactive && showSolutions && hasSolution ? (
                <div className={FOLLOWUP_ROW_CLASS}>
                  <span
                    className="flex-1"
                    style={{ fontFamily: EXAMPLE_HANDWRITING_FONT, color: '#15803d', fontSize: '18px' }}
                  >
                    {item.solution}
                  </span>
                </div>
              ) : interactive ? (
                <div className={FOLLOWUP_ROW_CLASS}>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={userVal}
                      onChange={(e) => onAnswer({ ...userAnswers, [item.id]: e.target.value })}
                      disabled={showResults}
                      className={`w-full h-8 rounded bg-transparent px-2 py-0.5 leading-none focus:outline-none transition-colors ${
                        showResults
                          ? isCorrect
                            ? "border-green-500 bg-green-50 text-green-700"
                            : isWrong
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-muted-foreground/40 bg-transparent"
                          : "border-muted-foreground/40 focus:border-primary"
                      }`}
                      style={!showResults && isOnline ? {
                        backgroundColor: "color-mix(in srgb, var(--viewer-interactive-color) 10%, transparent)",
                      } : undefined}
                    />
                    {showResults && isWrong && hasSolution && (
                      <span className="text-cv-xs text-green-600 mt-0.5 block">{item.solution}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className={FOLLOWUP_ROW_CLASS}>
                  <span className="flex-1 inline-block h-8 rounded" style={{ opacity: 1.0, minWidth: 80 }}>
                    &nbsp;
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Verb Table View ────────────────────────────────────────
function VerbTableView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  primaryColor = "#1a1a1a",
  accentColor,
  interactiveColor,
  instructionIndex,
}: {
  block: VerbTableBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  primaryColor?: string;
  accentColor?: string | null;
  interactiveColor?: string;
  instructionIndex?: number;
}) {
  const t = useTranslations("viewer");
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const isSplit = block.splitConjugation ?? false;
  const showGlobal = block.showConjugations ?? false;
  const isOnline = mode === "online";
  const resolvedInteractiveColor = interactiveColor || primaryColor || "#0ea5e9";
  const ROW_CLASS = isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT;

  const shouldShowAnswer = (override: "show" | "hide" | null | undefined): boolean => {
    if (override === "show") return true;
    if (override === "hide") return false;
    return showGlobal;
  };

  const handleChange = (rowId: string, field: string, value: string) => {
    if (!interactive || showResults) return;
    onAnswer({ ...userAnswers, [`${rowId}_${field}`]: value });
  };

  const renderRow = (row: VerbTableBlock["singularRows"][0]) => {
    const showConj1 = shouldShowAnswer(row.showOverride);
    const showConj2 = shouldShowAnswer(row.showOverride2);
    const userVal = isSplit
      ? userAnswers[`${row.id}_conjugation`] || ""
      : userAnswers[row.id] || userAnswers[`${row.id}_conjugation`] || "";
    const userVal2 = userAnswers[`${row.id}_conjugation2`] || "";
    const isCorrect = showResults && userVal.trim().toLowerCase() === row.conjugation.trim().toLowerCase();
    const isWrong = showResults && userVal.trim() !== "" && !isCorrect;
    const isCorrect2 = showResults && isSplit && userVal2.trim().toLowerCase() === (row.conjugation2 || "").trim().toLowerCase();
    const isWrong2 = showResults && isSplit && userVal2.trim() !== "" && !isCorrect2;

    const inputClass = (wrong: boolean, correct: boolean) =>
      `w-full h-8 rounded px-2 py-0.5 leading-none focus:outline-none transition-colors ${
        showResults
          ? correct
            ? "bg-green-50 text-green-700"
            : wrong
              ? "bg-red-50 text-red-700"
              : "bg-transparent"
          : ""
      }`;

    return (
      <div key={row.id} className={ROW_CLASS}>
        <span className="w-16 shrink-0 text-[11px] text-muted-foreground uppercase">{row.person}</span>
        <span className="w-20 shrink-0 text-[11px] text-muted-foreground">{row.detail ?? ""}</span>
        <span className="w-28 shrink-0 font-bold">{row.pronoun}</span>
        <div className={`flex-1 flex ${isSplit ? "gap-2" : ""}`}>
          {/* Conjugation 1 */}
          <div className="flex-1">
            {showConj1 ? (
              <span className="font-bold" style={{ color: accentColor || primaryColor }}>{row.conjugation}</span>
            ) : interactive ? (
              <>
                <input
                  type="text"
                  value={userVal}
                  onChange={(e) => handleChange(row.id, "conjugation", e.target.value)}
                  disabled={showResults}
                  className={inputClass(isWrong, isCorrect)}
                  style={!showResults ? { backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10) } : undefined}
                />
                {showResults && isWrong && (
                  <span className="text-cv-xs text-green-600 mt-0.5 block">{row.conjugation}</span>
                )}
              </>
            ) : (
              <div className="border-b border-muted-foreground/30 h-6 min-w-[80px]" />
            )}
          </div>
          {/* Conjugation 2 (split) */}
          {isSplit && (
            <div className="flex-1">
              {showConj2 ? (
                <span className="font-bold" style={{ color: accentColor || primaryColor }}>{row.conjugation2}</span>
              ) : interactive ? (
                <>
                  <input
                    type="text"
                    value={userVal2}
                    onChange={(e) => handleChange(row.id, "conjugation2", e.target.value)}
                    disabled={showResults}
                    className={inputClass(isWrong2, isCorrect2)}
                    style={!showResults ? { backgroundColor: colorWithAlpha(resolvedInteractiveColor, 0.10) } : undefined}
                  />
                  {showResults && isWrong2 && (
                    <span className="text-cv-xs text-green-600 mt-0.5 block">{row.conjugation2}</span>
                  )}
                </>
              ) : (
                <div className="border-b border-muted-foreground/30 h-6 min-w-[80px]" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allRows = [...block.singularRows, ...block.pluralRows];
  const correctCount = showResults
    ? allRows.reduce((count, r) => {
        const key1 = isSplit ? `${r.id}_conjugation` : r.id;
        const val1 = (userAnswers[key1] || userAnswers[`${r.id}_conjugation`] || "").trim().toLowerCase();
        let c = val1 === r.conjugation.trim().toLowerCase() ? 1 : 0;
        if (isSplit) {
          const val2 = (userAnswers[`${r.id}_conjugation2`] || "").trim().toLowerCase();
          if (val2 === (r.conjugation2 || "").trim().toLowerCase()) c += 1;
        }
        return count + c;
      }, 0)
    : 0;
  const totalCount = isSplit ? allRows.length * 2 : allRows.length;

  return (
    <div>
      {(block.showInfinitive ?? true) && (block.infinitiveOverride || block.verb) && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || primaryColor }}
          >
            <span className="w-6 shrink-0 text-left">01</span>
            <span>{block.infinitiveOverride || block.verb}</span>
          </div>
        ) : (
          <InstructionRow
            instruction={block.infinitiveOverride || block.verb || ""}
            accentColor={accentColor}
            mode={mode}
            instructionIndex={instructionIndex}
          />
        )
      )}
      {/* Singular */}
      <div className={`${ROW_CLASS} font-semibold text-xs uppercase text-muted-foreground`}>
        Singular
      </div>
      {block.singularRows.map((row) => renderRow(row))}
      {/* Plural */}
      <div className={`${ROW_CLASS} font-semibold text-xs uppercase text-muted-foreground`}>
        Plural
      </div>
      {block.pluralRows.map((row) => renderRow(row))}
      {showResults && (
        <p className="text-cv-xs text-muted-foreground mt-2">
          {t("resultCount", { correct: correctCount, total: totalCount })}
        </p>
      )}
    </div>
  );
}

// ─── Dialogue View ───────────────────────────────────────────
function DialogueView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  accentColor,
  showSolutions = false,
  instructionIndex,
  brand,
}: {
  block: DialogueBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: Record<string, string>;
  onAnswer: (a: Record<string, string>) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
  brand?: Brand;
}) {
  const t = useTranslations("blockRenderer");
  const isOnline = mode === "online";
  const originalLeftColWidth = Math.max(
    20,
    Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)),
  );
  const originalColumnsStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(0, ${originalLeftColWidth}fr) minmax(0, ${100 - originalLeftColWidth}fr)`,
  };

  const renderSpeakerIcon = (icon: DialogueSpeakerIcon) => {
    return <DialogueSpeakerIconGlyph icon={icon} brandSlug={brand} className="w-5 h-5 object-contain" />;
  };

  // Collect gap answers for word bank
  const gapAnswers: string[] = [];
  let gapIndex = 0;
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank\*?:([^}]+)\}\}/g);
    for (const m of matches) {
      const raw = m[1];
      const answer = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      if (answer) gapAnswers.push(answer);
      gapIndex++;
    }
  }
  const exampleAnswers = React.useMemo(() => {
    const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.text.matchAll(/\{\{blank\*?:([^}]+)\}\}/g)) {
      const raw = match[1] || "";
      const answer = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      if (answer) answers.add(answer);
    }
    return answers;
  }, [block.items, block.showFirstAsExample]);
  const shuffledGapAnswers = React.useMemo(
    () => deterministicShuffle(gapAnswers, `dialogue:${block.id}:word-bank`),
    [block.id, gapAnswers]
  );

  // Render text with interactive gaps
  let globalGapIdx = 0;
  const renderDialogueText = (text: string, variant: "default" | "original" | "solution", showExampleOnFirstBlank = false) => {
    if (variant === "original") {
      return text.replace(/\{\{blank\*?(?::([^}]+))?\}\}/g, (_match, raw = "") => {
        const { answer } = parseBlankContent(raw);
        return answer;
      });
    }

    const parts = text.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);
    const findAdjacentToken = (startIndex: number, direction: -1 | 1) => {
      for (let cursor = startIndex + direction; cursor >= 0 && cursor < parts.length; cursor += direction) {
        if (parts[cursor] !== "") return parts[cursor];
      }
      return "";
    };
    let exampleShown = false;
    return parts.map((part, i) => {
      const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
      if (match) {
        const noSpace = match[1] === '*';
        const raw = match[2] || "";
        const { answer: correctAnswer, width } = parseBlankContent(raw);
        const idx = globalGapIdx++;
        const key = `gap-${idx}`;
        const userVal = answer?.[key] ?? "";
        const hasAnswer = correctAnswer !== "";
        const isCorrect = hasAnswer && userVal.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const widthStyle = getBlankWidthStyle(width, false);
        const previousPart = findAdjacentToken(i, -1);
        const nextPart = findAdjacentToken(i, 1);
        const previousIsBlank = /^\{\{blank\*?(?::[^}]*)?\}\}$/.test(previousPart);
        const nextIsBlank = /^\{\{blank\*?(?::[^}]*)?\}\}$/.test(nextPart);
        const halfInnerGap = "0.125rem";
        const outerGap = "0.25rem";
        // Check if blank is at start: all parts before it are empty or whitespace-only
        const isAtStart = parts.slice(0, i).every(p => !p.trim());
        const spacingStyle = noSpace
          ? undefined
          : {
              ...(isAtStart
                ? {}
                : previousIsBlank
                  ? { marginLeft: halfInnerGap }
                  : { marginLeft: outerGap }),
              ...(nextIsBlank ? { marginRight: "0" } : { marginRight: outerGap }),
            };

        const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
        const shouldRenderSolutionOverlay = variant === "solution" || (variant === "default" && showSolutions && hasAnswer);
        if (shouldRenderExample) {
          exampleShown = true;
          return (
            <span
              key={i}
              className="relative inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
              style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{correctAnswer || "\u00A0"}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: EXAMPLE_HANDWRITING_FONT,
                  fontWeight: 400,
                  fontSize: '18px',
                  color: '#0097dc',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {correctAnswer}
              </span>
            </span>
          );
        }

        if (interactive) {
          return (
          <span key={i} className="inline-block" style={spacingStyle}>
            <input
              type="text"
              value={userVal}
              onChange={(e) => onAnswer({ ...answer, [key]: e.target.value })}
              placeholder="…"
              className={`h-5 rounded-[3px] border-0 bg-transparent px-2 py-0 text-center leading-5 focus:outline-none inline ${
                showResults
                  ? isCorrect
                    ? "text-green-700"
                    : hasAnswer
                      ? "text-red-700"
                      : "text-muted-foreground"
                  : "focus:ring-1 focus:ring-primary/50"
              }`}
              style={getBlankWidthStyle(width, true)}
            />
          </span>
          );
        }

        if (shouldRenderSolutionOverlay) {
          return (
            <span
              key={i}
              className="relative inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
              style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{correctAnswer || "\u00A0"}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: EXAMPLE_HANDWRITING_FONT,
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#15803d",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {correctAnswer}
              </span>
            </span>
          );
        }

        return (
          <span
            key={i}
            className="inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
            style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
          >
            {"\u00A0"}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {((block.showWordBank && gapAnswers.length > 0) || block.items.length > 0) && <SectionGap size="medium" />}
      {/* Word Bank */}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="flex min-h-[49px] flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {shuffledGapAnswers.map((text, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-background rounded border"
                  style={exampleAnswers.has(text) ? { color: "#0097dc" } : undefined}
                >
                  {exampleAnswers.has(text) ? <RoughExampleStrike>{text}</RoughExampleStrike> : text}
                </span>
              ))}
          </div>
        </div>
      )}
      {/* Dialogue items */}
      <div>
        {block.items.map((item, i) => {
          const prevItem = i > 0 ? block.items[i - 1] : null;
          const isBlankItem = !item.speaker && !item.text;
          const prevIsBlank = !!prevItem && !prevItem.speaker && !prevItem.text;
          const isSameSpeaker = prevItem && !prevIsBlank && prevItem.icon === item.icon;
          // Blank items keep the same row height but carry no number, so real
          // speaker rows stay continuously numbered across the gap.
          const displayNumber =
            block.items.slice(0, i + 1).filter((it) => it.speaker || it.text).length;

          if (isBlankItem) {
            return (
              <div key={item.id} className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT} />
            );
          }

          return (
          <div key={item.id} className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}>
            <ItemNumberBadge index={displayNumber} className="shrink-0" />
            {isSameSpeaker ? (
              <span className="h-5 w-5 min-w-5 shrink-0" />
            ) : (
              <span className="h-5 w-5 min-w-5 shrink-0 text-muted-foreground flex items-center justify-center leading-none">
                {renderSpeakerIcon(item.icon)}
              </span>
            )}
            {block.showSpeakers ? (
              <span className="w-20 shrink-0 font-semibold leading-5">
                {item.speaker || "\u00A0"}
              </span>
            ) : null}
            {block.showOriginal ? (
              <div className="grid flex-1 gap-8 leading-5" style={originalColumnsStyle}>
                <div className="min-w-0 flex flex-wrap items-center">
                  {renderDialogueText(
                    item.text,
                    showSolutions ? "solution" : "default",
                    !!block.showFirstAsExample && i === 0,
                  )}
                </div>
                <div className="min-w-0 flex flex-wrap items-center">
                  {renderDialogueText(item.text, "original")}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-wrap items-center leading-5">
                {renderDialogueText(item.text, "default", !!block.showFirstAsExample && i === 0)}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function LueckenzeilenView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  accentColor,
  showSolutions = false,
  instructionIndex,
}: {
  block: LueckenzeilenBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: Record<string, string>;
  onAnswer: (a: Record<string, string>) => void;
  showResults: boolean;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const isOnline = mode === "online";
  const originalLeftColWidth = Math.max(
    20,
    Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)),
  );
  const originalColumnsStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(0, ${originalLeftColWidth}fr) minmax(0, ${100 - originalLeftColWidth}fr)`,
  };

  const gapAnswers: string[] = [];
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank\*?:([^}]+)\}\}/g);
    for (const m of matches) {
      const raw = m[1];
      const text = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      if (text) gapAnswers.push(text);
    }
  }

  const exampleAnswers = React.useMemo(() => {
    const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.text.matchAll(/\{\{blank\*?:([^}]+)\}\}/g)) {
      const raw = match[1] || "";
      const text = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      if (text) answers.add(text);
    }
    return answers;
  }, [block.items, block.showFirstAsExample]);

  const shuffledGapAnswers = React.useMemo(
    () => deterministicShuffle(gapAnswers, `lueckenzeilen:${block.id}:word-bank`),
    [block.id, gapAnswers]
  );

  let globalGapIdx = 0;
  const renderLineText = (text: string, variant: "default" | "original" | "solution", showExampleOnFirstBlank = false) => {
    if (variant === "original") {
      return text.replace(/\{\{blank\*?(?::([^}]+))?\}\}/g, (_match, raw = "") => {
        const { answer } = parseBlankContent(raw);
        return answer;
      });
    }

    const parts = text.split(/(\{\{blank\*?(?::[^}]*)?\}\})/g);
    const findAdjacentToken = (startIndex: number, direction: -1 | 1) => {
      for (let cursor = startIndex + direction; cursor >= 0 && cursor < parts.length; cursor += direction) {
        if (parts[cursor] !== "") return parts[cursor];
      }
      return "";
    };
    let exampleShown = false;
    return parts.map((part, i) => {
      const match = part.match(/\{\{blank(\*?)(?::(.+))?\}\}/);
      if (match) {
        const noSpace = match[1] === '*';
        const raw = match[2] || "";
        const { answer: correctAnswer, width } = parseBlankContent(raw);
        const idx = globalGapIdx++;
        const key = `gap-${idx}`;
        const userVal = answer?.[key] ?? "";
        const hasAnswer = correctAnswer !== "";
        const isCorrect = hasAnswer && userVal.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const widthStyle = getBlankWidthStyle(width, false);
        const previousPart = findAdjacentToken(i, -1);
        const nextPart = findAdjacentToken(i, 1);
        const previousIsBlank = /^\{\{blank\*?(?::[^}]*)?\}\}$/.test(previousPart);
        const nextIsBlank = /^\{\{blank\*?(?::[^}]*)?\}\}$/.test(nextPart);
        const halfInnerGap = "0.125rem";
        const outerGap = "0.25rem";
        const isAtStart = parts.slice(0, i).every(p => !p.trim());
        const spacingStyle = noSpace
          ? undefined
          : {
              ...(isAtStart
                ? {}
                : previousIsBlank
                  ? { marginLeft: halfInnerGap }
                  : { marginLeft: outerGap }),
              ...(nextIsBlank ? { marginRight: "0" } : { marginRight: outerGap }),
            };

        const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
        const shouldRenderSolutionOverlay = variant === "solution" || (variant === "default" && showSolutions && hasAnswer);
        if (shouldRenderExample) {
          exampleShown = true;
          return (
            <span
              key={i}
              className="relative inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
              style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{correctAnswer || "\u00A0"}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: EXAMPLE_HANDWRITING_FONT,
                  fontWeight: 400,
                  fontSize: '18px',
                  color: '#0097dc',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {correctAnswer}
              </span>
            </span>
          );
        }

        if (interactive) {
          return (
          <span key={i} className="inline-block" style={spacingStyle}>
            <input
              type="text"
              value={userVal}
              onChange={(e) => onAnswer({ ...answer, [key]: e.target.value })}
              placeholder="…"
              className={`h-5 rounded-[3px] border-0 bg-transparent px-2 py-0 text-center leading-5 focus:outline-none inline ${
                showResults
                  ? isCorrect
                    ? "text-green-700"
                    : hasAnswer
                      ? "text-red-700"
                      : "text-muted-foreground"
                  : "focus:ring-1 focus:ring-primary/50"
              }`}
              style={getBlankWidthStyle(width, true)}
            />
          </span>
          );
        }

        if (shouldRenderSolutionOverlay) {
          return (
            <span
              key={i}
              className="relative inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
              style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{correctAnswer || "\u00A0"}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: EXAMPLE_HANDWRITING_FONT,
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#15803d",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {correctAnswer}
              </span>
            </span>
          );
        }

        return (
          <span
            key={i}
            className="inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5"
            style={{ minHeight: "1.25rem", ...widthStyle, ...spacingStyle }}
          >
            {"\u00A0"}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      {block.instruction && (
        isOnline ? (
          <div
            className={CONSISTENT_INSTRUCTION_ROW_CLASS}
            style={{ color: accentColor || "var(--color-primary)" }}
          >
            <InstructionBadge instructionIndex={instructionIndex} />
            <p className="min-w-0 flex-1">{block.instruction}</p>
          </div>
        ) : (
          <InstructionRow instruction={block.instruction} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} />
        )
      )}
      {((block.showWordBank && gapAnswers.length > 0) || block.items.length > 0) && <SectionGap size="medium" />}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="flex min-h-[49px] flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {shuffledGapAnswers.map((text, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-background rounded border"
                  style={exampleAnswers.has(text) ? { color: "#0097dc" } : undefined}
                >
                  {exampleAnswers.has(text) ? <RoughExampleStrike>{text}</RoughExampleStrike> : text}
                </span>
              ))}
          </div>
        </div>
      )}
      <div>
        {block.items.map((item, i) => (
          <div key={item.id} className={isOnline ? CONSISTENT_ROW_CLASS : CONSISTENT_ROW_CLASS_PRINT}>
            <ItemNumberBadge index={i + 1} className="shrink-0" />
            {block.showOriginal ? (
              <div className="grid flex-1 gap-8 leading-5" style={originalColumnsStyle}>
                <div className="min-w-0 flex flex-wrap items-center">
                  {renderLineText(
                    item.text,
                    showSolutions ? "solution" : "default",
                    !!block.showFirstAsExample && i === 0,
                  )}
                </div>
                <div className="min-w-0 flex flex-wrap items-center">
                  {renderLineText(item.text, "original")}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-wrap items-center leading-5">
                {renderLineText(item.text, "default", !!block.showFirstAsExample && i === 0)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart View ──────────────────────────────────────────────
const ChartContent = dynamic(
  () => import("@/components/chart/chart-view").then((m) => m.ChartContent),
  { ssr: false, loading: () => <div className="w-full h-[300px] bg-muted/30 animate-pulse rounded" /> }
);

function ChartView({ block }: { block: ChartBlock }) {
  return (
    <div className="space-y-2">
      {block.title && (
        <p className="text-center font-semibold">{block.title}</p>
      )}
      <ChartContent block={block} />
    </div>
  );
}

// ─── Dos and Don'ts ─────────────────────────────────────────

function DosAndDontsView({ block }: { block: DosAndDontsBlock }) {
  const renderList = (items: DosAndDontsBlock["dos"], title: string) => (
    <div className={s.dosDontsColumn}>
      {block.showTitles !== false && (
        <p className={s.dosDontsTitle}>{title}</p>
      )}
      <ul className={`${s.lineDotList} lineDotList`}>
        {items.map((item) => (
          <li key={item.id} className={`${s.lineDotListItem} lineDotListItem`}>{item.text}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={`${s.dosDontsWrap} ${block.layout === "vertical" ? s.dosDontsWrapVertical : ""}`}>
      {renderList(block.dos, block.dosTitle)}
      {renderList(block.donts, block.dontsTitle)}
    </div>
  );
}

// ─── Text Comparison (Textvergleich) ─────────────────────────

function TextComparisonView({ block }: { block: TextComparisonBlock }) {
  const chColor = "#3A4F40";
  const deColor = "#990033";

  const renderSide = (
    content: string,
    color: string,
    flagSrc: string,
  ) => (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex">
        <div
          className="py-1 text-xs font-semibold rounded-t-sm text-center uppercase flex items-center justify-center border border-b-0 border-dashed"
          style={{ width: 44, paddingLeft: 12, paddingRight: 12, borderColor: color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc} alt="" className="h-4 w-6 object-cover" />
        </div>
      </div>
      <div
        className={`flex-1 border border-dashed rounded-sm py-3 pr-3 pl-6 rounded-tl-none ${s.styledBorder} ${s.textComparisonBox}`}
        style={{ "--block-color": color } as React.CSSProperties}
      >
        <div
          className="tiptap max-w-none"
          dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(content) }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className={s.textComparisonWrap}>
        {renderSide(block.leftContent, chColor, "/flags/ch.svg")}
        {renderSide(block.rightContent, deColor, "/flags/de.svg")}
      </div>
      {block.comment && (
        <div className={s.commentBox} style={{ "--block-color": "#475569" } as React.CSSProperties}>
          {block.comment}
        </div>
      )}
    </div>
  );
}

// ─── Numbered Items ─────────────────────────────────────────

function isDarkColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L < 0.35;
}

function NumberedItemsView({ block, originalBlock, isNonLatin, translationScale }: { block: NumberedItemsBlock; originalBlock?: NumberedItemsBlock; isNonLatin?: boolean; translationScale?: number }) {
  const hasBg = !!block.bgColor;
  const textWhite = hasBg && isDarkColor(block.bgColor!);
  const radius = block.borderRadius ?? 6;
  const surfaceBg = hasBg ? `${block.bgColor}${textWhite ? '18' : '40'}` : undefined;
  const isBilingual = block.bilingual && !!originalBlock;
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);

  const renderNumberedItemContent = (content: string, style?: React.CSSProperties, className?: string) => (
    <div className={`min-w-0 ${className ?? ""}`.trim()} style={style}>
      <div
        className="tiptap max-w-none text-foreground font-normal"
        dangerouslySetInnerHTML={{ __html: injectLiIcons(prepareTiptapHtml(content)) }}
      />
    </div>
  );

  const renderBilingualColumns = (originalContent: string, translatedContent: string) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "0 1rem",
        alignItems: "start",
      }}
    >
      {renderNumberedItemContent(originalContent)}
      {renderNumberedItemContent(
        translatedContent,
        effectiveScale ? { fontSize: `${effectiveScale}em`, borderLeft: "1px solid #e5e7eb", paddingLeft: "1rem" } : { borderLeft: "1px solid #e5e7eb", paddingLeft: "1rem" },
        "tiptap-bilingual-translated"
      )}
    </div>
  );

  if (!hasBg) {
    return (
      <div className={s.numberedItemsRows}>
        {block.items.map((item, i) => {
          const originalItem = originalBlock?.items[i];
          const showBilingual = isBilingual && !!originalItem && originalItem.content !== item.content;
          return (
            <div key={item.id} className={s.numberedItemRow}>
              <span className={s.accentBadge}>{String(block.startNumber + i).padStart(2, "0")}</span>
              <div className={s.numberedItemContent}>
                {showBilingual ? (
                  renderBilingualColumns(originalItem.content, item.content)
                ) : (
                  renderNumberedItemContent(item.content)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {block.items.map((item, i) => {
        const originalItem = originalBlock?.items[i];
        const showBilingual = isBilingual && !!originalItem && originalItem.content !== item.content;
        return (
          <div
            key={item.id}
            className="flex gap-0"
            style={hasBg ? {
              backgroundColor: surfaceBg,
              borderRadius: `${radius}px`,
              breakInside: "avoid",
              pageBreakInside: "avoid",
            } : undefined}
          >
            <div
              className="shrink-0 w-[30px] flex items-center justify-center font-bold"
              style={{
                backgroundColor: hasBg ? block.bgColor : 'var(--color-primary, #1a1a1a)12',
                color: hasBg ? (textWhite ? '#fff' : '#000') : 'var(--color-primary, #1a1a1a)',
                borderRadius: hasBg ? `${radius}px 0 0 ${radius}px` : `${radius}px`,
              }}
            >
              {String(block.startNumber + i).padStart(2, '0')}
            </div>
            {showBilingual ? (
              <div className="flex-1 min-w-0 px-3 py-1.5 text-foreground font-normal">
                {renderBilingualColumns(originalItem.content, item.content)}
              </div>
            ) : (
              <div className="flex-1 min-w-0 px-3 py-1.5 text-foreground font-normal">
                {renderNumberedItemContent(item.content)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Checklist View ────────────────────────────────────────────
function ChecklistView({
  block,
  originalBlock,
  mode,
  isNonLatin,
  translationScale,
}: {
  block: ChecklistBlock;
  originalBlock?: ChecklistBlock;
  mode: ViewMode;
  isNonLatin?: boolean;
  translationScale?: number;
}) {
  const isBilingual = !!block.bilingual && !!originalBlock;
  const isPrint = mode === "print";
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const rowClass = isPrint ? CONSISTENT_ROW_CLASS_PRINT : CONSISTENT_ROW_CLASS;

  const renderChecklistColumn = (
    item: ChecklistBlock["items"][number],
    style?: React.CSSProperties,
    options?: { withDivider?: boolean },
  ) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0, 1fr)",
        columnGap: "1rem",
        alignItems: isPrint ? "center" : "start",
        ...(options?.withDivider
          ? {
              borderLeft: "1px solid var(--border)",
              paddingLeft: "1rem",
            }
          : {}),
      }}
    >
      <div
        className={CONTROL_BOX_CLASS}
        style={isPrint
          ? { width: 16, height: 16, minWidth: 16, minHeight: 16 }
          : { marginTop: "0.15rem" }}
      />
      <div className={`${s.checklistText} tiptap-compact`} style={style}>
        <div
          className="tiptap max-w-none"
          dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(item.content) }}
        />
        {(item.writingLines ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {Array.from({ length: item.writingLines! }).map((_, i) => (
              <div key={i} style={{ height: 20, borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 0.5 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {block.items.map((item, index) => {
        const originalItem = originalBlock?.items.find((candidate) => candidate.id === item.id);
        const showBilingual = isBilingual && !!originalItem;

        return (
          <div
            key={item.id}
            className={rowClass}
            style={{ borderBottom: "var(--viewer-divider-style, 1px solid var(--border))" }}
          >
            <ItemNumberBadge index={index + 1} className="shrink-0" />
            {showBilingual
              ? (
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", columnGap: "1rem" }}>
                  {renderChecklistColumn(originalItem)}
                  {renderChecklistColumn(item, effectiveScale ? { fontSize: `${effectiveScale}em` } : undefined, { withDivider: true })}
                </div>
              )
              : renderChecklistColumn(item)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Accordion View ────────────────────────────────────────────
function AccordionView({
  block,
  mode,
  answer,
  onAnswer,
  showResults,
  showSolutions,
  primaryColor,
  interactiveColor,
  allBlocks,
  brand = "edoomio",
}: {
  block: AccordionBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  interactiveColor?: string;
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const answers = (answer as Record<string, unknown> | undefined) || {};

  return (
    <div className="space-y-0">
      {block.items.map((item, i) => (
        <div key={item.id} className="overflow-hidden course-content">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className={`flex min-h-[49px] w-full items-center gap-2 border-b border-border pl-0 pr-3 text-left ${i === 0 || openIndex === i - 1 ? "border-t" : ""}`.trim()}
          >
            {block.showNumbers && (
              <span className="shrink-0 font-black">{String(i + 1).padStart(2, '0')}</span>
            )}
            <span className="flex-1 font-medium">{item.title || "\u2026"}</span>
            <span className={s.accordionToggle}>
              {openIndex === i ? (
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Plus
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  style={mode === "online" && interactiveColor ? { color: interactiveColor } : undefined}
                />
              )}
            </span>
          </button>
          {openIndex === i && (
            <div className="pl-0 pr-3 py-2 space-y-2">
              {(item.children ?? []).map((childBlock) => (
                <ViewerBlockRenderer
                  key={childBlock.id}
                  block={childBlock}
                  mode={mode}
                  answer={answers[childBlock.id]}
                  onAnswer={(value) =>
                    onAnswer({ ...answers, [childBlock.id]: value })
                  }
                  showResults={showResults}
                  showSolutions={showSolutions}
                  primaryColor={primaryColor}
                  interactiveColor={interactiveColor}
                  allBlocks={allBlocks}
                  brand={brand}
                />
              ))}
              {(item.children ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">{"\u2026"}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Audio View ──────────────────────────────────────────────
function AudioView({ block, accentColor, primaryColor, mode }: { block: AudioBlock; accentColor?: string | null; primaryColor: string; mode: ViewMode }) {
  const color = accentColor || primaryColor;
  const isOnline = mode === "online";
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [slow, setSlow] = useState(false);

  // Poll currentTime via rAF for guaranteed updates
  React.useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        setTime(a.currentTime);
        if (a.duration && isFinite(a.duration)) setDur(a.duration);
        if (a.ended && playing) setPlaying(false);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = slow ? 0.85 : 1; a.play().catch(() => {}); setPlaying(true); }
  };

  const toggleSpeed = () => {
    const a = audioRef.current;
    const next = !slow;
    setSlow(next);
    if (a) a.playbackRate = next ? 0.85 : 1;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    const a = audioRef.current;
    if (!el || !a || dur <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * dur;
    setTime(a.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  if (!block.src) return null;

  return (
    <div className={isOnline ? "h-[45px] flex items-stretch rounded-[5px] overflow-hidden" : "h-[43px] flex items-stretch rounded-sm overflow-hidden"} style={{ borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}`, borderBottom: `1px solid ${color}`, borderLeft: 'none' }}>
      <audio ref={audioRef} src={block.src} preload="auto" muted={muted} />
      <div className="shrink-0 w-8 flex items-stretch">
        <button type="button" onClick={toggle} className="flex h-full w-full items-center justify-center text-white transition-colors" style={{ backgroundColor: color }}>
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          )}
        </button>
      </div>
      <div className="flex items-center gap-4 w-full px-4">
        {block.title && (
          <div className="shrink-0 px-6">
            <span className="text-sm font-medium max-w-[120px] truncate block" style={{ color: color }}>{block.title}</span>
          </div>
        )}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="flex-1 h-[6px] rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, ${color} ${pct}%, ${color}22 ${pct}%)` }}
        />
        <span className="text-xs tabular-nums shrink-0" style={{ color: color }}>{fmt(time)} / {fmt(dur)}</span>
        <button type="button" onClick={toggleSpeed} className="shrink-0 p-1 rounded transition-colors" style={{ color: color, opacity: slow ? 1 : 0.35 }}>
          {slow ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
        </button>
        <button type="button" onClick={() => setMuted(!muted)} className="transition-colors" style={{ color: color, opacity: muted ? 1 : 0.6 }}>
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function WebsiteView({
  block,
  originalBlock,
  brand,
  headlineFont,
  headingWeights,
  isNonLatin,
  translationScale,
  primaryColor,
}: {
  block: WebsiteBlock;
  originalBlock?: WebsiteBlock;
  brand?: Brand;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  isNonLatin?: boolean;
  translationScale?: number;
  primaryColor?: string;
}) {
  const HeadingTag = (`h${block.level}` as keyof React.JSX.IntrinsicElements);
  const sizes = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl" };
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.[`h${block.level}` as "h1" | "h2" | "h3"] ?? brandFonts.headlineWeight;
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const headingStyle: React.CSSProperties = {
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: primaryColor,
  };
  const originalTitle = originalBlock?.title?.trim() || "";
  const translatedTitle = block.title.trim();
  const bilingualOriginalTitle = originalTitle || translatedTitle;
  const showBilingualTitle = !!block.bilingual && !!translatedTitle;

  const normalizeExternalUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <div className="space-y-4">
      {translatedTitle ? (
        <HeadingTag className={`website-title ${sizes[block.level]}`} style={headingStyle}>
          {showBilingualTitle ? (
            <>
              <span style={{ ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}), fontWeight: resolvedHeadingWeight }}>
                {bilingualOriginalTitle}
              </span>
              <span style={{ fontWeight: 400 }}> | </span>
              <span style={{ fontWeight: 400 }}>{translatedTitle}</span>
            </>
          ) : (
            translatedTitle
          )}
        </HeadingTag>
      ) : null}

      <div className="website-items space-y-3">
        {block.items.map((item) => {
          const href = normalizeExternalUrl(item.url);
          const body = item.category || item.description || "";
          const translatedTextStyle = {
            color: "rgba(15, 23, 42, 0.72)",
            fontWeight: 400,
            ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}),
          } satisfies React.CSSProperties;

          return (
            <article
              key={item.id}
              className={`website-item flex min-h-[8rem] items-start gap-4 rounded-sm border bg-white p-4 ${item.aggregator ? "border-dashed border-slate-400" : "border-slate-200"}`}
              style={item.pageBreakAfter ? { breakAfter: "page", pageBreakAfter: "always" } : undefined}
            >
              <div className="aspect-video w-40 shrink-0 self-start overflow-hidden rounded-[2px] border border-slate-200 bg-slate-50">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title || "Website image"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-300">
                    Web
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-slate-900"
                  >
                    {item.title || href}
                  </a>
                ) : (
                  <div className="font-bold text-slate-900">{item.title}</div>
                )}
                {body ? (
                  <div className="mt-2 whitespace-pre-line text-sm font-normal normal-case tracking-normal text-slate-900" style={{ lineHeight: "1.35rem", ...translatedTextStyle }}>
                    {body}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleView({
  block,
  originalBlock,
  brand,
  bodyFont,
  isNonLatin,
  translationScale,
  primaryColor = "#1a1a1a",
}: {
  block: ScheduleBlock;
  originalBlock?: ScheduleBlock;
  brand?: Brand;
  bodyFont?: string;
  isNonLatin?: boolean;
  translationScale?: number;
  primaryColor?: string;
}) {
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedBodyFont = bodyFont || brandFonts.bodyFont;
  const wrapStyle: React.CSSProperties = isNonLatin ? { fontFamily: resolvedBodyFont } : {};

  return (
    <div style={wrapStyle}>
      <StaticScheduleTable
        items={block.items}
        originalItems={originalBlock?.items}
        primaryColor={primaryColor}
        showDate={block.showDate ?? false}
        showRoom={block.showRoom ?? false}
        showHeader={block.showHeader ?? false}
        bilingual={block.bilingual ?? false}
        translationScale={translationScale}
        isNonLatin={isNonLatin}
      />
    </div>
  );
}

function formatScheduleCellDate(dateStr: string): { weekday: string; formatted: string } {
  if (!dateStr) return { weekday: "", formatted: "" };
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { weekday: "", formatted: dateStr };
  const weekday = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"][d.getDay()] || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { weekday, formatted: `${dd}.${mm}.${yyyy}` };
}

function formatScheduleCellTime(value: string) {
  return value ? value.replace(":", ".") : "";
}

function StaticScheduleTable({
  items,
  originalItems,
  primaryColor,
  showDate,
  showRoom,
  showHeader,
  bilingual,
  translationScale,
  isNonLatin,
}: {
  items: ScheduleBlock["items"];
  originalItems?: ScheduleBlock["items"];
  primaryColor: string;
  showDate: boolean;
  showRoom: boolean;
  showHeader: boolean;
  bilingual: boolean;
  translationScale?: number;
  isNonLatin?: boolean;
}) {
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const rowCellStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    paddingTop: 6,
    paddingRight: 12,
    paddingBottom: 6,
    paddingLeft: 0,
    verticalAlign: "middle",
    boxSizing: "border-box",
  };
  const timeRowStyle: React.CSSProperties = {
    ...rowCellStyle,
    verticalAlign: "top",
  };
  const dashStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    paddingTop: 6,
    paddingRight: 2,
    paddingBottom: 6,
    paddingLeft: 2,
    verticalAlign: "top",
    textAlign: "center",
    boxSizing: "border-box",
    width: "1%",
  };
  const headerCellStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    textAlign: "left",
    color: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    textTransform: "none",
    paddingTop: 3,
    paddingRight: 12,
    paddingBottom: 3,
    paddingLeft: 0,
    verticalAlign: "middle",
    boxSizing: "border-box",
  };
  const headerTimeStyle: React.CSSProperties = {
    ...headerCellStyle,
    paddingLeft: 0,
    paddingRight: 2,
  };

  return (
    <>
      <style>{`
        .scheduleNew{width:100%;border-collapse:collapse;border-top:var(--viewer-divider-style, 1px solid var(--border));}
        .scheduleNew th,.scheduleNew td{border-bottom:var(--viewer-divider-style, 1px solid var(--border));vertical-align:middle;box-sizing:border-box;}
        .scheduleNew tbody td{height:37px;}
        .scheduleNew thead tr th{height:auto;border-bottom:var(--viewer-divider-style, 1px solid var(--border));font-weight:inherit;}
      `}</style>
      <table className="scheduleNew">
        <colgroup>
          {showDate && <col style={{ width: "1%" }} />}
          {showDate && <col style={{ width: "1%" }} />}
          <col style={{ width: "1%" }} />
          <col style={{ width: "1%" }} />
          <col style={{ width: "1%" }} />
          {showRoom && <col style={{ width: "1%" }} />}
          <col />
        </colgroup>
        {showHeader && (
          <thead>
            <tr>
              {showDate && <th colSpan={2} style={headerCellStyle}>Datum</th>}
              <th colSpan={3} style={headerTimeStyle}>Zeit</th>
              {showRoom && <th style={{ ...headerCellStyle, paddingRight: 16 }}>Raum</th>}
              <th style={{ ...headerCellStyle, whiteSpace: "normal" }}>Inhalt</th>
            </tr>
          </thead>
        )}
        <tbody>
          {items.map((item) => {
            const originalItem = originalItems?.find((candidate) => candidate.id === item.id);
            const { weekday, formatted } = formatScheduleCellDate(item.date);
            const showBilingualTitle = bilingual && !!originalItem && originalItem.title !== item.title;
            const showBilingualDescription = bilingual && !!originalItem && originalItem.description !== item.description;
            const bilingualPairStyle = {
              lineHeight: "1.1rem",
            } satisfies React.CSSProperties;
            const translatedTextStyle = {
              color: "rgba(15, 23, 42, 0.72)",
              fontWeight: 400,
              ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}),
            } satisfies React.CSSProperties;

            return (
              <tr key={item.id}>
                {showDate && <td style={rowCellStyle}>{weekday}</td>}
                {showDate && <td style={rowCellStyle}>{formatted}</td>}
                <td style={{ ...timeRowStyle, paddingLeft: 0, paddingRight: 2 }}>{formatScheduleCellTime(item.start)}</td>
                <td style={dashStyle}>–</td>
                <td style={{ ...timeRowStyle, paddingLeft: 0, paddingRight: 12 }}>{formatScheduleCellTime(item.end)}</td>
                {showRoom && <td style={{ ...rowCellStyle, paddingRight: 16 }}>{item.room}</td>}
                <td style={rowCellStyle}>
                  {showBilingualTitle ? (
                    <div style={{ ...bilingualPairStyle, marginBottom: originalItem.description || item.description ? "2px" : 0 }}>
                      <div style={{ fontWeight: 700 }}>{originalItem.title}</div>
                      <div style={translatedTextStyle}>{item.title}</div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                  )}
                  {showBilingualDescription ? (
                    <div style={bilingualPairStyle}>
                      {originalItem.description ? <div>{originalItem.description}</div> : null}
                      {item.description ? <div style={translatedTextStyle}>{item.description}</div> : null}
                    </div>
                  ) : item.description ? (
                    <div>{item.description}</div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ─── AI Prompt View ──────────────────────────────────────────
function AiPromptView({ block }: { block: AiPromptBlock }) {
  const t = useTranslations("viewer");
  const [userInput, setUserInput] = useState(block.userInput || "");
  const [aiResult, setAiResult] = useState(block.aiResult || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userInput.trim() || !block.prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const finalPrompt = block.prompt.replace(
        new RegExp(`\\{\\{${block.variableName}\\}\\}`, "g"),
        userInput
      );
      const res = await fetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Instructions */}
      {block.instructions && (
        <p className="text-sm text-slate-600">{block.instructions}</p>
      )}

      {/* Textarea */}
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={t("aiPromptPlaceholder")}
        className="w-full min-h-[120px] p-3 rounded-sm border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !userInput.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {t("aiPromptSubmit")}
      </button>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-2">
          {error}
        </div>
      )}

      {/* Result */}
      {aiResult && (
        <div className="border border-violet-200 rounded-sm p-4 bg-violet-50/30">
          <div className="text-xs text-violet-500 font-medium mb-2">{t("aiPromptResult")}</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{aiResult}</div>
        </div>
      )}
    </div>
  );
}

// ─── Table View ─────────────────────────────────────────────
/** Merge two TipTap table HTMLs so each cell shows original + translated content.
 *  Works via lightweight regex (no DOM) — safe for both SSR and client. */
function mergeBilingualTableHtml(originalHtml: string, translatedHtml: string): string {
  // Collect translated cell contents in document order
  const transCells: string[] = [];
  const cellPat = /(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi;
  let m: RegExpExecArray | null;
  while ((m = cellPat.exec(translatedHtml)) !== null) transCells.push(m[2]);
  if (transCells.length === 0) return originalHtml;

  let idx = 0;
  return originalHtml.replace(
    /(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi,
    (full, openTag, content, closeTag) => {
      const trans = transCells[idx++];
      if (!trans || content.trim() === trans.trim()) return full;
      return `${openTag}${content}<div style="border-top:1px dashed #d1d5db;margin-top:3px;padding-top:3px;color:#6b7280;font-style:italic">${trans}</div>${closeTag}`;
    },
  );
}

function TableView({
  block,
  originalBlock,
  mode,
  showSolutions = false,
  accentColor,
  instructionIndex,
}: {
  block: TableBlock | TableCloudBlock;
  originalBlock?: TableBlock | TableCloudBlock;
  mode: ViewMode;
  showSolutions?: boolean;
  accentColor?: string | null;
  instructionIndex?: number;
}) {
  const cloudRows = useMemo(
    () => ("cloudRows" in block ? (block.cloudRows || "") : "")
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0)
      .map((row, index) => {
        const marked = row.startsWith("*");
        const text = marked ? row.slice(1).trim() : row;
        return { index, text, marked };
      })
      .filter((entry) => entry.text.length > 0),
    [block],
  );

  const exampleCloudRow = useMemo(() => {
    if (!block.firstRowAsExample || cloudRows.length === 0) return null;
    return cloudRows.find((entry) => entry.marked) ?? null;
  }, [block.firstRowAsExample, cloudRows]);

  const remainingCloudRows = useMemo(
    () => cloudRows.filter((entry) => entry.index !== exampleCloudRow?.index),
    [cloudRows, exampleCloudRow],
  );

  const randomizedCloudRows = useMemo(
    () => deterministicShuffle(remainingCloudRows, `table-cloud:${block.id}:rows`),
    [block.id, remainingCloudRows],
  );

  let html = stripTablePixelWidths(prepareTiptapHtml(block.content));

  // Inject <colgroup> for column widths if defined on the block
  if (block.columnWidths && block.columnWidths.length > 0) {
    const colgroup = `<colgroup>${block.columnWidths.map((w) => `<col style="width:${w}%">`).join("")}</colgroup>`;
    if (/<colgroup>/i.test(html)) {
      html = html.replace(/<colgroup>[\s\S]*?<\/colgroup>/i, colgroup);
    } else {
      html = html.replace(/<table([^>]*)>/i, `<table$1>${colgroup}`);
    }
  }

  // Bilingual: merge translated content into each cell when enabled + translation is present
  if (block.bilingual && originalBlock && originalBlock.content !== block.content) {
    const origHtml = stripTablePixelWidths(prepareTiptapHtml(originalBlock.content));
    html = mergeBilingualTableHtml(origHtml, html);
  }

  if (block.hideHeader) {
    html = hideTableHeaderHtml(html);
  }

  html = renderBlankTokensInHtml(html);

  if (block.firstRowAsExample) {
    html = markFirstExampleRowHtml(html);
  }

  return (
    <div>
      {block.instruction && (
        <>
          <InstructionRow
            instruction={block.instruction}
            accentColor={accentColor}
            mode={mode}
            instructionIndex={instructionIndex}
          />
          <SectionGap size="large" />
        </>
      )}
      {block.type === "table-cloud" && randomizedCloudRows.length > 0 ? (
        <>
          <div className={CONSISTENT_ITEM_BANK_CLASS}>
            <div className="flex flex-1 flex-wrap gap-2">
              {exampleCloudRow ? (
                <span className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} bg-background`} style={{ color: "#0097dc" }}>
                  <RoughExampleStrike>{exampleCloudRow.text}</RoughExampleStrike>
                </span>
              ) : null}
              {randomizedCloudRows.map((entry) => (
                <span key={`${entry.text}-${entry.index}`} className={`${CONSISTENT_ITEM_BANK_CHIP_CLASS} bg-background`}>
                  {entry.text}
                </span>
              ))}
            </div>
          </div>
          <SectionGap size="medium" />
        </>
      ) : null}
      {block.description && (
        <p className="mt-2 mb-2">{block.description}</p>
      )}
      <div className={`table-block table-style-${block.tableStyle ?? "default"} ${
        block.firstRowAsExample ? "table-first-row-example" : ""
      } ${showSolutions ? "table-show-solutions" : ""}`.trim()}>
        <div
          className="tiptap-table-view"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {block.caption && (
          <p className="text-xs text-muted-foreground text-center mt-1 italic">{block.caption}</p>
        )}
      </div>
    </div>
  );
}

// ─── AI Tool View ───────────────────────────────────────────
function AiToolView({ block }: { block: AiToolBlock }) {
  return <ToolWorkflowShell block={block} />;
}

// ─── Main Renderer ──────────────────────────────────────────

export function ViewerBlockRenderer({
  block,
  mode,
  answer,
  onAnswer,
  showResults = false,
  showSolutions = false,
  primaryColor = "#1a1a1a",
  accentColor,
  interactiveColor,
  headlineFont,
  headingWeights,
  headingNumberWeights,
  allBlocks,
  brand = "edoomio",
  bodyFont,
  originalBodyFont,
  bodyFontSize,
  lessonLabel,
  originalBlock,
  isNonLatin = false,
  isRtl: _isRtl = false,
  instructionIndex,
  headingNumberFormats,
  headingColors,
  headingNumberColors,
  itemNumberFormat,
  translationScale,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
  answer?: unknown;
  onAnswer?: (value: unknown) => void;
  showResults?: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  accentColor?: string | null;
  interactiveColor?: string;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  headingNumberWeights?: { h1: number; h2: number; h3: number; h4: number };
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
  bodyFont?: string;
  originalBodyFont?: string;
  bodyFontSize?: string;
  lessonLabel?: string;
  originalBlock?: WorksheetBlock;
  instructionIndex?: number;
  headingNumberFormats?: Record<string, string>;
  headingColors?: Record<string, string>;
  headingNumberColors?: Record<string, string>;
  itemNumberFormat?: string;
  isNonLatin?: boolean;
  isRtl?: boolean;
  translationScale?: number;
}) {
  const inheritedItemNumberFormat = React.useContext(ItemNumberFormatContext);
  const resolvedItemNumberFormat = itemNumberFormat || inheritedItemNumberFormat || "default";
  const interactive = mode === "online";
  const noop = () => {};

  // Compute sequential task number for blocks with the AUFGABE pill
  const taskNumber = useMemo(() => {
    if (!allBlocks || !TASK_BLOCK_TYPES.has(block.type)) return undefined;
    const showsPill = "showPill" in block ? (block as { showPill?: boolean }).showPill !== false : true;
    if (!showsPill) return undefined;
    let count = 0;
    for (const b of allBlocks) {
      if (!TASK_BLOCK_TYPES.has(b.type)) continue;
      const bShowsPill = "showPill" in b ? (b as { showPill?: boolean }).showPill !== false : true;
      if (!bShowsPill) continue;
      count++;
      if (b.id === block.id) return count;
    }
    return undefined;
  }, [allBlocks, block]);

  const renderedBlock = (() => {
  switch (block.type) {
    case "heading":
      return <HeadingView block={block} originalBlock={originalBlock as HeadingBlock | undefined} brand={brand} headlineFont={headlineFont} headingWeights={headingWeights} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} accentColor={accentColor} headingColor={resolveHeadingColor(headingColors?.[`h${(block as HeadingBlock).level}`], primaryColor, accentColor)}/>;
    case "numbered-heading": {
      const nbBlock = block as NumberedHeadingBlock;
      const levelKey = `h${nbBlock.level}` as keyof typeof headingColors;
      return (
        <NumberedHeadingView
          block={nbBlock}
          brand={brand}
          headlineFont={headlineFont}
          headingWeights={headingWeights}
          headingNumberWeights={headingNumberWeights}
          isNonLatin={isNonLatin}
          translationScale={translationScale}
          primaryColor={primaryColor}
          accentColor={accentColor}
          headingColor={resolveHeadingColor(headingColors?.[levelKey], primaryColor, accentColor)}
          headingNumberColor={resolveHeadingColor(headingNumberColors?.[levelKey], primaryColor, accentColor)}
          headingNumberFormat={headingNumberFormats?.[levelKey]}
          allBlocks={allBlocks}
        />
      );
    }
    case "text":
      return <TextView block={block} originalBlock={originalBlock as TextBlock | undefined} mode={mode} bodyFont={bodyFont} originalBodyFont={originalBodyFont} bodyFontSize={bodyFontSize} isNonLatin={isNonLatin} isRtl={_isRtl} translationScale={translationScale} primaryColor={primaryColor} accentColor={accentColor} instructionIndex={instructionIndex} brand={brand}/>;
    case "syllables":
      return <SyllablesView block={block} mode={mode} instructionIndex={instructionIndex} accentColor={accentColor} />;
    case "image":
      return <ImageView block={block} />;
    case "image-cards":
      return <ImageCardsView block={block} />;
    case "image-text-table":
      return <ImageTextTableView block={block} accentColor={accentColor} mode={mode} instructionIndex={instructionIndex} showSolutions={showSolutions} />;
    case "text-cards":
      return <TextCardsView block={block} />;
    case "spacer":
      return <SpacerView block={block} />;
    case "divider":
      return <DividerView block={block} />;
    case "logo-divider":
      return <LogoDividerView block={block as LogoDividerBlock} brand={brand} />;
    case "page-break":
      return <PageBreakView block={block} />;
    case "writing-lines":
      return <WritingLinesView block={block} />;
    case "writing-rows":
      return <WritingRowsView block={block} />;
    case "multiple-choice":
      return (
        <MultipleChoiceView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "fill-in-blank":
      return (
        <FillInBlankView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          mode={mode}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "fill-in-blank-items":
      return (
        <FillInBlankItemsView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          mode={mode}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "matching":
      return (
        <MatchingView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "pronunciation":
      return (
        <MatchingView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
            onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "two-column-fill":
      return (
        <TwoColumnFillView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "glossary":
      return (
        <GlossaryView
          block={block}
          brand={brand}
          bodyFont={bodyFont}
          isNonLatin={isNonLatin}
          translationScale={translationScale}
         
        />
      );
    case "open-response":
      return (
        <OpenResponseView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
         
        />
      );
    case "word-bank":
      return <WordBankView block={block} />;
    case "number-line":
      return <NumberLineView block={block} />;
    case "true-false-matrix":
      return (
        <TrueFalseMatrixView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          showPill={block.showPill !== false}
          taskNumber={taskNumber}
          lessonLabel={lessonLabel}
          brand={brand}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          isNonLatin={isNonLatin}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "mcq-matrix":
      return (
        <MCQMatrixView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          showPill={block.showPill !== false}
          taskNumber={taskNumber}
          lessonLabel={lessonLabel}
          brand={brand}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          isNonLatin={isNonLatin}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "mcq-rows":
      return (
        <MCQRowsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "article-training":
      return (
        <ArticleTrainingView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "order-items":
      return (
        <OrderItemsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "inline-choices":
      return (
        <InlineChoicesView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          mode={mode}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "crossword":
      return (
        <CrosswordView
          block={block}
          mode={mode}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "word-search":
      return (
        <WordSearchView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "sorting-categories":
      return (
        <SortingCategoriesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer ?? undefined}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "correct-spelling":
      return (
        <CorrectSpellingView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "correct-spelling":
    case "correct-numbers":
    case "missing-letters":
      return (
        <CorrectSpellingView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "letter-code":
      return (
        <LetterCodeView
          block={block as LetterCodeBlock}
          mode={mode}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "unscramble-words":
      return (
        <UnscrambleWordsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "fix-sentences":
      return (
        <FixSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "complete-sentences":
      return (
        <CompleteSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "start-sentences":
      return (
        <StartSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "transform-sentences":
      return (
        <TransformSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "reading-comprehension":
      return (
        <ReadingComprehensionView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
          allBlocks={allBlocks}
        />
      );
    case "verb-table":
      return (
        <VerbTableView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          primaryColor={primaryColor}
          accentColor={accentColor}
          interactiveColor={interactiveColor}
          instructionIndex={instructionIndex}
        />
      );
    case "chart":
      return <ChartView block={block} />;
    case "dialogue":
      return (
        <DialogueView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer as Record<string, string>}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
          brand={brand}
        />
      );
    case "lueckenzeilen":
      return (
        <LueckenzeilenView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer as Record<string, string>}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          accentColor={accentColor}
          instructionIndex={instructionIndex}
        />
      );
    case "numbered-label":
      return <NumberedLabelView block={block} originalBlock={originalBlock as NumberedLabelBlock | undefined} allBlocks={allBlocks} primaryColor={primaryColor} />;
    case "columns":
      return (
        <ColumnsView
          block={block}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
          allBlocks={allBlocks}
          brand={brand}
         
        />
      );
    case "grid":
      return (
        <GridView
          block={block as GridBlock}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
          allBlocks={allBlocks}
          brand={brand}
         
        />
      );
    case "board-game":
      return <BoardGameView block={block as BoardGameBlock} mode={mode} />;
    case "domino":
      return <DominoView block={block as DominoBlock} mode={mode} brand={brand} primaryColor={primaryColor} accentColor={accentColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "card-pairs":
      return <CardPairsView block={block as CardPairsBlock} mode={mode} brand={brand} primaryColor={primaryColor} accentColor={accentColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "flashcards":
      return <FlashcardsView block={block as FlashcardsBlock} mode={mode} brand={brand} primaryColor={primaryColor} accentColor={accentColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "aufgabenkarten":
      return <AufgabenkartenView block={block as AufgabenkartenBlock} mode={mode} brand={brand} primaryColor={primaryColor} accentColor={accentColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "bingo-cards":
      return <BingoCardsRenderer block={block as BingoCardsBlock} mode={mode} />;
    case "syllable-cards":
      return <SyllableCardsView block={block as SyllableCardsBlock} mode={mode} brand={brand} primaryColor={primaryColor} accentColor={accentColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "text-snippet":
      return <TextSnippetView block={block as TextSnippetBlock} mode={mode} />;
    case "email-skeleton":
      return <EmailSkeletonView block={block as EmailSkeletonBlock} />;
    case "job-application":
      return <JobApplicationView block={block as JobApplicationBlock} />;
    case "dos-and-donts":
      return <DosAndDontsView block={block as DosAndDontsBlock} />;
    case "text-comparison":
      return <TextComparisonView block={block as TextComparisonBlock} />;
    case "numbered-items":
      return <NumberedItemsView block={block as NumberedItemsBlock} originalBlock={originalBlock as NumberedItemsBlock | undefined} isNonLatin={isNonLatin} translationScale={translationScale} />;
    case "quartett":
      return <QuartettView block={block as QuartettBlock} mode={mode} brand={brand} primaryColor={primaryColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "taboo":
      return <TabooView block={block as TabooBlock} mode={mode} brand={brand} primaryColor={primaryColor} headlineFont={headlineFont} headingWeights={headingWeights} headingColor={resolveHeadingColor(headingColors?.h3, primaryColor, accentColor)} />;
    case "checklist":
      return <ChecklistView block={block as ChecklistBlock} originalBlock={originalBlock as ChecklistBlock | undefined} mode={mode} isNonLatin={isNonLatin} translationScale={translationScale} />;
    case "accordion":
      return (
        <AccordionView
          block={block as AccordionBlock}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
          interactiveColor={interactiveColor}
          allBlocks={allBlocks}
          brand={brand}
         
        />
      );
    case "ai-prompt":
      return <AiPromptView block={block as AiPromptBlock} />;
    case "ai-tool":
      return <AiToolView block={block as AiToolBlock} />;
    case "table":
      return <TableView block={block as TableBlock} originalBlock={originalBlock as TableBlock | undefined} mode={mode} showSolutions={showSolutions} accentColor={accentColor} instructionIndex={instructionIndex} />;
    case "table-cloud":
      return <TableView block={block as TableCloudBlock} originalBlock={originalBlock as TableCloudBlock | undefined} mode={mode} showSolutions={showSolutions} accentColor={accentColor} instructionIndex={instructionIndex} />;
    case "audio":
      return <AudioView block={block as AudioBlock} accentColor={accentColor} primaryColor={primaryColor} mode={mode} />;
    case "schedule":
      return <ScheduleView block={block as ScheduleBlock} originalBlock={originalBlock as ScheduleBlock | undefined} brand={brand} bodyFont={bodyFont} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    case "website":
      return <WebsiteView block={block as WebsiteBlock} originalBlock={originalBlock as WebsiteBlock | undefined} brand={brand} headlineFont={headlineFont} headingWeights={headingWeights} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    case "segmentation":
      return <SegmentationView block={block as SegmentationBlock} showSolutions={showSolutions} mode={mode} accentColor={accentColor} instructionIndex={instructionIndex} />;
    default:
      return null;
  }
  })();

  return (
    <ItemNumberFormatContext.Provider value={resolvedItemNumberFormat}>
      {renderedBlock}
    </ItemNumberFormatContext.Provider>
  );
}
