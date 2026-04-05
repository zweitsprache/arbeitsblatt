"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import { Mark, Node, mergeAttributes } from "@tiptap/core";
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
  WrapText,
  Languages,
  SeparatorHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

/* ── Custom Heading extension with noMargin attribute ────── */
const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      noMargin: {
        default: false,
        parseHTML: (element: HTMLElement) => element.classList.contains("no-margin"),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.noMargin) return {};
          return { class: "no-margin" };
        },
      },
    };
  },
});

/* ── SnippetBreak node: inserts <hr data-snippet-break> as an item separator ─ */
const SnippetBreakNode = Node.create({
  name: "snippetBreak",
  group: "block",
  atom: true,
  parseHTML() {
    // Accept legacy/plain <hr> too, so existing content is recovered
    // and re-serialized with the snippet marker attribute.
    return [{ tag: "hr[data-snippet-break]" }, { tag: "hr" }];
  },
  renderHTML() {
    return ["hr", { "data-snippet-break": "" }];
  },
});

/* ── NoBreak mark: wraps text in <span data-nobreak class="nobreak"> ─ */
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

/* ── Compact heading icons (H1⁰ / H2⁰ / H3⁰ style) ─────── */
function HeadingNoMarginIcon({ level, className }: { level: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-bold leading-none ${className ?? ""}`} style={{ fontSize: 11 }}>
      H{level}
      <span className="text-[7px] leading-none" style={{ marginLeft: 1, marginBottom: -1 }}>⁰</span>
    </span>
  );
}

/* Wrapper components for the ToolbarButton (which expects icon: Component<{className}>) */
function H1NoMarginIcon({ className }: { className?: string }) {
  return <HeadingNoMarginIcon level={1} className={className} />;
}
function H2NoMarginIcon({ className }: { className?: string }) {
  return <HeadingNoMarginIcon level={2} className={className} />;
}
function H3NoMarginIcon({ className }: { className?: string }) {
  return <HeadingNoMarginIcon level={3} className={className} />;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  floatingElement?: React.ReactNode;
  editorClassName?: string;
  /** When true, registers the SnippetBreak node and shows a break button in the toolbar. */
  snippetBreak?: boolean;
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
  editorClassName,
  snippetBreak = false,
}: RichTextEditorProps) {
  const t = useTranslations("richtext");
  const resolvedPlaceholder = placeholder ?? t("startTyping");
  // Track whether this editor's toolbar should be visible.
  // We use TipTap's onFocus/onBlur plus a wrapper ref to keep
  // the toolbar visible while interacting with toolbar buttons.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setShowToolbar(true);
  }, []);

  const handleEditorBlur = useCallback(() => {
    // Small delay so that clicking a toolbar button (which briefly
    // removes focus from the editor) doesn't hide the toolbar.
    blurTimeoutRef.current = setTimeout(() => {
      // If focus is still inside the wrapper (e.g. on a toolbar button),
      // keep the toolbar visible.
      if (wrapperRef.current?.contains(document.activeElement)) return;
      setShowToolbar(false);
    }, 150);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        // In snippet mode, prevent StarterKit's default horizontalRule node
        // from swallowing snippet-break <hr> markers and dropping attributes.
        horizontalRule: !snippetBreak,
      }),
      CustomHeading.configure({
        levels: [1, 2, 3],
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
      NoBreak,
      ...(snippetBreak ? [SnippetBreakNode] : []),
    ],
    content,
    editable,
    onFocus: handleEditorFocus,
    onBlur: handleEditorBlur,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          editorClassName ?? "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2",
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

  // Clean up blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // When the toolbar receives focus (e.g. clicking a button), cancel
  // any pending blur so the toolbar stays visible.
  const handleToolbarFocusIn = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

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
  }, [editor, t]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={wrapperRef} className="rounded-md border border-input bg-background">
        {/* Toolbar – only shown when this editor has focus */}
        {editable && showToolbar && (
          <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1.5 py-1" onFocus={handleToolbarFocusIn}>
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
              isActive={editor.isActive("heading", { level: 1 }) && !editor.getAttributes("heading").noMargin}
              icon={Heading1}
              label={t("heading1")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 }) && !editor.getAttributes("heading").noMargin}
              icon={Heading2}
              label={t("heading2")}
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 }) && !editor.getAttributes("heading").noMargin}
              icon={Heading3}
              label={t("heading3")}
            />
            <ToolbarButton
              onClick={() => {
                if (editor.isActive("heading", { level: 1 }) && editor.getAttributes("heading").noMargin) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().setHeading({ level: 1, noMargin: true } as never).run();
                }
              }}
              isActive={editor.isActive("heading", { level: 1 }) && !!editor.getAttributes("heading").noMargin}
              icon={H1NoMarginIcon}
              label={t("heading1NoMargin")}
            />
            <ToolbarButton
              onClick={() => {
                if (editor.isActive("heading", { level: 2 }) && editor.getAttributes("heading").noMargin) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().setHeading({ level: 2, noMargin: true } as never).run();
                }
              }}
              isActive={editor.isActive("heading", { level: 2 }) && !!editor.getAttributes("heading").noMargin}
              icon={H2NoMarginIcon}
              label={t("heading2NoMargin")}
            />
            <ToolbarButton
              onClick={() => {
                if (editor.isActive("heading", { level: 3 }) && editor.getAttributes("heading").noMargin) {
                  editor.chain().focus().setParagraph().run();
                } else {
                  editor.chain().focus().setHeading({ level: 3, noMargin: true } as never).run();
                }
              }}
              isActive={editor.isActive("heading", { level: 3 }) && !!editor.getAttributes("heading").noMargin}
              icon={H3NoMarginIcon}
              label={t("heading3NoMargin")}
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
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleMark("nobreak").run()}
              isActive={editor.isActive("nobreak")}
              icon={WrapText}
              label={t("noBreak")}
            />
            <ToolbarButton
              onClick={() => {
                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to);
                if (selectedText) {
                  // Wrap selected text in {{de:...}}
                  editor.chain().focus().insertContentAt({ from, to }, `{{de:${selectedText}}}`).run();
                } else {
                  // No selection: prompt for term
                  const term = window.prompt("Deutsches Wort eingeben:");
                  if (term) {
                    editor.chain().focus().insertContent(`{{de:${term}}}`).run();
                  }
                }
              }}
              icon={Languages}
              label={t("deMarker")}
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

            {/* Snippet break (only shown when snippetBreak prop is enabled) */}
            {snippetBreak && (
              <>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <ToolbarButton
                  onClick={() =>
                    editor.chain().focus().insertContent({ type: "snippetBreak" }).run()
                  }
                  icon={SeparatorHorizontal}
                  label={t("snippetBreak")}
                />
              </>
            )}
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
