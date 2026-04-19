import fs from "fs";
import os from "os";
import path from "path";

const RENDER_STATE_DIR = path.join(os.tmpdir(), "arbeitsblatt-render-state");

// Ensure the directory exists
if (!fs.existsSync(RENDER_STATE_DIR)) {
  fs.mkdirSync(RENDER_STATE_DIR, { recursive: true });
}

export const saveRenderState = (renderId: string, state: any) => {
  const filePath = path.join(RENDER_STATE_DIR, `${renderId}.json`);
  const tmpFilePath = path.join(
    RENDER_STATE_DIR,
    `${renderId}.${process.pid}.${Date.now()}.tmp`
  );

  // Write via temp file + rename to avoid readers seeing partially written JSON.
  fs.writeFileSync(tmpFilePath, JSON.stringify(state));
  fs.renameSync(tmpFilePath, filePath);
};

export const getRenderState = (renderId: string) => {
  const filePath = path.join(RENDER_STATE_DIR, `${renderId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  // Be tolerant to transient read races in development/hot-reload scenarios.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      if (attempt === 1) {
        return null;
      }
    }
  }

  return null;
};

export const updateRenderProgress = (renderId: string, progress: number) => {
  const state = getRenderState(renderId) || {};
  state.progress = progress;
  state.status = "rendering";
  saveRenderState(renderId, state);
};

export const completeRender = (renderId: string, url: string, size: number) => {
  const state = getRenderState(renderId) || {};
  state.status = "done";
  state.url = url;
  state.size = size;
  saveRenderState(renderId, state);
};

export const failRender = (renderId: string, error: string) => {
  const state = getRenderState(renderId) || {};
  state.status = "error";
  state.error = error;
  saveRenderState(renderId, state);
};
