#!/usr/bin/env node
/**
 * ONE-TIME MIGRATION SCRIPT
 *
 * Merges all code-defined translations (from code-translations.ts and
 * BLOCK_LIBRARY) into the JSON message files so they can be uploaded
 * to i18nexus as the single source of truth.
 *
 * Run:  node scripts/migrate-translations.mjs
 * Then: npm run i18n:import:all   (uploads both locales to i18nexus)
 * Then: npm run i18n:pull          (pulls back to verify round-trip)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ─── Code-defined translations (mirrored from code-translations.ts) ────

const CODE_NAMESPACES = {
  aiVerbTable: {
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
      generating: 'Generating conjugation for "{verb}"…',
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
      generating: 'Konjugation für "{verb}" wird generiert…',
      tenseLabel: "Zeitform",
      colPerson: "Person",
      colPronoun: "Pronomen",
      colConjugation: "Konjugation",
      colConjugation2: "Präfix / Partikel",
      singular: "Singular",
      plural: "Plural",
      applyToBlock: "In Block übernehmen",
      generationFailed:
        "Generierung fehlgeschlagen. Bitte erneut versuchen.",
    },
  },

  sidebar: {
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
      grammarTables: "Grammar Tables",
      newGrammarTable: "New Grammar Table",
      grammarTableLibrary: "Grammar Table Library",
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
      grammarTables: "Grammatiktabellen",
      newGrammarTable: "Neue Grammatiktabelle",
      grammarTableLibrary: "Grammatiktabellen-Bibliothek",
    },
  },

  ebook: {
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
      emptyChapter:
        "Dieses Kapitel enthält noch keine Arbeitsblätter",
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
  },

  flashcardEditor: {
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
      noCardsDescription:
        "Füge Karten hinzu, um dein Lernkarten-Set zu erstellen.",
      pdfFailed: "PDF-Erstellung fehlgeschlagen: {error}",
      saveFirst:
        "Bitte zuerst speichern, bevor du das PDF herunterlädst",
      textPlaceholder: "Text eingeben…",
      textPosition_bottom: "Text unten",
      textPosition_center: "Text zentriert",
      textPosition_top: "Text oben",
      titlePlaceholder: "Lernkarten-Titel eingeben…",
    },
  },

  flashcardDashboard: {
    en: {
      cardCount: "{count} cards",
      createFirstFlashcards: "Create your first flashcard set",
      createFlashcards: "Create flashcards",
      deleteFlashcards: "Delete flashcards?",
      newFlashcards: "New flashcards",
      noFlashcards: "No flashcards found",
      noFlashcardsYet: "No flashcards yet",
      searchPlaceholder: "Search flashcards…",
      searchResults: '{count} result(s) for "{query}"',
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
      searchResults: '{count} Ergebnis(se) für "{query}"',
      searching: "Suche…",
      subtitle: "Erstelle und verwalte deine Lernkarten",
      title: "Meine Lernkarten",
      tryDifferentSearch: "Versuche eine andere Suche",
    },
  },

  cardEditor: {
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
      noCardsDescription:
        "Füge Karten hinzu, um dein Kartenlayout zu erstellen.",
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
      previewDescription:
        "DIN A4 Querformat, 2×2 Raster, Schnittlinien",
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
      saveFirst:
        "Bitte zuerst speichern, bevor du das PDF herunterlädst",
      pdfFailed: "PDF-Erstellung fehlgeschlagen: {error}",
    },
  },

  cardsDashboard: {
    en: {
      title: "My Cards",
      subtitle: "Create and manage your card layouts",
      newCards: "New Cards",
      searchPlaceholder: "Search cards…",
      searching: "Searching…",
      searchResults: '{count} result(s) for "{query}"',
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
      searchResults: '{count} Ergebnis(se) für "{query}"',
      noCards: "Keine Karten",
      noCardsYet: "Noch keine Karten vorhanden",
      createFirstCards: "Erstelle dein erstes Kartenlayout",
      createCards: "Karten erstellen",
      deleteCards: "Karten löschen?",
      tryDifferentSearch: "Versuche eine andere Suche",
      cardCount: "{count} Karten",
    },
  },

  grammarTableDashboard: {
    en: {
      title: "Grammar Tables",
      subtitle: "Create and manage grammar reference tables",
      newTable: "New Table",
      searchPlaceholder: "Search tables…",
      searching: "Searching…",
      searchResults: '{count} result(s) for "{query}"',
      noTables: "No tables found",
      noTablesYet: "No grammar tables yet",
      createFirstTable: "Create your first grammar table",
      createTable: "Create table",
      deleteConfirm: "Delete this grammar table?",
      tryDifferentSearch: "Try a different search",
      adjektivdeklination: "Adjective Declination",
      verbkonjugation: "Verb Conjugation",
      verbenMitPraepositionen: "Verbs with Prepositions",
      grammarTable: "Grammar Table",
    },
    de: {
      title: "Grammatiktabellen",
      subtitle: "Erstelle und verwalte Grammatik-Referenztabellen",
      newTable: "Neue Tabelle",
      searchPlaceholder: "Tabellen suchen…",
      searching: "Suche…",
      searchResults: '{count} Ergebnis(se) für "{query}"',
      noTables: "Keine Tabellen gefunden",
      noTablesYet: "Noch keine Grammatiktabellen vorhanden",
      createFirstTable: "Erstelle deine erste Grammatiktabelle",
      createTable: "Tabelle erstellen",
      deleteConfirm: "Diese Grammatiktabelle löschen?",
      tryDifferentSearch: "Versuche eine andere Suche",
      adjektivdeklination: "Adjektivdeklination",
      verbkonjugation: "Verbkonjugation",
      verbenMitPraepositionen: "Verben mit Präpositionen",
      grammarTable: "Grammatiktabelle",
    },
  },

  grammarTableEditor: {
    en: {
      inputTitle: "Input",
      inputDescription: "Enter adjectives and nouns for each gender",
      adjective: "Adjective",
      noun: "Noun",
      settings: "Settings",
      showNotes: "Show notes",
      showPrepositions: "Show prepositions",
      highlightEndings: "Highlight endings",
      prepositions: "Prepositions",
      notes: "Notes",
      noTableYet: "No table generated yet",
      clickGenerate: "Fill in the words and click Generate",
      generate: "Generate",
      regenerate: "Regenerate",
      generating: "Generating table…",
      untitledTable: "Untitled Table",
      downloadPdf: "PDF",
      downloadPdfTooltip: "Download as double-sided A4 landscape PDF",
      saveFirst: "Please save the table first",
      pdfFailed: "PDF generation failed: {error}",
    },
    de: {
      inputTitle: "Eingabe",
      inputDescription: "Gib Adjektive und Nomen für jedes Genus ein",
      adjective: "Adjektiv",
      noun: "Nomen",
      settings: "Einstellungen",
      showNotes: "Anmerkungen anzeigen",
      showPrepositions: "Präpositionen anzeigen",
      highlightEndings: "Endungen hervorheben",
      prepositions: "Präpositionen",
      notes: "Anmerkungen",
      noTableYet: "Noch keine Tabelle generiert",
      clickGenerate:
        "Fülle die Wörter aus und klicke auf Generieren",
      generate: "Generieren",
      regenerate: "Neu generieren",
      generating: "Tabelle wird generiert…",
      untitledTable: "Unbenannte Tabelle",
      downloadPdf: "PDF",
      downloadPdfTooltip:
        "Als doppelseitiges A4-Querformat-PDF herunterladen",
      saveFirst: "Bitte speichere die Tabelle zuerst",
      pdfFailed: "PDF-Generierung fehlgeschlagen: {error}",
    },
  },
};

// ─── BLOCK_LIBRARY translations missing from JSON ───────────

const MISSING_BLOCK_KEYS = {
  en: {
    imageCards: "Image Cards",
    imageCardsDesc: "Grid of images with captions",
    textCards: "Text Cards",
    textCardsDesc: "Grid of text items with optional writing lines",
    unscrambleWords: "Unscramble Words",
    unscrambleWordsDesc: "Unscramble jumbled letters to form words",
    fixSentences: "Fix Sentences",
    fixSentencesDesc: "Reorder sentence parts into correct order",
    verbTable: "Verb Table",
    verbTableDesc: "Conjugation table for verbs",
    glossary: "Glossary",
    glossaryDesc: "Term-definition list",
  },
  de: {
    imageCards: "Bildkarten",
    imageCardsDesc: "Bilder im Raster mit Beschriftung",
    textCards: "Textkarten",
    textCardsDesc: "Text im Raster mit Schreiblinien",
    unscrambleWords: "Wörter entwirren",
    unscrambleWordsDesc:
      "Buchstaben in die richtige Reihenfolge bringen",
    fixSentences: "Sätze korrigieren",
    fixSentencesDesc: "Fehlerhafte Sätze berichtigen",
    verbTable: "Verbtabelle",
    verbTableDesc: "Verbkonjugationen üben",
    glossary: "Glossar",
    glossaryDesc: "Begriffe und Definitionen",
  },
};

// ─── blockRenderer keys missing from en.json ────────────────

const MISSING_BLOCK_RENDERER = {
  en: {
    addNoun: "Add noun",
    newNoun: "New noun",
    articleNoun: "Noun",
    articleWritingLine: "Writing line",
  },
};

// ─── Merge logic ────────────────────────────────────────────

function sortObjectKeys(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function merge(locale) {
  const filePath = resolve(root, `src/messages/${locale}.json`);
  const json = JSON.parse(readFileSync(filePath, "utf-8"));

  // Merge code-defined namespaces (code as base, existing JSON wins)
  for (const [ns, translations] of Object.entries(CODE_NAMESPACES)) {
    const existing = json[ns] || {};
    const codeValues = translations[locale] || translations.en || {};
    json[ns] = sortObjectKeys({ ...codeValues, ...existing });
  }

  // Merge missing block translations
  const missingBlocks = MISSING_BLOCK_KEYS[locale] || {};
  json.blocks = sortObjectKeys({ ...missingBlocks, ...json.blocks });

  // Merge missing blockRenderer keys
  const missingBR = MISSING_BLOCK_RENDERER[locale] || {};
  if (Object.keys(missingBR).length) {
    json.blockRenderer = sortObjectKeys({
      ...missingBR,
      ...json.blockRenderer,
    });
  }

  // Sort top-level namespaces
  const sorted = {};
  for (const ns of Object.keys(json).sort()) {
    if (typeof json[ns] === "object" && json[ns] !== null) {
      sorted[ns] = sortObjectKeys(json[ns]);
    } else {
      sorted[ns] = json[ns];
    }
  }

  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n");

  // Count stats
  let totalKeys = 0;
  for (const ns of Object.keys(sorted)) {
    if (typeof sorted[ns] === "object") {
      totalKeys += Object.keys(sorted[ns]).length;
    }
  }
  console.log(
    `✅ ${locale}.json — ${Object.keys(sorted).length} namespaces, ${totalKeys} keys`
  );
}

console.log("Merging all translations into JSON files…\n");
merge("de");
merge("en");

console.log("\n🎉 Done! Now upload to i18nexus:");
console.log("   npm run i18n:import:all");
console.log("   npm run i18n:pull");
