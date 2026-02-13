/**
 * Translations that are defined in code rather than in i18nexus.
 *
 * WHY: i18nexus is the source of truth for translations and overwrites
 * the local JSON files via `i18nexus listen` / `i18nexus pull`.
 * Any keys added locally to the JSON files get wiped on the next sync
 * if they don't exist in the i18nexus project.
 *
 * For translations that are tightly coupled to code (block definitions,
 * AI modal UI strings), we define them here so they can never be lost.
 * The JSON files can still override these if the keys exist in i18nexus.
 *
 * HOW TO ADD NEW TRANSLATIONS:
 * 1. Add the namespace + keys here with en + de values
 * 2. Use `useTranslations("yourNamespace")` in your component as usual
 * 3. That's it — no need to touch JSON files or i18nexus
 */

import { BLOCK_LIBRARY } from "@/types/worksheet";

type TranslationMap = Record<string, string>;
type LocaleTranslations = Record<string, TranslationMap>;

// ─── Block sidebar labels (derived from BLOCK_LIBRARY) ──────

export function getBlockTranslations(locale: string): TranslationMap {
  const merged: TranslationMap = {};
  for (const def of BLOCK_LIBRARY) {
    const localized = def.translations?.[locale];
    merged[def.labelKey] = localized?.label ?? def.label;
    merged[def.descriptionKey] = localized?.description ?? def.description;
  }
  return merged;
}

// ─── AI Verb Table Modal ────────────────────────────────────

const aiVerbTable: LocaleTranslations = {
  en: {
    title: "Generate Verb Conjugation",
    stepVerb: "Verb",
    stepTense: "Tense",
    stepGenerate: "Generate",
    stepVerbDesc: "Enter the verb infinitive",
    stepTenseDesc: "Choose the tense",
    stepGeneratingDesc: "AI is generating conjugations…",
    stepReviewDesc: "Review and apply",
    verbLabel: "Verb",
    verbPlaceholder: "e.g. machen, spielen, lesen…",
    verbHelp: "Enter the infinitive form of the verb",
    tensePraesens: "Präsens",
    tensePraesensDesc: "Present tense",
    tensePraeteritum: "Präteritum",
    tensePraeteritumDesc: "Simple past",
    tensePerfekt: "Perfekt",
    tensePerfektDesc: "Present perfect (two-part)",
    tensePlusquamperfekt: "Plusquamperfekt",
    tensePlusquamperfektDesc: "Past perfect (two-part)",
    tenseFutur1: "Futur I",
    tenseFutur1Desc: "Future tense (two-part)",
    twoPartLabel: "two-part",
    generating: "Generating conjugation for \"{verb}\"…",
    tenseLabel: "Tense",
    colPerson: "Person",
    colPronoun: "Pronoun",
    colConjugation: "Conjugation",
    colConjugation2: "Prefix / Particle",
    singular: "Singular",
    plural: "Plural",
    applyToBlock: "Apply to Block",
    generationFailed: "Generation failed. Please try again.",
  },
  de: {
    title: "Verbkonjugation generieren",
    stepVerb: "Verb",
    stepTense: "Zeitform",
    stepGenerate: "Generieren",
    stepVerbDesc: "Geben Sie den Infinitiv ein",
    stepTenseDesc: "Wählen Sie die Zeitform",
    stepGeneratingDesc: "KI generiert Konjugationen…",
    stepReviewDesc: "Überprüfen und anwenden",
    verbLabel: "Verb",
    verbPlaceholder: "z.B. machen, spielen, lesen…",
    verbHelp: "Geben Sie die Infinitivform des Verbs ein",
    tensePraesens: "Präsens",
    tensePraesensDesc: "Gegenwartsform",
    tensePraeteritum: "Präteritum",
    tensePraeteritumDesc: "Einfache Vergangenheit",
    tensePerfekt: "Perfekt",
    tensePerfektDesc: "Vollendete Gegenwart (zweiteilig)",
    tensePlusquamperfekt: "Plusquamperfekt",
    tensePlusquamperfektDesc: "Vollendete Vergangenheit (zweiteilig)",
    tenseFutur1: "Futur I",
    tenseFutur1Desc: "Zukunftsform (zweiteilig)",
    twoPartLabel: "zweiteilig",
    generating: "Konjugation für \"{verb}\" wird generiert…",
    tenseLabel: "Zeitform",
    colPerson: "Person",
    colPronoun: "Pronomen",
    colConjugation: "Konjugation",
    colConjugation2: "Präfix / Partikel",
    singular: "Singular",
    plural: "Plural",
    applyToBlock: "In Block übernehmen",
    generationFailed: "Generierung fehlgeschlagen. Bitte erneut versuchen.",
  },
};

