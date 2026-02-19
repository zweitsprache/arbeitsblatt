"use client";

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { ChartBlock } from "@/types/worksheet";

const DEFAULT_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"];

export function ChartContent({ block }: { block: ChartBlock }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        {block.chartType === "bar" ? (
          <BarChart data={block.data}>
            {block.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="label" label={block.xAxisLabel ? { value: block.xAxisLabel, position: "insideBottom", offset: -5 } : undefined} />
            <YAxis label={block.yAxisLabel ? { value: block.yAxisLabel, angle: -90, position: "insideLeft" } : undefined} />
            <Tooltip />
            {block.showLegend && <Legend />}
            <Bar dataKey="value" name={block.title || "Value"}>
              {block.showValues && <LabelList dataKey="value" position="top" />}
              {block.data.map((entry, index) => (
                <Cell key={entry.id} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : block.chartType === "line" ? (
          <LineChart data={block.data}>
            {block.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="label" label={block.xAxisLabel ? { value: block.xAxisLabel, position: "insideBottom", offset: -5 } : undefined} />
            <YAxis label={block.yAxisLabel ? { value: block.yAxisLabel, angle: -90, position: "insideLeft" } : undefined} />
            <Tooltip />
            {block.showLegend && <Legend />}
            <Line type="monotone" dataKey="value" name={block.title || "Value"} stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }}>
              {block.showValues && <LabelList dataKey="value" position="top" />}
            </Line>
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={block.data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
                label={block.showValues ? ((entry) => `${entry.name}: ${entry.value}`) : false}
            >
              {block.data.map((entry, index) => (
                <Cell key={entry.id} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {block.showLegend && <Legend />}
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
