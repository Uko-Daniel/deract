import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mirrorStyles, type Mirror } from './mirror-styles';

const tick = () => new Promise<void>((r) => setTimeout(r, 0)); // let MutationObserver run

let host: Document;
let target: Document;
let mirror: Mirror | undefined;

const style = (css: string) => {
  const el = host.createElement('style');
  el.textContent = css;
  return el;
};
const link = (href: string) => {
  const el = host.createElement('link');
  el.setAttribute('rel', 'stylesheet');
  el.setAttribute('href', href);
  return el;
};
const start = (extra: string[] = []) => (mirror = mirrorStyles(host, target, extra));
const mirrored = () =>
  Array.from(target.head.querySelectorAll('[data-dct-mirror]')).map((el) =>
    el.localName === 'link' ? el.getAttribute('href') : el.textContent,
  );

beforeEach(() => {
  host = document.implementation.createHTMLDocument('host');
  target = document.implementation.createHTMLDocument('target');
  mirror = undefined;
});
afterEach(() => mirror?.stop());

describe('mirrorStyles: initial copy', () => {
  it('copies styles and links in order, as elements of the target document', () => {
    host.head.append(style('a{}'), link('/b.css'), style('c{}'));
    start();
    expect(mirrored()).toEqual(['a{}', '/b.css', 'c{}']);
    expect(target.head.querySelector('style')?.ownerDocument).toBe(target);
  });

  it('ignores other head content', () => {
    host.head.append(host.createElement('meta'), style('a{}'));
    start();
    expect(mirrored()).toEqual(['a{}']);
    expect(target.head.querySelector('meta')).toBeNull();
  });
});

describe('mirrorStyles: staying in sync', () => {
  it('picks up a style added later', async () => {
    host.head.append(style('a{}'));
    start();
    host.head.append(style('b{}'));
    await tick();
    expect(mirrored()).toEqual(['a{}', 'b{}']);
  });

  it('updates the copy when the css text changes (HMR)', async () => {
    const a = style('a{}');
    host.head.append(a);
    start();
    a.textContent = 'a2{}';
    await tick();
    expect(mirrored()).toEqual(['a2{}']);
  });

  it('handles a replaced style tag, keeping its position', async () => {
    const a = style('a{}');
    host.head.append(a, style('b{}'));
    start();
    a.replaceWith(style('a2{}'));
    await tick();
    expect(mirrored()).toEqual(['a2{}', 'b{}']);
  });

  it('removes the copy when the host removes a tag', async () => {
    const a = style('a{}');
    host.head.append(a, style('b{}'));
    start();
    a.remove();
    await tick();
    expect(mirrored()).toEqual(['b{}']);
  });

  it('keeps cascade order when a tag is inserted at the start', async () => {
    host.head.append(style('a{}'), style('b{}'));
    start();
    host.head.prepend(style('z{}'));
    await tick();
    expect(mirrored()).toEqual(['z{}', 'a{}', 'b{}']);
  });

  it('follows a changed link href', async () => {
    const l = link('/one.css');
    host.head.append(l);
    start();
    l.setAttribute('href', '/two.css');
    await tick();
    expect(mirrored()).toEqual(['/two.css']);
  });
});

describe('mirrorStyles: extra stylesheets', () => {
  it('adds extras after mirrored styles, even for styles added later', async () => {
    host.head.append(style('a{}'));
    start(['/extra.css']);
    expect(mirrored()).toEqual(['a{}', '/extra.css']);
    host.head.append(style('late{}'));
    await tick();
    expect(mirrored()).toEqual(['a{}', 'late{}', '/extra.css']);
  });
});

describe('mirrorStyles: stop and ready', () => {
  it('stop removes everything it added and stops syncing', async () => {
    host.head.append(style('a{}'));
    start(['/extra.css']);
    mirror?.stop();
    expect(mirrored()).toEqual([]);
    host.head.append(style('b{}'));
    await tick();
    expect(mirrored()).toEqual([]);
  });

  it('is ready immediately when there are no links', async () => {
    host.head.append(style('a{}'));
    await expect(start().ready).resolves.toBeUndefined();
  });

  it('is ready once the copied links fire load', async () => {
    host.head.append(link('/b.css'));
    const m = start();
    let done = false;
    void m.ready.then(() => (done = true));
    await tick();
    expect(done).toBe(false);
    target.head.querySelector('link')?.dispatchEvent(new Event('load'));
    await m.ready;
    expect(done).toBe(true);
  });
});