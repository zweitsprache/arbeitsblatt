import React from "react";
import type { BingoCardsBlock, BingoCardsGridSize, BingoCardsMode, BingoCardsContentType, BingoCardsItem } from "@/types/worksheet";
import { BINGO_CARDS_ITEM_LIMITS } from "@/types/worksheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { useUpload } from "@/lib/use-upload";
import { useEditor } from "@/store/editor-store";
import { ImagePlus, Plus, Trash2 } from "lucide-react";

const GRID_SIZES: BingoCardsGridSize[] = [3, 4, 5];
const MODES: { value: BingoCardsMode; label: string }[] = [
  { value: "same", label: "Alle Karten gleich" },
  { value: "qa", label: "Frage/Antwort (QA)" },
];
const CONTENT_TYPES: { value: BingoCardsContentType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "image", label: "Bild" },
  { value: "text-image", label: "Text + Bild" },
];

function createItem(overrides: Partial<BingoCardsItem> = {}): BingoCardsItem {
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `bingo-item-${Math.random().toString(36).slice(2, 10)}`,
    text: "",
    imageSrc: "",
    answer: "",
    ...overrides,
  };
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const delimiters = [";", ",", "\t", "|"];

  let bestDelimiter = ",";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    const count = parseCsvLine(sample, delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseBingoCsv(text: string, mode: BingoCardsMode, contentType: BingoCardsContentType): BingoCardsItem[] {
  const delimiter = detectDelimiter(text);
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseCsvLine(line, delimiter));

  return rows
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell.length > 0))
    .map((cells) => {
      if (mode === "qa") {
        if (contentType === "image") {
          return createItem({ imageSrc: cells[0] ?? "", answer: cells[1] ?? "" });
        }
        if (contentType === "text-image") {
          return createItem({ text: cells[0] ?? "", answer: cells[1] ?? "", imageSrc: cells[2] ?? "" });
        }
        return createItem({ text: cells[0] ?? "", answer: cells[1] ?? "" });
      }

      if (contentType === "image") {
        return createItem({ imageSrc: cells[0] ?? "" });
      }
      if (contentType === "text-image") {
        return createItem({ text: cells[0] ?? "", imageSrc: cells[1] ?? "" });
      }
      return createItem({ text: cells[0] ?? "" });
    })
    .filter((item) => {
      if (contentType === "image") return Boolean(item.imageSrc?.trim() || item.answer?.trim());
      if (contentType === "text-image") return Boolean(item.text?.trim() || item.imageSrc?.trim() || item.answer?.trim());
      return Boolean(item.text?.trim() || item.answer?.trim());
    });
}

function getCsvHelpText(mode: BingoCardsMode, contentType: BingoCardsContentType): string {
  if (mode === "qa") {
    if (contentType === "image") return "Eine Zeile pro Eintrag: Bild-URL;Antwort";
    if (contentType === "text-image") return "Eine Zeile pro Eintrag: Frage;Antwort;Bild-URL";
    return "Eine Zeile pro Eintrag: Frage;Antwort";
  }

  if (contentType === "image") return "Eine Zeile pro Eintrag: Bild-URL";
  if (contentType === "text-image") return "Eine Zeile pro Eintrag: Text;Bild-URL";
  return "Eine Zeile pro Eintrag: Text";
}

function getCsvPlaceholder(mode: BingoCardsMode, contentType: BingoCardsContentType): string {
  if (mode === "qa") {
    if (contentType === "image") return "https://example.com/bild-1.jpg;Der Apfel";
    if (contentType === "text-image") return "Apfel;Der Apfel;https://example.com/bild-1.jpg";
    return "Apfel;Der Apfel";
  }

  if (contentType === "image") return "https://example.com/bild-1.jpg";
  if (contentType === "text-image") return "Apfel;https://example.com/bild-1.jpg";
  return "Apfel";
}

