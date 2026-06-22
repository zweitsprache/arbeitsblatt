export function isMissingVocabularyTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; message?: string; meta?: unknown };
  const message = maybeError.message ?? "";
  const metaText = JSON.stringify(maybeError.meta ?? {});
  const mentionsVocabularyTable =
    message.includes("Entry") ||
    message.includes("VerbDetail") ||
    metaText.includes("Entry") ||
    metaText.includes("VerbDetail");

  return (
    maybeError.code !== "P2022" &&
    ((maybeError.code === "P2021" && mentionsVocabularyTable) ||
      (metaText.includes("Entry") && metaText.includes("does not exist")) ||
      (metaText.includes("VerbDetail") && metaText.includes("does not exist")))
  );
}

export function vocabularyMigrationErrorResponse() {
  return {
    error:
      "Die Wortschatz-Tabellen fehlen in der Datenbank. Bitte die Prisma-Migrationen 20260621000100_add_vocabulary_entries und 20260621000200_align_vocabulary_source_of_truth anwenden.",
  };
}

export function isVocabularySchemaMismatchError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; meta?: unknown };
  const metaText = JSON.stringify(maybeError.meta ?? {});

  return (
    maybeError.code === "P2022" &&
    (metaText.includes("Entry") || metaText.includes("VerbDetail"))
  );
}

export function vocabularySchemaMismatchErrorResponse() {
  return {
    error:
      "Das Wortschatz-Schema ist in der Datenbank vorhanden, aber App/Prisma Client oder Serverprozess ist nicht aktuell. Bitte Prisma generate ausfuehren und den Next-Dev-Server neu starten.",
  };
}

export function prismaDebugDetails(error: unknown) {
  if (!error || typeof error !== "object") return undefined;

  const maybeError = error as {
    code?: string;
    message?: string;
    meta?: unknown;
    name?: string;
  };

  return {
    name: maybeError.name,
    code: maybeError.code,
    message: maybeError.message,
    meta: maybeError.meta,
  };
}