// ─── Sidebar (account + navigation sections) ───────────────

const sidebar: LocaleTranslations = {
  en: {
    account: "Account",
    accountSettings: "Account settings",
    security: "Security",
    cards: "Cards",
    newCards: "New Cards",
    cardLibrary: "Card Library",
    flashcards: "Flashcards",
    newFlashcards: "New Flashcards",
    flashcardLibrary: "Flashcard Library",
    ebooks: "E-Books",
    newEbook: "New E-Book",
  },
  de: {
    account: "Konto",
    accountSettings: "Kontoeinstellungen",
    security: "Sicherheit",
    cards: "Karten",
    newCards: "Neue Karten",
    cardLibrary: "Karten-Bibliothek",
    flashcards: "Lernkarten",
    newFlashcards: "Neue Lernkarten",
    flashcardLibrary: "Lernkarten-Bibliothek",
    ebooks: "E-Books",
    newEbook: "Neues E-Book",
  },
};

// ─── E-Book Editor & Dashboard ──────────────────────────────

const ebook: LocaleTranslations = {
  en: {
    addChapter: "Add chapter",
    addWorksheets: "Add worksheets",
    author: "Author",
    backgroundColor: "Background color",
    chapterCount: "{count} chapters",
    chapters: "Chapters",
    cover: "Cover",
    coverSettings: "Cover settings",
    createEbook: "Create e-book",
    createFirstEbook: "Create your first e-book",
    deleteChapter: "Delete chapter?",
    deleteEbook: "Delete e-book?",
    downloadPdf: "Download PDF",
    emptyChapter: "This chapter has no worksheets yet",
    footerSettings: "Header/Footer",
    generatingPdf: "Generating PDF…",
    newEbook: "New e-book",
    noChapters: "No chapters yet",
    noEbooks: "No e-books found",
    noEbooksYet: "No e-books yet",
    noWorksheetsSelected: "No worksheets found",
    pageNumberFormat: "Page number format",
    pageNumberPosition: "Page number position",
    preview: "Preview",
    selectWorksheets: "Select worksheets",
    settings: "Settings",
    showLogo: "Show logo",
    showPageNumbers: "Show page numbers",
    showToc: "Show table of contents",
    subtitle: "Create and manage your e-books",
    subtitlePlaceholder: "Subtitle",
    tableOfContents: "Table of contents",
    textColor: "Text color",
    title: "My e-books",
    titlePlaceholder: "Enter title…",
    tocTitle: "Table of contents title",
    untitledChapter: "Untitled chapter",
    untitledEbook: "Untitled e-book",
    worksheetCount: "{count} worksheets",
  },
  de: {
    addChapter: "Kapitel hinzufügen",
    addWorksheets: "Arbeitsblätter hinzufügen",
    author: "Autor",
    backgroundColor: "Hintergrundfarbe",
    chapterCount: "{count} Kapitel",
    chapters: "Kapitel",
    cover: "Cover",
    coverSettings: "Cover-Einstellungen",
    createEbook: "E-Book erstellen",
    createFirstEbook: "Erstelle dein erstes E-Book",
    deleteChapter: "Kapitel löschen?",
    deleteEbook: "E-Book löschen?",
    downloadPdf: "PDF herunterladen",
    emptyChapter: "Dieses Kapitel enthält noch keine Arbeitsblätter",
    footerSettings: "Kopf-/Fusszeile",
    generatingPdf: "PDF wird erstellt…",
    newEbook: "Neues E-Book",
    noChapters: "Keine Kapitel vorhanden",
    noEbooks: "Keine E-Books gefunden",
    noEbooksYet: "Noch keine E-Books vorhanden",
    noWorksheetsSelected: "Keine Arbeitsblätter gefunden",
    pageNumberFormat: "Seitenzahl-Format",
    pageNumberPosition: "Seitenzahl-Position",
    preview: "Vorschau",
    selectWorksheets: "Arbeitsblätter auswählen",
    settings: "Einstellungen",
    showLogo: "Logo anzeigen",
    showPageNumbers: "Seitenzahlen anzeigen",
    showToc: "Inhaltsverzeichnis anzeigen",
    subtitle: "Erstelle und verwalte deine E-Books",
    subtitlePlaceholder: "Untertitel",
    tableOfContents: "Inhaltsverzeichnis",
    textColor: "Textfarbe",
    title: "Meine E-Books",
    titlePlaceholder: "Titel eingeben…",
    tocTitle: "Titel des Inhaltsverzeichnisses",
    untitledChapter: "Unbenanntes Kapitel",
    untitledEbook: "Unbenanntes E-Book",
    worksheetCount: "{count} Arbeitsblätter",
  },
};

