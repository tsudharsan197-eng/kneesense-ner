// @mediapipe/tasks-vision's FilesetResolver takes a plain directory URL at
// runtime (it builds file URLs by string concatenation), not an ES import,
// so its WASM files have to live at a real static path rather than go
// through Vite's module graph. Copied into public/ so they're served
// identically in dev and in the production/native build — required for the
// app to run fully offline (see README "offline-first" rule: nothing may
// load from a CDN at runtime).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wasmSrcDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDestDir = join(root, 'public', 'mediapipe', 'wasm');
const modelSrc = join(root, 'src', 'assets', 'mediapipe', 'pose_landmarker_lite.task');
const modelDestDir = join(root, 'public', 'mediapipe');

if (!existsSync(wasmSrcDir)) {
  console.warn('[copy-mediapipe-assets] @mediapipe/tasks-vision wasm dir not found, skipping');
  process.exit(0);
}

mkdirSync(wasmDestDir, { recursive: true });
for (const file of readdirSync(wasmSrcDir)) {
  copyFileSync(join(wasmSrcDir, file), join(wasmDestDir, file));
}

if (existsSync(modelSrc)) {
  mkdirSync(modelDestDir, { recursive: true });
  copyFileSync(modelSrc, join(modelDestDir, 'pose_landmarker_lite.task'));
} else {
  console.warn('[copy-mediapipe-assets] pose landmarker model not found at', modelSrc);
}

console.log('[copy-mediapipe-assets] copied MediaPipe wasm + model -> public/mediapipe/');
