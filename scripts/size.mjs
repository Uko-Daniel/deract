// Reports min+gzip sizes for the built package. Uses only node:* built-ins.
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = resolve('packages/deract/dist');

function minifyJS(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,()=<>+\-*&|:!?[\]])\s*/g, '$1')
    .replace(/ ?\/ ?/g, '/')
    .trim();
}
function minifyCSS(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .trim();
}

async function readGroup(dir, filter) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (e.isFile() && filter(e.name)) {
      out.push(await readFile(join(dir, e.name), 'utf8'));
    }
  }
  return out.join('\n');
}

function report(label, source, kind, targetBytes) {
  const min = kind === 'css' ? minifyCSS(source) : minifyJS(source);
  const gz = gzipSync(Buffer.from(min));
  const kb = (n) => (n / 1024).toFixed(2);
  const tag = gz.length <= targetBytes ? 'OK  ' : 'OVER';
  console.log(
    `${tag}  ${label.padEnd(12)} ${kb(gz.length).padStart(7)} KB gzip  (target ≤ ${kb(targetBytes)} KB)`,
  );
  return gz.length;
}

async function main() {
  console.log('Deract size report — min+gzip (approximate minification)\n');

  const core = await readGroup(dist, (n) => n.endsWith('.js'));
  report('core JS', core, 'js', 3 * 1024);

  const pg = await readGroup(join(dist, 'playground'), (n) => n.endsWith('.js'));
  report('playground', pg, 'js', 20 * 1024);

  const css = await readFile(join(dist, 'styles.css'), 'utf8');
  report('CSS', css, 'css', 6 * 1024);

  try {
    const woff = await readFile(join(dist, 'fonts/space-grotesk-600-latin.woff2'));
    console.log(`\nFont (not a target): woff2 = ${(woff.length / 1024).toFixed(1)} KB raw`);
  } catch (err) {
    if (err.code === 'ENOENT') console.log('\nFont: not built (fonts:fetch not run)');
    else throw err;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});