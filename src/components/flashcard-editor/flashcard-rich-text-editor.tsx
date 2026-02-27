"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
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
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  RemoveFormatting,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface FlashcardRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

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
          className="h-6 w-6 p-0 data-[state=on]:bg-accent"
        >
          <Icon className="h-3 w-3" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const TEXT_COLORS = [
  { value: "", color: "#000000" },
  { value: "#4A3D55", color: "#4A3D55" },
  { value: "#7A5550", color: "#7A5550" },
  { value: "#3A4F40", color: "#3A4F40" },
  { value: "#5A4540", color: "#5A4540" },
  { value: "#3A6570", color: "#3A6570" },
  { value: "#FFFFFF", color: "#FFFFFF" },
];

export function FlashcardRichTextEditor({
  content,
  onChange,
  placeholder,
  className,
}: FlashcardRichTextEditorProps) {
  const t = useTranslations("richtext");
  const tf = useTranslations("flashcardEditor");
  const resolvedPlaceholder = placeholder ?? tf("textPlaceholder");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: resolvedPlaceholder,
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[48px] px-2.5 py-1.5 text-sm",
      },
    },
  });

  // Sync external content changes (e.g. locale switch)
  useEffect(() => {
    if (!editor) return;
    if (!editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  // Determine current text color
  const currentColor = (editor.getAttributes("textStyle").color as string) || "";

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`rounded-md border border-input bg-background ${className ?? ""}`}>
        {/* Compact toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1 py-0.5">
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
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive("superscript")}
            icon={SuperscriptIcon}
            label={t("superscript")}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive("subscript")}
            icon={SubscriptIcon}
            label={t("subscript")}
          />

          <Separator orientation="vertical" className="mx-0.5 h-4" />

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

          <Separator orientation="vertical" className="mx-0.5 h-4" />

          {/* Color swatches */}
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value || "default"}
              className={`w-4 h-4 rounded-full border transition-colors shrink-0 ${
                currentColor === c.value || (!currentColor && !c.value)
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ backgroundColor: c.color }}
              title={
                c.value === "" ? tf("textColor_default") :
                c.value === "#FFFFFF" ? tf("textColor_white") :
                c.color
              }
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                if (c.value) {
                  editor.chain().focus().setColor(c.value).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
              }}
            />
          ))}

          <Separator orientation="vertical" className="mx-0.5 h-4" />

          {/* Clear formatting */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().clearNodes().unsetAllMarks().run()
            }
            icon={RemoveFormatting}
            label={t("clearFormatting")}
          />
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  );
}
