"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor as useTiptapEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Mark, mergeAttributes } from "@tiptap/core";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  RemoveFormatting,
  Plus,
  Minus,
  TableCellsMerge,
  TableCellsSplit,
  Rows3,
  Columns3,
  Trash2,
  PaintBucket,
  ArrowUp,
  ArrowDown,
  ArrowLeftIcon,
  ArrowRightIcon,
  PanelTop,
  PanelLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* ── NoBreak mark (same as in rich-text-editor) ─────────────── */
const NoBreak = Mark.create({
  name: "nobreak",
  inclusive: true,
  excludes: "",
  parseHTML() {
    return [{ tag: "span[data-nobreak]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-nobreak": "", class: "nobreak" }), 0];
  },
});

/* ── Custom TableCell with backgroundColor attribute ──────── */
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const styles: string[] = [];
          if (attributes.backgroundColor) {
            styles.push(`background-color: ${attributes.backgroundColor}`);
          }
          if (attributes.colwidth) {
            styles.push(`width: ${(attributes.colwidth as number[])[0]}px`);
          }
          if (styles.length === 0) return {};
          return { style: styles.join("; ") };
        },
      },
    };
  },
});

/* ── Custom TableHeader with backgroundColor attribute ──────── */
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const styles: string[] = [];
          if (attributes.backgroundColor) {
            styles.push(`background-color: ${attributes.backgroundColor}`);
          }
          if (attributes.colwidth) {
            styles.push(`width: ${(attributes.colwidth as number[])[0]}px`);
          }
          if (styles.length === 0) return {};
          return { style: styles.join("; ") };
        },
      },
    };
  },
});

/* ── Cell color palette ──────────────────────────────────────── */
const CELL_COLORS = [
  { label: "None", value: "" },
  { label: "Light Yellow", value: "#fef9c3" },
  { label: "Light Green", value: "#dcfce7" },
  { label: "Light Blue", value: "#dbeafe" },
  { label: "Light Purple", value: "#f3e8ff" },
  { label: "Light Pink", value: "#fce7f3" },
  { label: "Light Orange", value: "#fed7aa" },
  { label: "Light Red", value: "#fee2e2" },
  { label: "Light Gray", value: "#f1f5f9" },
  { label: "Medium Yellow", value: "#fde047" },
  { label: "Medium Green", value: "#86efac" },
  { label: "Medium Blue", value: "#93c5fd" },
];

