import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { ContextDef } from '../contexts';
import type { Cleanup, Env } from '../types';
import type { ViewportPreset } from '../viewports';

export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * What the canvas exposes to the caller. `container` is where React portals
 * into (the iframe's body or the inline wrapper); `root` is where contexts
 * are applied and where non-React code mounts.
 */
export interface CanvasTarget {
  document: Document;
  window: Window;
  root: HTMLElement;
  container: HTMLElement;
}

export interface CanvasProps {
  contexts: readonly ContextDef[];
  contextValues: Readonly<Record<string, string>>;
  viewport: ViewportPreset | undefined;
  stylesheets?: readonly string[];
  isolation: 'iframe' | 'none';
  title?: string;
  onSize?(size: CanvasSize): void;
  /** Render prop: the caller renders the entry, given the env and the mount target. */
  children: (env: Env, target: CanvasTarget) => ReactNode;
}

const MIRROR_SELECTOR = 'style, link[rel="stylesheet"]';

function useMirrorStyles(
  hostDoc: Document | null,
  targetDoc: Document | null,
  extraHrefs: readonly string[] | undefined,
): void {
  const extraKey = (extraHrefs ?? []).join('\u0000');

  useEffect(() => {
    if (!hostDoc || !targetDoc) return;
    const win = hostDoc.defaultView;
    if (!win) return;
    const head = targetDoc.head;
    const clones = new Map<Element, Element>();
    const extras: HTMLElement[] = [];

    const sync = () => {
      const present = new Set<Element>();
      hostDoc.querySelectorAll(MIRROR_SELECTOR).forEach((node) => {
        present.add(node);
        const existing = clones.get(node);
        if (existing) {
          if (node.tagName === 'STYLE' && existing.textContent !== node.textContent) {
            existing.textContent = node.textContent;
          }
        } else {
          const clone = targetDoc.importNode(node, true) as Element;
          clone.setAttribute('data-dct-mirrored', '');
          head.appendChild(clone);
          clones.set(node, clone);
        }
      });
      for (const [orig, clone] of clones) {
        if (!present.has(orig) || !orig.isConnected) {
          clone.remove();
          clones.delete(orig);
        }
      }
    };

    sync();
    for (const href of extraHrefs ?? []) {
      const link = targetDoc.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-dct-mirrored', '');
      head.appendChild(link);
      extras.push(link);
    }

    const observer = new win.MutationObserver(sync);
    observer.observe(hostDoc.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      for (const clone of clones.values()) clone.remove();
      clones.clear();
      for (const link of extras) link.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostDoc, targetDoc, extraKey]);
}

function useApplyContexts(
  root: HTMLElement | null,
  contexts: readonly ContextDef[],
  values: Readonly<Record<string, string>>,
): void {
  useEffect(() => {
    if (!root) return;
    const doc = root.ownerDocument;
    const cleanups: Cleanup[] = [];

    for (const ctx of contexts) {
      const optionId = values[ctx.id];
      if (optionId === undefined) continue;
      const option = ctx.options.find((o) => o.id === optionId);
      if (!option) continue;
      try {
        if (ctx.apply) {
          const result = ctx.apply({ root, document: doc }, option);
          if (typeof result === 'function') cleanups.push(result);
        } else {
          const attr = `data-${ctx.id}`;
          root.setAttribute(attr, option.id);
          cleanups.push(() => root.removeAttribute(attr));
        }
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error(`[deract] context "${ctx.id}" apply threw`, err);
        }
      }
    }

    return () => {
      for (const c of cleanups) {
        try {
          c();
        } catch {
          /* ignore cleanup errors */
        }
      }
    };
  }, [root, contexts, values]);
}

function frameStyle(vp: ViewportPreset | undefined): CSSProperties | undefined {
  if (!vp) return undefined;
  const s: CSSProperties = {};
  if (vp.width !== null) {
    s.width = `${vp.width}px`;
    s.maxWidth = '100%';
  }
  if (vp.height != null) s.height = `${vp.height}px`;
  return Object.keys(s).length > 0 ? s : undefined;
}

const IFRAME_INLINE: CSSProperties = { border: 0, display: 'block', width: '100%', height: '100%' };

export function Canvas(props: CanvasProps) {
  return props.isolation === 'iframe' ? <IframeCanvas {...props} /> : <InlineCanvas {...props} />;
}

function IframeCanvas({
  contexts,
  contextValues,
  viewport,
  stylesheets,
  title = 'Component preview',
  onSize,
  children,
}: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<CanvasTarget | null>(null);
  const targetRef = useRef<CanvasTarget | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) return;
      const win = doc.defaultView;
      if (!win) return;
      if (targetRef.current?.document === doc) return;

      doc.body.style.margin = '0';
      let root = doc.getElementById('dct-canvas-root') as HTMLElement | null;
      if (!root) {
        root = doc.createElement('div');
        root.id = 'dct-canvas-root';
        root.className = 'dct-canvas-root';
        root.style.boxSizing = 'border-box';
        root.style.minHeight = '100%';
        doc.body.appendChild(root);
      }
      const next: CanvasTarget = { document: doc, window: win, root, container: root };
      targetRef.current = next;
      setTarget(next);
    };

    setup();
    iframe.addEventListener('load', setup);
    return () => {
      cancelled = true;
      iframe.removeEventListener('load', setup);
    };
  }, []);

  useLayoutEffect(() => {
    if (!target) return;
    const measure = () => {
      const rect = target.root.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(target.root);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [target]);

  useEffect(() => {
    onSize?.(size);
  }, [size, onSize]);

  const hostDoc = typeof document !== 'undefined' ? document : null;
  useMirrorStyles(hostDoc, target?.document ?? null, stylesheets);
  useApplyContexts(target?.root ?? null, contexts, contextValues);

  const env = useMemo<Env | null>(() => {
    if (!target) return null;
    return {
      contexts: contextValues,
      viewport: { width: size.width, height: size.height },
      document: target.document,
      window: target.window,
    };
  }, [target, contextValues, size.width, size.height]);

  const onFrameClick = useCallback(() => {
    /* no-op; the iframe is not focusable content of ours */
  }, []);

  return (
    <div className="dct-canvas-frame" style={frameStyle(viewport)} onClick={onFrameClick}>
      <iframe ref={iframeRef} title={title} className="dct-canvas-iframe" style={IFRAME_INLINE} />
      {target && env ? createPortal(children(env, target), target.container) : null}
    </div>
  );
}

function InlineCanvas({
  contexts,
  contextValues,
  viewport,
  onSize,
  children,
}: CanvasProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!root) return;
    const measure = () => {
      const rect = root.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height };
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(root);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [root]);

  useEffect(() => {
    onSize?.(size);
  }, [size, onSize]);

  useApplyContexts(root, contexts, contextValues);

  const env = useMemo<Env | null>(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return null;
    return {
      contexts: contextValues,
      viewport: { width: size.width, height: size.height },
      document: window.document,
      window,
    };
  }, [contextValues, size.width, size.height]);

  const target: CanvasTarget | null =
    root && typeof window !== 'undefined'
      ? { document: window.document, window, root, container: root }
      : null;

  return (
    <div className="dct-canvas-frame dct-canvas-frame-inline" style={frameStyle(viewport)}>
      <div ref={setRoot} className="dct-canvas-root dct-canvas-root-inline">
        {root && env && target ? children(env, target) : null}
      </div>
    </div>
  );
}