"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { icons, type LucideProps } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Dynamic Lucide Icon ────────────────────────────────────
/**
 * Renders a Lucide icon by its PascalCase name (e.g. "BookOpen").
 * Falls back to null if the name is invalid.
 */
export function DynamicLucideIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const IconComponent = (icons as Record<string, React.ComponentType<LucideProps>>)[name];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}

// ─── All icon names (sorted) ────────────────────────────────
const ALL_ICON_NAMES = Object.keys(icons).sort();

// ─── Icon Picker ─────────────────────────────────────────────
export function LucideIconPicker({
  value,
  onChange,
  placeholder = "Select icon…",
}: {
  value: string | null;
  onChange: (name: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return ALL_ICON_NAMES.slice(0, 100); // show first 100 by default
    const lower = search.toLowerCase();
    return ALL_ICON_NAMES.filter((n) => n.toLowerCase().includes(lower)).slice(
      0,
      100
    );
  }, [search]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setSearch("");
  }, [onChange]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 h-8 justify-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value ? (
            <>
              <DynamicLucideIcon name={value} className="h-4 w-4" />
              <span className="truncate text-xs">{value}</span>
            </>
          ) : (
            <span className="text-xs">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons…"
            className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filtered.map((name) => {
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  title={name}
                  onClick={() => handleSelect(name)}
                  className={cn(
                    "flex items-center justify-center h-9 w-full rounded-md hover:bg-accent transition-colors",
                    isSelected && "bg-primary/10 ring-1 ring-primary"
                  )}
                >
                  <DynamicLucideIcon name={name} className="h-4 w-4" />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-6 text-center py-6 text-xs text-muted-foreground">
                No icons found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