/* ── ToolbarButton (same pattern as rich-text-editor) ────── */
function ToolbarButton({
  onClick,
  isActive,
  icon: Icon,
  label,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={() => onClick()}
          disabled={disabled}
          className="h-7 w-7 p-0 data-[state=on]:bg-accent"
        >
          <Icon className="h-3.5 w-3.5" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Cell Color Picker ──────────────────────────────────────── */
function CellColorPicker({
  editor,
  label,
}: {
  editor: ReturnType<typeof useTiptapEditor>;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  if (!editor) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={open}
              className="h-7 w-7 p-0"
            >
              <PaintBucket className="h-3.5 w-3.5" />
            </Toggle>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {CELL_COLORS.map((color) => (
            <button
              key={color.value || "none"}
              type="button"
              className="w-6 h-6 rounded border border-slate-200 hover:ring-2 hover:ring-primary/50 transition-all"
              style={{
                backgroundColor: color.value || "#ffffff",
                ...(color.value === "" ? { backgroundImage: "linear-gradient(135deg, #fff 45%, #ef4444 50%, #fff 55%)" } : {}),
              }}
              title={color.label}
              onClick={() => {
                if (color.value) {
                  editor.chain().focus().setCellAttribute("backgroundColor", color.value).run();
                } else {
                  editor.chain().focus().setCellAttribute("backgroundColor", null).run();
                }
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Main TableEditor component ──────────────────────────── */
interface TableEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  columnWidths?: number[];
}

export function TableEditor({ content, onChange, editable = true, columnWidths }: TableEditorProps) {
  const t = useTranslations("tableEditor");

  // Strip TipTap's pixel-based widths from HTML so table uses CSS 100%
  const cleanContent = React.useMemo(() => {
    return content
      .replace(/<table([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<table$1")
      .replace(/<col([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<col$1");
  }, [content]);

  const editor = useTiptapEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      NoBreak,
      Table.configure({
        resizable: false,
        allowTableNodeSelection: true,
      }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
    ],
    content: cleanContent,
    editable,
    onUpdate: ({ editor }) => {
      // Strip pixel widths from output HTML
      const html = editor.getHTML()
        .replace(/<table([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<table$1")
        .replace(/<col([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<col$1");
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "table-editor-content focus:outline-none min-h-[100px] px-3 py-2",
      },
    },
  });

  // Sync external content changes into the editor
  useEffect(() => {
    if (!editor) return;
    if (!editor.isFocused && cleanContent !== editor.getHTML()) {
      editor.commands.setContent(cleanContent, { emitUpdate: false });
    }
  }, [cleanContent, editor]);

  // Apply column widths directly to DOM <col> elements
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wrapperRef.current || !columnWidths || columnWidths.length === 0) return;
    const cols = wrapperRef.current.querySelectorAll("table col");
    cols.forEach((col, i) => {
      if (i < columnWidths.length) {
        (col as HTMLElement).style.width = `${columnWidths[i]}%`;
      }
    });
  }, [columnWidths, content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("urlPrompt"), previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, t]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border border-input bg-background table-editor-wrapper" ref={wrapperRef}>
        {/* Toolbar */}
        {editable && (
          <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1">
            {/* Undo / Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo2}
              label={t("undo")}
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo2}
              label={t("redo")}
              disabled={!editor.can().redo()}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Inline formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={Bold}
              label={t("bold")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              icon={Italic}
              label={t("italic")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              icon={UnderlineIcon}
              label={t("underline")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              icon={Strikethrough}
              label={t("strikethrough")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive("highlight")}
              icon={Highlighter}
              label={t("highlight")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Alignment */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              icon={AlignLeft}
              label={t("alignLeft")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              isActive={editor.isActive({ textAlign: "center" })}
              icon={AlignCenter}
              label={t("alignCenter")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              icon={AlignRight}
              label={t("alignRight")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Clear formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              icon={RemoveFormatting}
              label={t("clearFormatting")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* ── Table structure ─────────────────────────── */}

            {/* Add/remove rows */}
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              icon={({ className }) => (
                <span className={`inline-flex items-center gap-px ${className}`}>
                  <Rows3 className="h-3 w-3" />
                  <Plus className="h-2.5 w-2.5" />
                </span>
              )}
              label={t("addRow")}
              disabled={!editor.can().addRowAfter()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              icon={({ className }) => (
                <span className={`inline-flex items-center gap-px ${className}`}>
                  <Rows3 className="h-3 w-3" />
                  <Minus className="h-2.5 w-2.5" />
                </span>
              )}
              label={t("deleteRow")}
              disabled={!editor.can().deleteRow()}
            />

            {/* Add/remove columns */}
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              icon={({ className }) => (
                <span className={`inline-flex items-center gap-px ${className}`}>
                  <Columns3 className="h-3 w-3" />
                  <Plus className="h-2.5 w-2.5" />
                </span>
              )}
              label={t("addColumn")}
              disabled={!editor.can().addColumnAfter()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              icon={({ className }) => (
                <span className={`inline-flex items-center gap-px ${className}`}>
                  <Columns3 className="h-3 w-3" />
                  <Minus className="h-2.5 w-2.5" />
                </span>
              )}
              label={t("deleteColumn")}
              disabled={!editor.can().deleteColumn()}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Merge / Split cells */}
            <ToolbarButton
              onClick={() => editor.chain().focus().mergeCells().run()}
              icon={TableCellsMerge}
              label={t("mergeCells")}
              disabled={!editor.can().mergeCells()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().splitCell().run()}
              icon={TableCellsSplit}
              label={t("splitCell")}
              disabled={!editor.can().splitCell()}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Toggle header row / column */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              icon={PanelTop}
              label={t("toggleHeaderRow")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
              icon={PanelLeft}
              label={t("toggleHeaderColumn")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Cell color */}
            <CellColorPicker editor={editor} label={t("cellColor")} />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Move rows */}
            <ToolbarButton
              onClick={() => {
                // Move row up: delete current row, insert before previous
                const { state } = editor;
                const { $head } = state.selection;
                // Find the table row position
                let depth = $head.depth;
                while (depth > 0 && $head.node(depth).type.name !== "tableRow") {
                  depth--;
                }
                if (depth <= 0) return;
                const rowStart = $head.before(depth);
                const table = $head.node(depth - 1);
                const tableStart = $head.before(depth - 1);
                // Find the row index
                let rowIndex = 0;
                let pos = tableStart + 1;
                for (let i = 0; i < table.childCount; i++) {
                  if (pos === rowStart) {
                    rowIndex = i;
                    break;
                  }
                  pos += table.child(i).nodeSize;
                }
                if (rowIndex === 0) return; // Already at top
                // Use TipTap transaction to swap rows
                const { tr } = state;
                const row = table.child(rowIndex);
                const prevRow = table.child(rowIndex - 1);
                const prevRowStart = rowStart - prevRow.nodeSize;
                // Delete current row and insert before previous
                tr.delete(rowStart, rowStart + row.nodeSize);
                tr.insert(prevRowStart, row);
                editor.view.dispatch(tr);
              }}
              icon={ArrowUp}
              label={t("moveRowUp")}
            />
            <ToolbarButton
              onClick={() => {
                const { state } = editor;
                const { $head } = state.selection;
                let depth = $head.depth;
                while (depth > 0 && $head.node(depth).type.name !== "tableRow") {
                  depth--;
                }
                if (depth <= 0) return;
                const rowStart = $head.before(depth);
                const table = $head.node(depth - 1);
                const tableStart = $head.before(depth - 1);
                let rowIndex = 0;
                let pos = tableStart + 1;
                for (let i = 0; i < table.childCount; i++) {
                  if (pos === rowStart) {
                    rowIndex = i;
                    break;
                  }
                  pos += table.child(i).nodeSize;
                }
                if (rowIndex >= table.childCount - 1) return; // Already at bottom
                const row = table.child(rowIndex);
                const nextRow = table.child(rowIndex + 1);
                const nextRowEnd = rowStart + row.nodeSize + nextRow.nodeSize;
                const { tr } = state;
                tr.delete(rowStart, rowStart + row.nodeSize);
                tr.insert(rowStart + nextRow.nodeSize, row);
                editor.view.dispatch(tr);
              }}
              icon={ArrowDown}
              label={t("moveRowDown")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Delete table */}
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              icon={Trash2}
              label={t("deleteTable")}
              disabled={!editor.can().deleteTable()}
            />
          </div>
        )}

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  );
}
