// Meridian Ridge Runner — hand-in program (Node 22, standard library only).
//
// The game lives in this repository's game/ folder: plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library, no
// network request). This program copies game/ and screenshots/ beside it into
// /output and writes /output/dossier.json, the summary the judge reads, using
// the vendored make.fun library. It must write the same bytes on every run.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, mirrored here so a bad entry fails loudly at build time
// instead of silently at the gate: at most 4 screenshots, each at most 256 KiB;
// game/ at most 993 files and directories together and 48 MiB in all; no path
// under game/ longer than 1000 bytes; the dossier text capped at 160 KiB.
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;
const GAME_PATH_MAX_BYTES = 1000;
const DOSSIER_TEXT_MAX_BYTES = 163840;

function countTree(dir, base) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = path.slice(base.length + 1);
    if (Buffer.byteLength(rel, 'utf8') > GAME_PATH_MAX_BYTES) {
      throw new Error(`game path too long: ${rel}`);
    }
    const st = statSync(path);
    if (st.isDirectory()) {
      files += 1;
      const sub = countTree(path, base);
      files += sub.files;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
    } else {
      throw new Error(`game/ must hold plain files only: ${rel}`);
    }
  }
  return { files, bytes };
}

function checkScreenshots(dir) {
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
  if (names.length < 3 || names.length > SCREENSHOT_MAX) {
    throw new Error(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    const st = statSync(join(dir, name));
    if (!st.isFile() || st.size > SCREENSHOT_MAX_BYTES) {
      throw new Error(`screenshot ${name} is not a file under 256 KiB`);
    }
  }
}

// Validate the inputs before copying anything, so a broken entry fails here.
// The checks run in a fixed order and print one problem at a time.
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const gameTree = countTree(gameDir, gameDir);
if (gameTree.files > GAME_MAX_FILES) throw new Error(`game/ holds ${gameTree.files} entries, over 993`);
if (gameTree.bytes > GAME_MAX_BYTES) throw new Error(`game/ is ${gameTree.bytes} bytes, over 48 MiB`);
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
if (statSync(join(gameDir, 'index.html')).size > 1048576) {
  throw new Error('game/index.html is over 1 MiB');
}
checkScreenshots(shotsDir);

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: GAME_PATH_MAX_BYTES,
  }),
);
