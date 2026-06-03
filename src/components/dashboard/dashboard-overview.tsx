"use client";

import { useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FileText, FilePlus2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth-fetch";

interface DonutStatCardProps {
  label: string;
  value: number;
  total: number;
  unit?: string;
  color: string;
  formatNumber: (n: number) => string;
}

interface RecentWorksheet {
  id: string;
  title: string;
  published: boolean;
  blocks: unknown[];
  updatedAt: string;
}

function DonutStatCard({ label, value, total, unit, color, formatNumber }: DonutStatCardProps) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, value / safeTotal));
  const size = 48;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  return (
    <Card className="flex flex-row items-center gap-4 rounded-[4px] p-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="text-sm font-bold text-slate-700">{label}</div>
        <div className="text-xl font-semibold tabular-nums">
          {formatNumber(value)}
          <span className="text-sm font-normal text-muted-foreground">
            {" / "}
            {formatNumber(total)}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function DashboardOverview() {
  const t = useTranslations("dashboardOverview");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [recent, setRecent] = useState<RecentWorksheet[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/worksheets`);
        if (!res.ok) return;
        const data: RecentWorksheet[] = await res.json();
        if (!cancelled) setRecent(data.slice(0, 4));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: DonutStatCardProps[] = [
    {
      label: t("worksheetsRemaining"),
      value: 20,
      total: 100,
      color: "#c8553d",
      formatNumber: (n) => format.number(n),
    },
    {
      label: t("aiCredits"),
      value: 3789,
      total: 10000,
      color: "#3d8bc8",
      formatNumber: (n) => format.number(n),
    },
    {
      label: t("statThree"),
      value: 42,
      total: 200,
      color: "#7bc83d",
      formatNumber: (n) => format.number(n),
    },
    {
      label: t("statFour"),
      value: 8,
      total: 25,
      color: "#c8a23d",
      formatNumber: (n) => format.number(n),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="mb-3 block w-full rounded-[4px] bg-slate-100 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
        {t("title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <DonutStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <h2 className="mt-8 mb-3 block w-full rounded-[4px] bg-sky-100 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-800">
        {t("recentTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recent.map((ws) => (
          <div
            key={ws.id}
            className="group flex cursor-pointer items-center gap-3 rounded-[4px] border border-sky-800 p-3 transition-all hover:border-sky-800 hover:shadow-sm"
            onClick={() => router.push(`/editor/${ws.id}`)}
          >
            <FileText className="h-5 w-5 shrink-0 text-sky-800" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-sky-800">
                  {ws.title}
                </p>
                <Badge
                  variant="secondary"
                  className={`h-5 shrink-0 px-1.5 text-[10px] leading-none ${ws.published ? "" : "invisible"}`}
                >
                  {tc("published")}
                </Badge>
              </div>
              <p className="truncate text-xs text-sky-800">
                {format.dateTime(new Date(ws.updatedAt), {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
                {" | "}
                {Array.isArray(ws.blocks)
                  ? td("blockCount", { count: ws.blocks.length })
                  : tc("empty")}
              </p>
            </div>
          </div>
        ))}
      </div>

      <h2
        className="mt-8 mb-3 block w-full rounded-[4px] px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: "#c9563b" }}
      >
        {t("newsTitle")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col gap-3 overflow-hidden rounded-[4px] p-0">
            <div className="aspect-video w-full bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/key_visuals/arbeitsblatt.png"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <div className="text-sm font-bold" style={{ color: "#c9563b" }}>
                {t("newsItemTitle", { index: i })}
              </div>
              <p className="text-sm" style={{ color: "#c9563b" }}>
                {t("newsItemBody")}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 block w-full rounded-[4px] bg-slate-100 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
        {t("templatesTitle")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="group flex cursor-pointer items-center gap-3 rounded-[4px] border border-slate-700 p-3 transition-all hover:border-slate-700 hover:shadow-sm"
          >
            <FilePlus2 className="h-5 w-5 shrink-0 text-slate-700" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-slate-700">
                {t("templateItemTitle", { index: i + 1 })}
              </p>
              <p className="truncate text-xs text-slate-700">
                {t("templateItemSubtitle")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
