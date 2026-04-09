"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface CoursePageNavTarget {
  href: string;
  title: string;
}

export function CoursePageNav({
  prev,
  next,
}: {
  prev?: CoursePageNavTarget | null;
  next?: CoursePageNavTarget | null;
}) {
  const t = useTranslations("common");

  return (
    <div className="mt-12 flex items-center gap-3">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-1 items-center gap-2 rounded-md border bg-[rgba(250,250,249,0.8)] px-5 py-4 text-left transition-colors hover:bg-muted/50"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          <div className="min-w-0">
            <span className="block text-[11px] uppercase leading-snug text-muted-foreground">
              {t("previous")}
            </span>
            <span className="mt-1 block truncate text-[16px] font-medium leading-snug">
              {prev.title}
            </span>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-1 items-center justify-end gap-2 rounded-md border bg-[rgba(250,250,249,0.8)] px-5 py-4 text-right transition-colors hover:bg-muted/50"
        >
          <div className="min-w-0">
            <span className="block text-[11px] uppercase leading-snug text-muted-foreground">
              {t("next")}
            </span>
            <span className="mt-1 block truncate text-[16px] font-medium leading-snug">
              {next.title}
            </span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