// ─── Flashcard Editor ───────────────────────────────────────

const flashcardEditor: LocaleTranslations = {
  en: {
    addCard: "Add card",
    back: "Back",
    cardCount: "{count} cards",
    cardNumber: "Card {number}",
    deleteCard: "Delete card",
    downloadPdf: "Download PDF",
    downloadPdfTooltip: "Generate and download PDF",
    dragOrClick: "Drag image here or click",
    dropImage: "Drop image",
    duplicateCard: "Duplicate card",
    front: "Front",
    imageScale: "Image scale",
    noCards: "No cards",
    noCardsDescription: "Add cards to create your flashcard set.",
    pdfFailed: "PDF creation failed: {error}",
    saveFirst: "Please save first before downloading PDF",
    textPlaceholder: "Enter text…",
    textPosition_bottom: "Text bottom",
    textPosition_center: "Text center",
    textPosition_top: "Text top",
    titlePlaceholder: "Enter flashcard set title…",
  },
  de: {
    addCard: "Karte hinzufügen",
    back: "Rückseite",
    cardCount: "{count} Karten",
    cardNumber: "Karte {number}",
    deleteCard: "Karte löschen",
    downloadPdf: "PDF herunterladen",
    downloadPdfTooltip: "PDF generieren und herunterladen",
    dragOrClick: "Bild hierher ziehen oder klicken",
    dropImage: "Bild ablegen",
    duplicateCard: "Karte duplizieren",
    front: "Vorderseite",
    imageScale: "Bildgrösse",
    noCards: "Keine Karten",
    noCardsDescription: "Füge Karten hinzu, um dein Lernkarten-Set zu erstellen.",
    pdfFailed: "PDF-Erstellung fehlgeschlagen: {error}",
    saveFirst: "Bitte zuerst speichern, bevor du das PDF herunterlädst",
    textPlaceholder: "Text eingeben…",
    textPosition_bottom: "Text unten",
    textPosition_center: "Text zentriert",
    textPosition_top: "Text oben",
    titlePlaceholder: "Lernkarten-Titel eingeben…",
  },
};

// ─── Flashcard Dashboard ────────────────────────────────────

const flashcardDashboard: LocaleTranslations = {
  en: {
    cardCount: "{count} cards",
    createFirstFlashcards: "Create your first flashcard set",
    createFlashcards: "Create flashcards",
    deleteFlashcards: "Delete flashcards?",
    newFlashcards: "New flashcards",
    noFlashcards: "No flashcards found",
    noFlashcardsYet: "No flashcards yet",
    searchPlaceholder: "Search flashcards…",
    searchResults: "{count} result(s) for \"{query}\"",
    searching: "Searching…",
    subtitle: "Create and manage your flashcards",
    title: "My flashcards",
    tryDifferentSearch: "Try a different search",
  },
  de: {
    cardCount: "{count} Karten",
    createFirstFlashcards: "Erstelle dein erstes Lernkarten-Set",
    createFlashcards: "Lernkarten erstellen",
    deleteFlashcards: "Lernkarten löschen?",
    newFlashcards: "Neue Lernkarten",
    noFlashcards: "Keine Lernkarten gefunden",
    noFlashcardsYet: "Noch keine Lernkarten vorhanden",
    searchPlaceholder: "Lernkarten suchen…",
    searchResults: "{count} Ergebnis(se) für \"{query}\"",
    searching: "Suche…",
    subtitle: "Erstelle und verwalte deine Lernkarten",
    title: "Meine Lernkarten",
    tryDifferentSearch: "Versuche eine andere Suche",
  },
};

// ─── Card Editor ────────────────────────────────────────────

