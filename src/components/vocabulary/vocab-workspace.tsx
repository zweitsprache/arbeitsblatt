"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Database,
  Filter,
  ImageUp,
  Loader2,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AUXILIARY_VALUES,
  POS_VALUES,
  REGULARITY_VALUES,
  type VocabularyConsistencyIssue,
  type VocabularyEntryInput,
} from "@/lib/vocabulary";

type EntryWithVerb = VocabularyEntryInput & {
  verbDetail?: {
    auxiliary: string;
    regularity: string;
    stemChange: boolean;
  } | null;
};

type LoadState = "idle" | "extracting" | "saving" | "loading";

const posLabels: Record<string, string> = {
  noun: "Nomen",
  verb: "Verb",
  adjective: "Adjektiv",
  adverb: "Adverb",
  pronoun: "Pronomen",
  preposition: "Praeposition",
  conjunction: "Konjunktion",
  interjection: "Interjektion",
  phrase: "Ausdruck",
};

function defaultPosData(
  pos: VocabularyEntryInput["pos"],
  lemma: string
): VocabularyEntryInput["pos_data"] {
  switch (pos) {
    case "noun":
      return {
        pos,
        gender: "n",
        genitive_sg: null,
        plural: null,
        plural_type: null,
        declension: null,
        countability: null,
        diminutive: null,
        compound_parts: null,
        is_proper_noun: false,
      };
    case "verb":
      return {
        pos,
        infinitive: lemma,
        auxiliary: "haben",
        regularity: "weak",
        separable: false,
        separable_prefix: null,
        reflexive: "none",
        principal_parts: {
          praesens_3sg: null,
          praeteritum: null,
          partizip_2: null,
        },
        stem_change: {
          has_change: false,
          type: "none",
          from_vowel: null,
          to_vowel: null,
          affected_forms: [],
          pattern_label: null,
          examples: null,
        },
        ablaut: {
          has_ablaut: false,
          class: null,
          pattern: null,
          vowels: null,
        },
        valency: null,
        case_government: [],
        prepositional_object: null,
        transitivity: null,
        konjunktiv_2: null,
        imperative: {
          du: null,
          ihr: null,
          Sie: null,
        },
      };
    case "adjective":
      return {
        pos,
        comparative: null,
        superlative: null,
        comparison: null,
        usage: null,
        case_government: null,
        prepositional_object: null,
        antonym: null,
        is_indeclinable: false,
      };
    case "adverb":
      return {
        pos,
        type: "other",
        comparable: false,
        comparative: null,
        superlative: null,
      };
    case "pronoun":
      return {
        pos,
        type: "indefinite",
        person: null,
        number: "both",
        gender: null,
        formality: null,
        case: null,
        declension_paradigm: null,
      };
    case "preposition":
      return {
        pos,
        case_government: "variable",
        is_two_way: false,
        type: null,
        contractions: null,
      };
    case "conjunction":
      return {
        pos,
        type: "coordinating",
        word_order: "none",
        correlate: null,
      };
    case "interjection":
      return {
        pos,
        function: "other",
        regional: null,
      };
    case "phrase":
      return {
        pos,
        phrase_type: "redemittel",
        redemittel_function: "other",
        literal_meaning: null,
        pattern: null,
        fixedness: null,
        answer_to: null,
      };
  }
}

function ensureVerbData(entry: VocabularyEntryInput): VocabularyEntryInput {
  if (entry.pos_data.pos === "verb") return entry;

  return {
    ...entry,
    pos: "verb",
    pos_data: defaultPosData("verb", entry.lemma),
  };
}

function updateEntry(
  entries: VocabularyEntryInput[],
  index: number,
  patch: Partial<VocabularyEntryInput>
) {
  return entries.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...patch } : entry
  );
}

function patchVerbData(
  entry: VocabularyEntryInput,
  patch: Partial<Extract<VocabularyEntryInput["pos_data"], { pos: "verb" }>>
): VocabularyEntryInput["pos_data"] {
  const verbEntry = ensureVerbData(entry);
  if (verbEntry.pos_data.pos !== "verb") return verbEntry.pos_data;
  return { ...verbEntry.pos_data, ...patch };
}

function patchVerbStemChange(entry: VocabularyEntryInput, hasChange: boolean) {
  const verbEntry = ensureVerbData(entry);
  if (verbEntry.pos_data.pos !== "verb") return verbEntry.pos_data;

  return {
    ...verbEntry.pos_data,
    stem_change: {
      ...verbEntry.pos_data.stem_change,
      has_change: hasChange,
      type: hasChange ? verbEntry.pos_data.stem_change.type : "none",
    },
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: response.ok
        ? "Die Serverantwort konnte nicht gelesen werden."
        : `Serverfehler ${response.status}: ${text.slice(0, 180)}`,
    };
  }
}

