import fs from "fs";
import os from "os";
import path from "path";
import type { BrandProfile, QuartettBlock, WorksheetSettings } from "@/types/worksheet";

const QUARTETT_EXPORT_STATE_DIR = path.join(os.tmpdir(), "arbeitsblatt-quartett-export-state");

if (!fs.existsSync(QUARTETT_EXPORT_STATE_DIR)) {
  fs.mkdirSync(QUARTETT_EXPORT_STATE_DIR, { recursive: true });
}

export type QuartettExportState = {
  title: string;
  worksheetId?: string | null;
  locale: string;
  block: QuartettBlock;
  settings: WorksheetSettings;
  brandProfile?: BrandProfile | null;
  createdAt: number;
};

function getStateFilePath(exportId: string) {
  return path.join(QUARTETT_EXPORT_STATE_DIR, `${exportId}.json`);
}

export function saveQuartettExportState(exportId: string, state: QuartettExportState) {
  const filePath = getStateFilePath(exportId);
  const tempFilePath = path.join(
    QUARTETT_EXPORT_STATE_DIR,
    `${exportId}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(tempFilePath, JSON.stringify(state));
  fs.renameSync(tempFilePath, filePath);
}

export function getQuartettExportState(exportId: string): QuartettExportState | null {
  const filePath = getStateFilePath(exportId);
  if (!fs.existsSync(filePath)) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as QuartettExportState;
    } catch {
      if (attempt === 1) return null;
    }
  }

  return null;
}

export function deleteQuartettExportState(exportId: string) {
  const filePath = getStateFilePath(exportId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}