const cardEditor: LocaleTranslations = {
  en: {
    titlePlaceholder: "Enter card title…",
    cardCount: "{count} cards",
    pageCount: "{count} pages",
    addCard: "Add card",
    noCards: "No cards",
    noCardsDescription: "Add cards to create your card layout.",
    cardNumber: "Card {number}",
    pageSlot: "Page {page}, slot {slot}",
    duplicateCard: "Duplicate card",
    deleteCard: "Delete card",
    textPlaceholder: "Enter text…",
    imageScale: "Image scale",
    dragOrClick: "Drag image here or click",
    dropImage: "Drop image",
    textPosition_top: "Text top",
    textPosition_center: "Text center",
    textPosition_bottom: "Text bottom",
    preview: "Preview",
    previewTooltip: "Show print preview",
    previewDescription: "DIN A4 landscape, 2×2 grid, cutting lines",
    emptyCard: "Empty card",
    emptySlot: "Empty",
    settings: "Settings",
    showCuttingLines: "Show cutting lines",
    lineStyle_dashed: "Dashed",
    lineStyle_dotted: "Dotted",
    lineStyle_solid: "Solid",
    cardPadding: "Card padding",
    downloadPdf: "Download PDF",
    downloadPdfTooltip: "Generate and download PDF",
    saveFirst: "Please save first before downloading PDF",
    pdfFailed: "PDF creation failed: {error}",
  },
  de: {
    titlePlaceholder: "Kartentitel eingeben…",
    cardCount: "{count} Karten",
    pageCount: "{count} Seiten",
    addCard: "Karte hinzufügen",
    noCards: "Keine Karten",
    noCardsDescription: "Füge Karten hinzu, um dein Kartenlayout zu erstellen.",
    cardNumber: "Karte {number}",
    pageSlot: "Seite {page}, Position {slot}",
    duplicateCard: "Karte duplizieren",
    deleteCard: "Karte löschen",
    textPlaceholder: "Text eingeben…",
    imageScale: "Bildgrösse",
    dragOrClick: "Bild hierher ziehen oder klicken",
    dropImage: "Bild ablegen",
    textPosition_top: "Text oben",
    textPosition_center: "Text zentriert",
    textPosition_bottom: "Text unten",
    preview: "Vorschau",
    previewTooltip: "Druckvorschau anzeigen",
    previewDescription: "DIN A4 Querformat, 2×2 Raster, Schnittlinien",
    emptyCard: "Leere Karte",
    emptySlot: "Leer",
    settings: "Einstellungen",
    showCuttingLines: "Schnittlinien anzeigen",
    lineStyle_dashed: "Gestrichelt",
    lineStyle_dotted: "Gepunktet",
    lineStyle_solid: "Durchgezogen",
    cardPadding: "Kartenabstand",
    downloadPdf: "PDF herunterladen",
    downloadPdfTooltip: "PDF generieren und herunterladen",
    saveFirst: "Bitte zuerst speichern, bevor du das PDF herunterlädst",
    pdfFailed: "PDF-Erstellung fehlgeschlagen: {error}",
  },
};

// ─── Cards Dashboard ────────────────────────────────────────

const cardsDashboard: LocaleTranslations = {
  en: {
    title: "My Cards",
    subtitle: "Create and manage your card layouts",
    newCards: "New Cards",
    searchPlaceholder: "Search cards…",
    searching: "Searching…",
    searchResults: "{count} result(s) for \"{query}\"",
    noCards: "No cards",
    noCardsYet: "No cards available yet",
    createFirstCards: "Create your first card layout",
    createCards: "Create cards",
    deleteCards: "Delete cards?",
    tryDifferentSearch: "Try a different search",
    cardCount: "{count} cards",
  },
  de: {
    title: "Meine Karten",
    subtitle: "Erstelle und verwalte deine Kartenlayouts",
    newCards: "Neue Karten",
    searchPlaceholder: "Karten suchen…",
    searching: "Suche…",
    searchResults: "{count} Ergebnis(se) für \"{query}\"",
    noCards: "Keine Karten",
    noCardsYet: "Noch keine Karten vorhanden",
    createFirstCards: "Erstelle dein erstes Kartenlayout",
    createCards: "Karten erstellen",
    deleteCards: "Karten löschen?",
    tryDifferentSearch: "Versuche eine andere Suche",
    cardCount: "{count} Karten",
  },
};

// ─── Registry of all code-defined namespaces ────────────────

const CODE_NAMESPACES: Record<string, LocaleTranslations> = {
  aiVerbTable,
  sidebar,
  ebook,
  flashcardEditor,
  flashcardDashboard,
  cardEditor,
  cardsDashboard,
};

/**
 * Merge code-defined translations into the messages loaded from JSON.
 * JSON values take precedence (so i18nexus overrides still work),
 * but missing keys are filled from code.
 */
export function mergeCodeTranslations(
  messages: Record<string, unknown>,
  locale: string
): Record<string, unknown> {
  const result = { ...messages };

  // Merge block translations
  const existingBlocks = (result.blocks ?? {}) as TranslationMap;
  const codeBlocks = getBlockTranslations(locale);
  result.blocks = { ...codeBlocks, ...existingBlocks };

  // Merge all other code-defined namespaces
  for (const [ns, translations] of Object.entries(CODE_NAMESPACES)) {
    const existing = (result[ns] ?? {}) as TranslationMap;
    const codeValues = translations[locale] ?? translations.en ?? {};
    result[ns] = { ...codeValues, ...existing };
  }

  return result;
}
