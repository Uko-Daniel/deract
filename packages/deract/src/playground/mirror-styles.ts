import type { Cleanup } from '../types';

const SELECTOR = 'style, link[rel="stylesheet"]';
const MARK = 'data-dct-mirror';

export interface Mirror {
  /** Resolves when the initial stylesheet links have loaded or failed, or after 2 s. */
  ready: Promise<void>;
  stop: Cleanup;
}

/**
 * Copies <style> and <link rel=stylesheet> from source.head into target.head
 * (same order) and keeps them in sync. `extra` hrefs are added after them.
 */
export function mirrorStyles(
  source: Document,
  target: Document,
  extra: readonly string[] = [],
): Mirror {
  const clones = new Map<Element, Element>(); // host element -> its copy
  const start = target.createComment('dct-mirror');
  target.head.append(start);

  function reconcile(): void {
    const hosts = Array.from(source.head.querySelectorAll(SELECTOR));

    for (const [host, clone] of clones) {
      if (!hosts.includes(host)) {
        clone.remove();
        clones.delete(host);
      }
    }

    let prev: Node = start;
    for (const host of hosts) {
      let clone = clones.get(host);
      if (!clone) {
        clone = target.importNode(host, true) as Element;
        clone.setAttribute(MARK, '');
        clones.set(host, clone);
      } else if (host.localName === 'link') {
        const href = host.getAttribute('href') ?? '';
        if (clone.getAttribute('href') !== href) clone.setAttribute('href', href);
      } else if (clone.textContent !== host.textContent) {
        clone.textContent = host.textContent;
      }
      if (clone.previousSibling !== prev) target.head.insertBefore(clone, prev.nextSibling);
      prev = clone;
    }
  }

  reconcile();

  const extraLinks = extra.map((href) => {
    const el = target.createElement('link');
    el.setAttribute('rel', 'stylesheet');
    el.setAttribute('href', href);
    el.setAttribute(MARK, '');
    target.head.append(el);
    return el;
  });

  const observer = new MutationObserver(reconcile);
  observer.observe(source.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['href'],
  });

  const loading = [...clones.values(), ...extraLinks]
    .filter((el) => el.localName === 'link')
    .map(
      (el) =>
        new Promise<void>((resolve) => {
          el.addEventListener('load', () => resolve(), { once: true });
          el.addEventListener('error', () => resolve(), { once: true });
        }),
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = Promise.race([
    Promise.all(loading).then(() => {}),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 2000);
    }),
  ]).finally(() => clearTimeout(timer));

  return {
    ready,
    stop() {
      observer.disconnect();
      for (const clone of clones.values()) clone.remove();
      clones.clear();
      for (const el of extraLinks) el.remove();
      start.remove();
    },
  };
}