export function BingoCardsPropEditor({ block }: { block: BingoCardsBlock }) {
  const { dispatch } = useEditor();
  const { upload } = useUpload();
  const [selectedItemIndex, setSelectedItemIndex] = React.useState<number | null>(block.items[0] ? 0 : null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = React.useState(false);

  React.useEffect(() => {
    if (block.items.length === 0) {
      setSelectedItemIndex(null);
      return;
    }

    setSelectedItemIndex((current) => {
      if (current === null) return 0;
      return Math.min(current, block.items.length - 1);
    });
  }, [block.items.length]);

  function update(updates: Partial<BingoCardsBlock>) {
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });
  }

  function updateItems(items: BingoCardsItem[]) {
    update({ items });
  }

  function updateItem(index: number, updates: Partial<BingoCardsItem>) {
    updateItems(block.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)));
  }

  function addItem() {
    const items = [...block.items, createItem()];
    updateItems(items);
    setSelectedItemIndex(items.length - 1);
  }

  function removeSelectedItem() {
    if (selectedItemIndex === null) return;
    const items = block.items.filter((_, index) => index !== selectedItemIndex);
    updateItems(items);
    if (items.length === 0) {
      setSelectedItemIndex(null);
      return;
    }
    setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
  }

  function clearItems() {
    updateItems([]);
    setSelectedItemIndex(null);
  }

  async function handleFileSelected(file: File) {
    if (selectedItemIndex === null || !file.type.startsWith("image/")) return;

    try {
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageSrc: uploadResult.url });
    } catch (error) {
      console.error("Bingo image upload failed:", error);
    }
  }

  function handleParsedItems(parsedItems: BingoCardsItem[]) {
    const nextItems = csvMode === "append" ? [...block.items, ...parsedItems] : parsedItems;
    const limits = BINGO_CARDS_ITEM_LIMITS[block.gridSize];

    if (parsedItems.length === 0) {
      setCsvError("CSV enthaelt keine verwendbaren Daten.");
      return;
    }

    if (nextItems.length > limits.max) {
      setCsvError(`Zu viele Eintraege. Fuer ${block.gridSize} x ${block.gridSize} sind maximal ${limits.max} Eintraege empfohlen.`);
      return;
    }

    setCsvError(null);
    update({ items: nextItems, csvImport: "" });
    setSelectedItemIndex(nextItems.length > 0 ? 0 : null);
  }

  function handleCsvImport() {
    const text = (block.csvImport ?? "").trim();
    setCsvError(null);

    if (!text) {
      setCsvError("CSV enthaelt keine verwendbaren Daten.");
      return;
    }

    handleParsedItems(parseBingoCsv(text, block.mode, block.contentType));
  }

  const selectedItem = selectedItemIndex !== null ? block.items[selectedItemIndex] : null;
  const limits = BINGO_CARDS_ITEM_LIMITS[block.gridSize];
  const countTone = block.items.length < limits.min ? "text-amber-600" : block.items.length > limits.max ? "text-destructive" : "text-muted-foreground";
  const csvHelpText = getCsvHelpText(block.mode, block.contentType);
  const csvPlaceholder = getCsvPlaceholder(block.mode, block.contentType);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
          Rastergroesse
        </Label>
        <div className="flex gap-1 mt-1.5">
          {GRID_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              variant={block.gridSize === size ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => update({ gridSize: size })}
            >
              {size} x {size}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
          Modus
        </Label>
        <div className="flex gap-1 mt-1.5">
          {MODES.map((mode) => (
            <Button
              key={mode.value}
              type="button"
              variant={block.mode === mode.value ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => update({ mode: mode.value })}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
          Inhaltstyp
        </Label>
        <div className="flex gap-1 mt-1.5">
          {CONTENT_TYPES.map((ct) => (
            <Button
              key={ct.value}
              type="button"
              variant={block.contentType === ct.value ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => update({ contentType: ct.value })}
            >
              {ct.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
          CSV-Import
        </Label>
        <p className="mb-2 text-xs text-muted-foreground">
          {csvHelpText}
        </p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={csvPlaceholder}
          value={block.csvImport ?? ""}
          onChange={(e) => {
            update({ csvImport: e.target.value });
            setCsvError(null);
          }}
        />
        <div className="mt-2 flex items-center gap-2">
          <Select value={csvMode} onValueChange={(value) => setCsvMode(value as "replace" | "append")}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Ersetzen</SelectItem>
              <SelectItem value="append">Anhaengen</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCsvImport} disabled={!(block.csvImport ?? "").trim()}>
            Importieren
          </Button>
        </div>
        {csvError ? <p className="mt-2 text-xs text-destructive">{csvError}</p> : null}
      </div>

      <Separator />

      <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
        <Label htmlFor={`bingo-randomize-${block.id}`}>Zufaellige Anordnung</Label>
        <Switch
          id={`bingo-randomize-${block.id}`}
          checked={block.randomize}
          onCheckedChange={(checked) => update({ randomize: checked })}
        />
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
          Eintraege
        </Label>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className={countTone}>{block.items.length} Eintraege</span>
          <span className="text-muted-foreground">Empfohlen: {limits.min}-{limits.max}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {block.items.map((item, index) => (
            <Button
              key={item.id}
              type="button"
              variant={selectedItemIndex === index ? "default" : "outline"}
              size="sm"
              className="justify-start truncate px-2 text-xs"
              onClick={() => setSelectedItemIndex(index)}
            >
              {index + 1}. {item.text?.trim() || item.answer?.trim() || item.imageSrc?.trim() || "Leer"}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Eintrag
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={clearItems} disabled={block.items.length === 0}>
            Leeren
          </Button>
        </div>
      </div>

      {selectedItem ? (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ausgewaehlter Eintrag
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={removeSelectedItem}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Entfernen
            </Button>
          </div>

          {block.contentType !== "image" ? (
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
                {block.mode === "qa" ? "Frage" : "Text"}
              </Label>
              <textarea
                value={selectedItem.text ?? ""}
                onChange={(e) => updateItem(selectedItemIndex as number, { text: e.target.value })}
                className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder={block.mode === "qa" ? "Frage eingeben" : "Text eingeben"}
              />
            </div>
          ) : null}

          {block.mode === "qa" ? (
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
                Antwort
              </Label>
              <textarea
                value={selectedItem.answer ?? ""}
                onChange={(e) => updateItem(selectedItemIndex as number, { answer: e.target.value })}
                className="w-full min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder="Antwort eingeben"
              />
            </div>
          ) : null}

          {block.contentType !== "text" ? (
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">
                Bild
              </Label>
              <div className="space-y-2">
                <Input
                  value={selectedItem.imageSrc ?? ""}
                  onChange={(e) => updateItem(selectedItemIndex as number, { imageSrc: e.target.value })}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setBrowserOpen(true)}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  Media Browser
                </Button>
              </div>
            </div>
          ) : null}

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageSrc: url });
            }}
            onSelectFile={handleFileSelected}
          />
        </div>
      ) : null}
    </div>
  );
}
