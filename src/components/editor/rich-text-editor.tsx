"use client";

import React, { useCallback, useEffect } from "react";
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
import Link from "@tiptap/extension-link";
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
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Link2Off,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting,
  Quote,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  floatingElement?: React.ReactNode;
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

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
  floatingElement,
}: RichTextEditorProps) {
  const t = useTranslations("richtext");
  const resolvedPlaceholder = placeholder ?? t("startTyping");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2",
      },
    },
  });

  // Sync external content changes (e.g. from AI generation) into the editor
  useEffect(() => {
    if (!editor) return;
    // Only update if the editor's current content differs from the prop
    // and the editor is not currently focused (i.e., user isn't typing)
    if (!editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("urlPrompt"), previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-md border border-input bg-background">
        {/* Fixed toolbar */}
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

            {/* Text style */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive("paragraph")}
              icon={Pilcrow}
              label={t("paragraph")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              icon={Heading1}
              label={t("heading1")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              icon={Heading2}
              label={t("heading2")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              icon={Heading3}
              label={t("heading3")}
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
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive("subscript")}
              icon={SubscriptIcon}
              label={t("subscript")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive("superscript")}
              icon={SuperscriptIcon}
              label={t("superscript")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Alignment */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("left").run()
              }
              isActive={editor.isActive({ textAlign: "left" })}
              icon={AlignLeft}
              label={t("alignLeft")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              icon={AlignCenter}
              label={t("alignCenter")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
              isActive={editor.isActive({ textAlign: "right" })}
              icon={AlignRight}
              label={t("alignRight")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              icon={AlignJustify}
              label={t("justify")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={List}
              label={t("bulletList")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              icon={ListOrdered}
              label={t("numberedList")}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              icon={Quote}
              label={t("blockquote")}
            />

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Link */}
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive("link")}
              icon={LinkIcon}
              label={t("addLink")}
            />
            {editor.isActive("link") && (
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().unsetLink().run()
                }
                icon={Link2Off}
                label={t("removeLink")}
              />
            )}

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Clear formatting */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              }
              icon={RemoveFormatting}
              label={t("clearFormatting")}
            />
          </div>
        )}

        {/* Editor content */}
        <div style={{ overflow: "hidden" }}>
          {floatingElement}
          <EditorContent editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
}
