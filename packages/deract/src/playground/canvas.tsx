import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { mirrorStyles } from './mirror-styles';

export interface CanvasTarget {
  document: Document;
  window: Window;
  /** Contexts are applied here: the iframe's <html>, or the plain div. */
  root: HTMLElement;
  /** Entries render or mount here. */
  container: HTMLElement;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasProps {
  isolation?: 'iframe' | 'none';
  /** null or undefined = fill the available space */
  width?: number | null;
  height?: number | null;
  /** Read once when the iframe attaches. Change the React key to reload them. */
  stylesheets?: readonly string[];
  children: (target: CanvasTarget, size: CanvasSize) => ReactNode;
}

type InnerProps = Omit<CanvasProps, 'isolation'>;

// srcdoc gives the iframe a doctype (standards mode) and a consistent async load.
// Its content is NOT relied on: we build the structure in code after load.
const SRC_DOC = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

function IframeCanvas({ width, height, stylesheets, children }: InnerProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loaded = useRef(false);
  const attachedDoc = useRef<Document | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const sheets = useRef(stylesheets);
  const [target, setTarget] = useState<CanvasTarget | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  const teardown = useCallback(() => {
    detach.current?.();
    detach.current = null;
    attachedDoc.current = null;
  }, []);

  // Idempotent: calling it twice for the same document does nothing.
  const attach = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win || !doc.body || doc === attachedDoc.current) return;

    teardown(); // a new document replaced the old one
    attachedDoc.current = doc;

    const container = doc.createElement('div');
    container.setAttribute('data-dct-root', '');
    doc.body.append(container);

    const mirror = mirrorStyles(document, doc, sheets.current ?? []);
    const measure = () => setSize({ width: win.innerWidth, height: win.innerHeight });
    win.addEventListener('resize', measure);

    let cancelled = false;
    void mirror.ready.then(() => {
      if (cancelled) return;
      measure();
      setTarget({ document: doc, window: win, root: doc.documentElement, container });
    });

    detach.current = () => {
      cancelled = true;
      win.removeEventListener('resize', measure);
      mirror.stop();
      container.remove();
      setTarget(null);
    };
  }, [teardown]);

  // StrictMode (dev) runs effects twice and the iframe will not fire load again,
  // so if it already loaded we must re-attach here.
  useEffect(() => {
    if (loaded.current) attach();
    return teardown;
  }, [attach, teardown]);

  return (
    <>
      <iframe
        ref={frameRef}
        title="Component canvas"
        srcDoc={SRC_DOC}
        onLoad={() => {
          loaded.current = true;
          attach();
        }}
        style={{ display: 'block', border: 0, width: width ?? '100%', height: height ?? '100%' }}
      />
      {target ? children(target, size) : null}
    </>
  );
}

function PlainCanvas({ width, height, children }: InnerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<CanvasTarget | null>(null);
  const [host, setHost] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const measure = () => setHost({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTarget({ document, window, root: el, container: el });
    return () => setTarget(null);
  }, []);

  return (
    <>
      <div ref={ref} style={{ width: width ?? '100%', height: height ?? '100%', overflow: 'auto' }} />
      {target ? children(target, { width: width ?? host.width, height: height ?? host.height }) : null}
    </>
  );
}

export function Canvas({ isolation = 'iframe', ...rest }: CanvasProps) {
  return isolation === 'none' ? <PlainCanvas {...rest} /> : <IframeCanvas {...rest} />;
}