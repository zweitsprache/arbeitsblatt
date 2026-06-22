import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMissingVocabularyTableError,
  isVocabularySchemaMismatchError,
  prismaDebugDetails,
  vocabularyMigrationErrorResponse,
  vocabularySchemaMismatchErrorResponse,
} from "@/lib/prisma-errors";
import { requireAuth } from "@/lib/auth/require-auth";
import { POS_VALUES, REGULARITY_VALUES, AUXILIARY_VALUES } from "@/lib/vocabulary";

function parseBoolean(value: string | null) {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const params = req.nextUrl.searchParams;
    const pos = params.get("pos");
    const lesson = params.get("lesson");
    const moduleParam = params.get("module");
    const auxiliary = params.get("auxiliary");
    const stemChange = parseBoolean(params.get("stemChange"));
    const regularity = params.get("regularity");

    const where: string[] = [];
    const values: unknown[] = [];

    if (pos && POS_VALUES.includes(pos as (typeof POS_VALUES)[number])) {
      values.push(pos);
      where.push(`e."pos"::text = $${values.length}`);
    }

    if (lesson && Number.isInteger(Number(lesson))) {
      values.push(Number(lesson));
      where.push(`(e."source"->>'lesson')::integer = $${values.length}`);
    }

    if (moduleParam) {
      values.push(moduleParam.toUpperCase());
      where.push(`e."source"->>'module' = $${values.length}`);
    }

    if (auxiliary && AUXILIARY_VALUES.includes(auxiliary as "haben" | "sein")) {
      values.push(auxiliary);
      where.push(`v."auxiliary" = $${values.length}`);
    }

    if (typeof stemChange === "boolean") {
      values.push(stemChange);
      where.push(`v."stemChange" = $${values.length}`);
    }

    if (
      regularity &&
      REGULARITY_VALUES.includes(regularity as (typeof REGULARITY_VALUES)[number])
    ) {
      values.push(regularity);
      where.push(`v."regularity" = $${values.length}`);
    }

    const sql = `
      SELECT
        e."id",
        e."lemma",
        e."pos"::text AS "pos",
        e."level",
        e."frequency_rank" AS "frequency_rank",
        e."pronunciation",
        e."source",
        e."examples",
        e."register",
        e."domain",
        e."tags",
        e."notes",
        e."date_added" AS "date_added",
        e."extraction_confidence" AS "extraction_confidence",
        e."pos_data" AS "pos_data",
        CASE
          WHEN v."entryId" IS NULL THEN NULL
          ELSE jsonb_build_object(
            'entryId', v."entryId",
            'infinitive', v."infinitive",
            'auxiliary', v."auxiliary",
            'regularity', v."regularity",
            'separable', v."separable",
            'separablePrefix', v."separablePrefix",
            'reflexive', v."reflexive",
            'stemChange', v."stemChange",
            'stemChangeType', v."stemChangeType",
            'ablautPattern', v."ablautPattern",
            'ablautClass', v."ablautClass",
            'prepObject', v."prepObject",
            'prepCase', v."prepCase"
          )
        END AS "verbDetail"
      FROM "Entry" e
      LEFT JOIN "VerbDetail" v ON v."entryId" = e."id"
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e."id" ASC
      LIMIT 500
    `;

    const entries = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        lemma: string;
        pos: string;
        level: string;
        frequency_rank: number | null;
        pronunciation: unknown;
        source: unknown;
        examples: unknown;
        register: string | null;
        domain: string[];
        tags: string[];
        notes: string | null;
        date_added: Date;
        extraction_confidence: string;
        pos_data: unknown;
        verbDetail: unknown;
      }>
    >(sql, ...values);

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        lemma: entry.lemma,
        pos: entry.pos,
        level: entry.level,
        frequency_rank: entry.frequency_rank,
        pronunciation: entry.pronunciation,
        source: entry.source,
        examples: entry.examples,
        register: entry.register,
        domain: entry.domain,
        tags: entry.tags,
        notes: entry.notes,
        date_added: entry.date_added.toISOString(),
        extraction_confidence: entry.extraction_confidence,
        pos_data: entry.pos_data,
        verbDetail: entry.verbDetail,
      })),
    });
  } catch (error) {
    console.error("GET /api/entries error:", error);
    if (isMissingVocabularyTableError(error)) {
      return NextResponse.json(
        {
          ...vocabularyMigrationErrorResponse(),
          details: prismaDebugDetails(error),
        },
        { status: 500 }
      );
    }
    if (isVocabularySchemaMismatchError(error)) {
      return NextResponse.json(
        {
          ...vocabularySchemaMismatchErrorResponse(),
          details: prismaDebugDetails(error),
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: message, details: prismaDebugDetails(error) },
      { status: 500 }
    );
  }
}
