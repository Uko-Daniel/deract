// Copies non-TypeScript assets into dist after tsc.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const src = join(pkg, 'src');
const dist = join(pkg, 'dist');

async function main() {
  await mkdir(dist, { recursive: true });
  await cp(join(src, 'styles.css'), join(dist, 'styles.css'));
  await cp(join(src, 'fonts.css'), join(dist, 'fonts.css'));
  await cp(join(src, 'logo.svg'), join(dist, 'logo.svg'));

  // Fonts directory (may or may not exist depending on whether fonts:fetch ran).
  try {
    await mkdir(join(dist, 'fonts'), { recursive: true });
    await cp(join(src, 'fonts'), join(dist, 'fonts'), { recursive: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // No fonts/ — that is fine; fonts.css falls back to the system stack.
  }
  console.log('copied: styles.css, fonts.css, logo.svg, fonts/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});