// Fetch the Latin-subset WOFF2 of Space Grotesk 600 from Google Fonts and
// save it under packages/deract/src/fonts/. Run once, then commit the file.
// The URL points at Google Fonts' prebuilt subset; no toolchain needed.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'packages', 'deract', 'src', 'fonts');
const outPath = join(outDir, 'space-grotesk-600-latin.woff2');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap';

const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
if (!cssRes.ok) throw new Error(`Google Fonts CSS request failed: ${cssRes.status}`);
const css = await cssRes.text();

// Google's CSS is comment-tagged by subset; the /* latin */ block is the one we want.
const m = css.match(
  /\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*?src:\s*url\(\s*([^)]+?)\s*\)\s*format\('woff2'\)/s,
);
if (!m) throw new Error('Could not locate the Latin WOFF2 URL in Google Fonts CSS');

const fontRes = await fetch(m[1]);
if (!fontRes.ok) throw new Error(`WOFF2 download failed: ${fontRes.status}`);
const buf = Buffer.from(await fontRes.arrayBuffer());

await mkdir(outDir, { recursive: true });
await writeFile(outPath, buf);
console.log(`Saved ${buf.length} bytes to ${outPath}`);
console.log(`Font (reported separately from size targets): ${buf.length} B`);