function responseError(payload: { error?: string; details?: unknown }, fallback: string) {
  if (!payload.details) return payload.error ?? fallback;
  return `${payload.error ?? fallback}\n${JSON.stringify(payload.details, null, 2)}`;
}

export function VocabWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<VocabularyEntryInput[]>([]);
  const [savedEntries, setSavedEntries] = useState<EntryWithVerb[]>([]);
  const [issues, setIssues] = useState<VocabularyConsistencyIssue[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  const previewUrlRef = useRef<string | null>(null);
  const [filters, setFilters] = useState({
    pos: "verb",
    lesson: "",
    module: "",
    auxiliary: "",
    stemChange: "",
    regularity: "",
  });

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const issueIndexes = useMemo(
    () => new Set(issues.map((issue) => issue.index)),
    [issues]
  );
  const hasJsonErrors = Object.keys(jsonErrors).length > 0;

  function formatJson(value: unknown) {
    return JSON.stringify(value, null, 2);
  }

  function updateJsonField(
    index: number,
    field:
      | "pos_data"
      | "pronunciation"
      | "source"
      | "examples"
      | "domain",
    raw: string
  ) {
    const key = `${index}:${field}`;

    try {
      const parsed = JSON.parse(raw);
      setEntries((current) =>
        current.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: parsed } : entry
        )
      );
      setJsonErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : "Ungueltiges JSON";
      setJsonErrors((current) => ({ ...current, [key]: message }));
    }
  }

  function jsonError(index: number, field: string) {
    return jsonErrors[`${index}:${field}`];
  }

  function pickFile(nextFile: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextUrl = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextUrl;
    setFile(nextFile);
    setPreviewUrl(nextUrl);
    setEntries([]);
    setIssues([]);
    setJsonErrors({});
    setError(null);
    setNotice(null);
  }

  async function extract() {
    if (!file) return;

    setState("extracting");
    setError(null);
    setNotice(null);

    const formData = new FormData();
    formData.append("photo", file);

    const response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      setError(responseError(payload, "Extraktion fehlgeschlagen."));
      setState("idle");
      return;
    }

    setEntries(payload.entries ?? []);
    setIssues(payload.consistencyIssues ?? []);
    setJsonErrors({});
    setState("idle");
  }

  async function save() {
    if (hasJsonErrors) {
      setError("Bitte korrigiere zuerst die ungueltigen JSON-Felder.");
      return;
    }

    setState("saving");
    setError(null);
    setNotice(null);

    const response = await fetch("/api/extract?mode=save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      setError(responseError(payload, "Speichern fehlgeschlagen."));
      setIssues(payload.consistencyIssues ?? []);
      setState("idle");
      return;
    }

    setNotice(`${payload.entries?.length ?? 0} Eintraege gespeichert.`);
    setIssues([]);
    setState("idle");
    loadEntries();
  }

  async function loadEntries() {
    setState("loading");
    setError(null);

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const response = await fetch(`/api/entries?${params.toString()}`);
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      setError(responseError(payload, "Abfrage fehlgeschlagen."));
      setState("idle");
      return;
    }

    setSavedEntries(payload.entries ?? []);
    setState("idle");
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    pickFile(event.dataTransfer.files.item(0));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    pickFile(event.target.files?.item(0) ?? null);
  }

  const busy = state !== "idle";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Treffpunkt Schweiz Wortschatz
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Foto hochladen, Eintraege pruefen, speichern.
              </p>
            </div>

            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className={cn(
                "flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50",
                previewUrl && "items-stretch justify-start p-2"
              )}
            >
              <Input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileChange}
              />
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Lehrmittel-Foto"
                  width={340}
                  height={280}
                  unoptimized
                  className="h-[280px] w-full rounded-[6px] object-contain"
                />
              ) : (
                <>
                  <ImageUp className="size-9 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Foto hier ablegen oder auswaehlen
                  </span>
                </>
              )}
            </label>

            <Button onClick={extract} disabled={!file || busy}>
              {state === "extracting" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              Extrahieren
            </Button>
          </div>

          <div className="min-w-0 rounded-[8px] border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Extraktion</h2>
                <p className="text-xs text-muted-foreground">
                  {entries.length} Eintraege
                </p>
              </div>
              <Button
                onClick={save}
                disabled={entries.length === 0 || busy || hasJsonErrors}
                variant={issues.length > 0 ? "secondary" : "default"}
              >
                {state === "saving" ? <Loader2 className="animate-spin" /> : <Save />}
                Speichern
              </Button>
            </div>

            {error && (
              <div className="flex gap-2 border-b bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span className="whitespace-pre-wrap">{error}</span>
              </div>
            )}

            {notice && (
              <div className="flex gap-2 border-b bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {issues.length > 0 && (
              <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {issues.map((issue) => (
                  <div key={`${issue.index}-${issue.lemma}`}>
                    {issue.lemma}: {issue.message}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Lemma</th>
                    <th className="px-3 py-2">Wortart</th>
                    <th className="px-3 py-2">Lektion</th>
                    <th className="px-3 py-2">Modul</th>
                    <th className="px-3 py-2">Quelle</th>
                    <th className="px-3 py-2">Meta</th>
                    <th className="px-3 py-2">Verbdetails</th>
                    <th className="px-3 py-2">Schema-Bloecke</th>
                    <th className="px-3 py-2">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr
                      key={`${entry.id ?? index}-${index}`}
                      className={cn(
                        "border-t align-top",
                        issueIndexes.has(index) && "bg-amber-50"
                      )}
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {entry.id}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={entry.lemma}
                          onChange={(event) =>
                            setEntries(
                              updateEntry(entries, index, {
                                lemma: event.target.value,
                              })
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={entry.pos}
                          className="h-9 w-full rounded-[4px] border bg-background px-2 text-sm"
                          onChange={(event) => {
                            const pos = event.target
                              .value as VocabularyEntryInput["pos"];
                            setEntries(
                              updateEntry(
                                entries,
                                index,
                                pos === "verb"
                                  ? ensureVerbData(entry)
                                  : {
                                      pos,
                                      pos_data: defaultPosData(pos, entry.lemma),
                                    }
                              )
                            );
                          }}
                        >
                          {POS_VALUES.map((pos) => (
                            <option key={pos} value={pos}>
                              {posLabels[pos]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={entry.source.lesson}
                          onChange={(event) =>
                            setEntries(
                              updateEntry(entries, index, {
                                source: {
                                  ...entry.source,
                                  lesson: Number(event.target.value),
                                },
                              })
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={entry.source.module}
                          onChange={(event) =>
                            setEntries(
                              updateEntry(entries, index, {
                                source: {
                                  ...entry.source,
                                  module: event.target.value.toUpperCase(),
                                },
                              })
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="grid min-w-[220px] gap-2">
                          <Input
                            placeholder="lesson_title"
                            value={entry.source.lesson_title ?? ""}
                            onChange={(event) =>
                              setEntries(
                                updateEntry(entries, index, {
                                  source: {
                                    ...entry.source,
                                    lesson_title: event.target.value || null,
                                  },
                                })
                              )
                            }
                          />
                          <Input
                            placeholder="module_title"
                            value={entry.source.module_title ?? ""}
                            onChange={(event) =>
                              setEntries(
                                updateEntry(entries, index, {
                                  source: {
                                    ...entry.source,
                                    module_title: event.target.value || null,
                                  },
                                })
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="grid min-w-[190px] gap-2">
                          <select
                            value={entry.extraction_confidence}
                            className="h-9 rounded-[4px] border bg-background px-2 text-sm"
                            onChange={(event) =>
                              setEntries(
                                updateEntry(entries, index, {
                                  extraction_confidence: event.target
                                    .value as VocabularyEntryInput["extraction_confidence"],
                                })
                              )
                            }
                          >
                            <option value="high">high</option>
                            <option value="medium">medium</option>
                            <option value="low">low</option>
                          </select>
                          <select
                            value={entry.register ?? ""}
                            className="h-9 rounded-[4px] border bg-background px-2 text-sm"
                            onChange={(event) =>
                              setEntries(
                                updateEntry(entries, index, {
                                  register:
                                    (event.target.value ||
                                      null) as VocabularyEntryInput["register"],
                                })
                              )
                            }
                          >
                            <option value="">register</option>
                            <option value="neutral">neutral</option>
                            <option value="formal">formal</option>
                            <option value="informal">informal</option>
                            <option value="vulgar">vulgar</option>
                            <option value="literary">literary</option>
                            <option value="technical">technical</option>
                          </select>
                          <Input
                            placeholder="notes"
                            value={entry.notes ?? ""}
                            onChange={(event) =>
                              setEntries(
                                updateEntry(entries, index, {
                                  notes: event.target.value || null,
                                })
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {entry.pos_data.pos === "verb" ? (
                          <div className="grid min-w-[260px] grid-cols-3 gap-2">
                            <select
                              value={entry.pos_data.auxiliary}
                              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
                              onChange={(event) =>
                                setEntries(
                                  updateEntry(entries, index, {
                                    pos_data: patchVerbData(entry, {
                                      auxiliary: event.target.value as "haben" | "sein",
                                    }),
                                  })
                                )
                              }
                            >
                              {AUXILIARY_VALUES.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                            <select
                              value={entry.pos_data.regularity}
                              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
                              onChange={(event) =>
                                setEntries(
                                  updateEntry(entries, index, {
                                    pos_data: patchVerbData(entry, {
                                      regularity: event.target
                                        .value as (typeof REGULARITY_VALUES)[number],
                                    }),
                                  })
                                )
                              }
                            >
                              {REGULARITY_VALUES.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                            <label className="flex h-9 items-center gap-2 rounded-[4px] border px-2 text-xs">
                              <input
                                type="checkbox"
                                checked={entry.pos_data.stem_change.has_change}
                                onChange={(event) =>
                                  setEntries(
                                    updateEntry(entries, index, {
                                      pos_data: patchVerbStemChange(
                                        entry,
                                        event.target.checked
                                      ),
                                    })
                                  )
                                }
                              />
                              Stamm
                            </label>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <details className="min-w-[360px]">
                          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                            JSON bearbeiten
                          </summary>
                          <div className="mt-2 grid gap-3">
                            {(
                              [
                                "pos_data",
                                "pronunciation",
                                "source",
                                "examples",
                                "domain",
                              ] as const
                            ).map((field) => (
                              <label key={field} className="grid gap-1">
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  {field}
                                </span>
                                <Textarea
                                  defaultValue={formatJson(entry[field])}
                                  className={cn(
                                    "min-h-28 font-mono text-xs leading-relaxed",
                                    jsonError(index, field) &&
                                      "border-destructive focus-visible:ring-destructive/30"
                                  )}
                                  onBlur={(event) =>
                                    updateJsonField(
                                      index,
                                      field,
                                      event.target.value
                                    )
                                  }
                                />
                                {jsonError(index, field) && (
                                  <span className="text-[11px] text-destructive">
                                    {jsonError(index, field)}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={(entry.tags ?? []).join(", ")}
                          onChange={(event) =>
                            setEntries(
                              updateEntry(entries, index, {
                                tags: event.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                              })
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        Noch keine Eintraege.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Abfragen</h2>
            </div>
            <Button onClick={loadEntries} disabled={busy} variant="outline">
              {state === "loading" ? <Loader2 className="animate-spin" /> : <Search />}
              Suchen
            </Button>
          </div>

          <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-6">
            <select
              value={filters.pos}
              onChange={(event) => setFilters({ ...filters, pos: event.target.value })}
              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
            >
              <option value="">Alle Wortarten</option>
              {POS_VALUES.map((pos) => (
                <option key={pos} value={pos}>
                  {posLabels[pos]}
                </option>
              ))}
            </select>
            <Input
              placeholder="Lektion"
              value={filters.lesson}
              onChange={(event) =>
                setFilters({ ...filters, lesson: event.target.value })
              }
            />
            <Input
              placeholder="Modul"
              value={filters.module}
              onChange={(event) =>
                setFilters({ ...filters, module: event.target.value.toUpperCase() })
              }
            />
            <select
              value={filters.auxiliary}
              onChange={(event) =>
                setFilters({ ...filters, auxiliary: event.target.value })
              }
              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
            >
              <option value="">Hilfsverb</option>
              <option value="haben">haben</option>
              <option value="sein">sein</option>
            </select>
            <select
              value={filters.stemChange}
              onChange={(event) =>
                setFilters({ ...filters, stemChange: event.target.value })
              }
              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
            >
              <option value="">Stammwechsel</option>
              <option value="true">ja</option>
              <option value="false">nein</option>
            </select>
            <select
              value={filters.regularity}
              onChange={(event) =>
                setFilters({ ...filters, regularity: event.target.value })
              }
              className="h-9 rounded-[4px] border bg-background px-2 text-sm"
            >
              <option value="">Regelmaessigkeit</option>
              {REGULARITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Lemma</th>
                  <th className="px-3 py-2">Wortart</th>
                  <th className="px-3 py-2">Lektion</th>
                  <th className="px-3 py-2">Modul</th>
                  <th className="px-3 py-2">Hilfsverb</th>
                  <th className="px-3 py-2">Regularitaet</th>
                  <th className="px-3 py-2">Stammwechsel</th>
                </tr>
              </thead>
              <tbody>
                {savedEntries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{entry.lemma}</td>
                    <td className="px-3 py-2">{posLabels[entry.pos]}</td>
                    <td className="px-3 py-2">{entry.source.lesson}</td>
                    <td className="px-3 py-2">{entry.source.module}</td>
                    <td className="px-3 py-2">{entry.verbDetail?.auxiliary ?? "-"}</td>
                    <td className="px-3 py-2">{entry.verbDetail?.regularity ?? "-"}</td>
                    <td className="px-3 py-2">
                      {entry.verbDetail?.stemChange ? "ja" : "nein"}
                    </td>
                  </tr>
                ))}
                {savedEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Keine Treffer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Database className="size-3.5" />
          <span>Treffpunkt Schweiz · A1</span>
        </div>
      </div>
    </main>
  );
}
