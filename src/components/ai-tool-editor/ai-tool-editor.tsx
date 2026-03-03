"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAiTool } from "@/store/ai-tool-store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Type,
  AlignLeft,
  List,
  Hash,
  CheckSquare,
  CircleDot,
  Bot,
  Sparkles,
  Eye,
} from "lucide-react";
import { AiToolField, AiToolFieldOption, AiToolFieldType } from "@/types/ai-tool";
import { authFetch } from "@/lib/auth-fetch";
import ReactMarkdown from "react-markdown";

// ─── Field type config ───────────────────────────────────────
const FIELD_TYPES: { type: AiToolFieldType; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { type: "text", icon: Type, labelKey: "fieldTypeText" },
  { type: "textarea", icon: AlignLeft, labelKey: "fieldTypeTextarea" },
  { type: "select", icon: List, labelKey: "fieldTypeSelect" },
  { type: "number", icon: Hash, labelKey: "fieldTypeNumber" },
  { type: "checkbox", icon: CheckSquare, labelKey: "fieldTypeCheckbox" },
  { type: "radio", icon: CircleDot, labelKey: "fieldTypeRadio" },
];

// ─── Sortable field card ─────────────────────────────────────
function SortableFieldCard({
  field,
  onUpdate,
  onRemove,
}: {
  field: AiToolField;
  onUpdate: (updates: Partial<AiToolField>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("aiTool");
  const [expanded, setExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const FieldIcon = FIELD_TYPES.find((ft) => ft.type === field.type)?.icon || Type;

  const handleOptionAdd = () => {
    const options = field.options || [];
    const newOpt: AiToolFieldOption = {
      id: uuidv4(),
      label: `Option ${options.length + 1}`,
      value: `option_${options.length + 1}`,
    };
    onUpdate({ options: [...options, newOpt] });
  };

  const handleOptionUpdate = (optId: string, updates: Partial<AiToolFieldOption>) => {
    const options = (field.options || []).map((o) =>
      o.id === optId ? { ...o, ...updates } : o
    );
    onUpdate({ options });
  };

  const handleOptionRemove = (optId: string) => {
    onUpdate({ options: (field.options || []).filter((o) => o.id !== optId) });
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <FieldIcon className="h-4 w-4 text-violet-500" />
        <span className="text-sm font-medium flex-1 truncate">{field.label || t("untitledField")}</span>
        <Badge variant="secondary" className="text-[10px]">
          {t(FIELD_TYPES.find((ft) => ft.type === field.type)?.labelKey || "fieldTypeText")}
        </Badge>
        {field.required && (
          <Badge variant="outline" className="text-[10px] text-red-500 border-red-300">
            {t("required")}
          </Badge>
        )}
        <code className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded font-mono">
          {`{{${field.variableName}}}`}
        </code>
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("fieldLabel")}</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder={t("fieldLabelPlaceholder")}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">{t("variableName")}</Label>
              <Input
                value={field.variableName}
                onChange={(e) =>
                  onUpdate({
                    variableName: e.target.value
                      .replace(/\s/g, "_")
                      .replace(/[^a-zA-Z0-9_]/g, "")
                      .toLowerCase(),
                  })
                }
                placeholder="my_variable"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("placeholder")}</Label>
              <Input
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={field.required || false}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                  id={`required-${field.id}`}
                />
                <Label htmlFor={`required-${field.id}`} className="text-xs">
                  {t("required")}
                </Label>
              </div>
            </div>
          </div>

          {/* Field type selector */}
          <div>
            <Label className="text-xs">{t("fieldType")}</Label>
            <Select value={field.type} onValueChange={(val) => onUpdate({ type: val as AiToolFieldType })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.type} value={ft.type}>
                    {t(ft.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number-specific: min/max */}
          {field.type === "number" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("minValue")}</Label>
                <Input
                  type="number"
                  value={field.min ?? ""}
                  onChange={(e) => onUpdate({ min: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{t("maxValue")}</Label>
                <Input
                  type="number"
                  value={field.max ?? ""}
                  onChange={(e) => onUpdate({ max: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* Select/Radio options */}
          {(field.type === "select" || field.type === "radio") && (
            <div>
              <Label className="text-xs mb-2 block">{t("options")}</Label>
              <div className="space-y-2">
                {(field.options || []).map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => handleOptionUpdate(opt.id, { label: e.target.value })}
                      placeholder={t("optionLabel")}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) => handleOptionUpdate(opt.id, { value: e.target.value })}
                      placeholder={t("optionValue")}
                      className="h-7 text-xs flex-1 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleOptionRemove(opt.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOptionAdd}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("addOption")}
                </Button>
              </div>
            </div>
          )}

          {/* Default value */}
          <div>
            <Label className="text-xs">{t("defaultValue")}</Label>
            <Input
              value={field.defaultValue || ""}
              onChange={(e) => onUpdate({ defaultValue: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Editor Component ────────────────────────────────────
export function AiToolEditor() {
  const t = useTranslations("aiTool");
  const tc = useTranslations("common");
  const router = useRouter();
  const { state, dispatch, save, addField } = useAiTool();
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>("");
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fields" | "prompt" | "settings" | "test">("fields");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = state.fields.findIndex((f) => f.id === active.id);
    const newIdx = state.fields.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    dispatch({
      type: "REORDER_FIELDS",
      payload: arrayMove(state.fields, oldIdx, newIdx),
    });
  };

  const handleTest = async () => {
    if (!state.toolId) return;
    setTestLoading(true);
    setTestError(null);
    setTestResult("");
    try {
      const res = await authFetch(`/api/ai-tools/${state.toolId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: testValues }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTestResult(data.result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTestLoading(false);
    }
  };

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById("prompt-template") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = state.promptTemplate;
    const insertion = `{{${varName}}}`;
    const newText = text.substring(0, start) + insertion + text.substring(end);
    dispatch({ type: "SET_PROMPT_TEMPLATE", payload: newText });
    // Restore cursor after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push("/ai-tools")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="h-5 w-5 text-violet-500 shrink-0" />
          <Input
            value={state.title}
            onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
            className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-1 h-auto"
            placeholder={t("titlePlaceholder")}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state.isDirty && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              {tc("unsaved")}
            </Badge>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={state.published}
              onCheckedChange={(checked) =>
                dispatch({ type: "SET_PUBLISHED", payload: checked })
              }
              id="publish-toggle"
            />
            <Label htmlFor="publish-toggle" className="text-sm">
              {state.published ? tc("published") : tc("draft")}
            </Label>
          </div>

          <Button onClick={save} disabled={state.isSaving || !state.isDirty}>
            {state.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {tc("save")}
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b bg-slate-50 px-4 shrink-0">
        {(["fields", "prompt", "settings", "test"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 max-w-4xl mx-auto">
          {/* ── Fields Tab ── */}
          {activeTab === "fields" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t("description")}</Label>
                <textarea
                  value={state.description}
                  onChange={(e) => dispatch({ type: "SET_DESCRIPTION", payload: e.target.value })}
                  placeholder={t("descriptionPlaceholder")}
                  className="w-full mt-1 min-h-[60px] p-3 rounded-md border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("formFields")}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("addField")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {FIELD_TYPES.map((ft) => {
                      const Icon = ft.icon;
                      return (
                        <DropdownMenuItem key={ft.type} onClick={() => addField(ft.type)}>
                          <Icon className="h-4 w-4 mr-2" />
                          {t(ft.labelKey)}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {state.fields.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t("noFields")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("noFieldsHint")}</p>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={state.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {state.fields.map((field) => (
                      <SortableFieldCard
                        key={field.id}
                        field={field}
                        onUpdate={(updates) =>
                          dispatch({ type: "UPDATE_FIELD", payload: { id: field.id, updates } })
                        }
                        onRemove={() => dispatch({ type: "REMOVE_FIELD", payload: field.id })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* ── Prompt Tab ── */}
          {activeTab === "prompt" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">{t("promptTemplate")}</Label>
                </div>

                {/* Variable insertion toolbar */}
                {state.fields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs text-muted-foreground mr-1 self-center">
                      {t("insertVariable")}:
                    </span>
                    {state.fields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => insertVariable(field.variableName)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-100 text-violet-700 text-xs font-mono hover:bg-violet-200 transition-colors"
                      >
                        {`{{${field.variableName}}}`}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  id="prompt-template"
                  value={state.promptTemplate}
                  onChange={(e) => dispatch({ type: "SET_PROMPT_TEMPLATE", payload: e.target.value })}
                  placeholder={t("promptTemplatePlaceholder")}
                  className="w-full min-h-[300px] p-4 rounded-md border border-slate-200 bg-white text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("promptTemplateHint")}
                </p>
              </div>

              {/* Variables reference */}
              {state.fields.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    {t("availableVariables")}
                  </h4>
                  <div className="space-y-1">
                    {state.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2 text-xs">
                        <code className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-mono">
                          {`{{${field.variableName}}}`}
                        </code>
                        <span className="text-muted-foreground">→ {field.label}</span>
                        <Badge variant="secondary" className="text-[9px]">
                          {field.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-lg">
              <div>
                <Label className="text-sm font-medium">{t("aiModel")}</Label>
                <Select
                  value={state.settings.model || "claude-sonnet-4-20250514"}
                  onValueChange={(val) => dispatch({ type: "SET_SETTINGS", payload: { model: val } })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                    <SelectItem value="claude-haiku-4-20250514">Claude Haiku 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t("maxTokens")}: {state.settings.maxTokens || 4096}
                </Label>
                <Slider
                  value={[state.settings.maxTokens || 4096]}
                  onValueChange={([val]) => dispatch({ type: "SET_SETTINGS", payload: { maxTokens: val } })}
                  min={256}
                  max={8192}
                  step={256}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t("temperature")}: {(state.settings.temperature || 0.7).toFixed(1)}
                </Label>
                <Slider
                  value={[((state.settings.temperature || 0.7) * 100)]}
                  onValueChange={([val]) =>
                    dispatch({ type: "SET_SETTINGS", payload: { temperature: val / 100 } })
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">{t("temperatureHint")}</p>
              </div>
            </div>
          )}

          {/* ── Test Tab ── */}
          {activeTab === "test" && (
            <div className="space-y-4">
              {!state.toolId && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-700">
                  {t("saveBeforeTest")}
                </div>
              )}

              {!state.published && state.toolId && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-700">
                  {t("publishBeforeTest")}
                </div>
              )}

              {state.fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t("noFieldsToTest")}
                </div>
              )}

              {state.fields.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t("testPreview")}
                  </h3>

                  <div className="border rounded-lg p-4 bg-white space-y-4">
                    {state.fields.map((field) => (
                      <div key={field.id}>
                        <Label className="text-sm">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {field.type === "text" && (
                          <Input
                            value={testValues[field.variableName] || ""}
                            onChange={(e) =>
                              setTestValues((prev) => ({ ...prev, [field.variableName]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className="mt-1"
                          />
                        )}

                        {field.type === "textarea" && (
                          <textarea
                            value={testValues[field.variableName] || ""}
                            onChange={(e) =>
                              setTestValues((prev) => ({ ...prev, [field.variableName]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className="w-full mt-1 min-h-[80px] p-3 rounded-md border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
                          />
                        )}

                        {field.type === "select" && (
                          <Select
                            value={testValues[field.variableName] || ""}
                            onValueChange={(val) =>
                              setTestValues((prev) => ({ ...prev, [field.variableName]: val }))
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={field.placeholder || t("selectOption")} />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options || []).map((opt) => (
                                <SelectItem key={opt.id} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {field.type === "number" && (
                          <Input
                            type="number"
                            value={testValues[field.variableName] || ""}
                            onChange={(e) =>
                              setTestValues((prev) => ({ ...prev, [field.variableName]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            min={field.min}
                            max={field.max}
                            className="mt-1"
                          />
                        )}

                        {field.type === "checkbox" && (
                          <div className="mt-1 flex items-center gap-2">
                            <Switch
                              checked={testValues[field.variableName] === "true"}
                              onCheckedChange={(checked) =>
                                setTestValues((prev) => ({
                                  ...prev,
                                  [field.variableName]: checked ? "true" : "false",
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {testValues[field.variableName] === "true" ? t("yes") : t("no")}
                            </span>
                          </div>
                        )}

                        {field.type === "radio" && (
                          <div className="mt-1 space-y-1.5">
                            {(field.options || []).map((opt) => (
                              <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="radio"
                                  name={field.variableName}
                                  value={opt.value}
                                  checked={testValues[field.variableName] === opt.value}
                                  onChange={(e) =>
                                    setTestValues((prev) => ({
                                      ...prev,
                                      [field.variableName]: e.target.value,
                                    }))
                                  }
                                  className="accent-violet-600"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <Button
                      onClick={handleTest}
                      disabled={testLoading || !state.toolId || !state.published}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {testLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {t("runTest")}
                    </Button>
                  </div>

                  {/* Test error */}
                  {testError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                      {testError}
                    </div>
                  )}

                  {/* Test result */}
                  {testResult && (
                    <div className="border border-violet-200 rounded-lg p-4 bg-violet-50/30">
                      <div className="text-xs text-violet-500 font-medium mb-2">{t("testResult")}</div>
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-[0.9em]">{children}</code>,
                          }}
                        >
                          {testResult}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
