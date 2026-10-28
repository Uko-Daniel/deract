import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ContextDef } from '../contexts';
import { checkValue } from '../define-component';
import type { Registry } from '../registry';
import type { Controls, Entry } from '../types';
import type { ViewportPreset } from '../viewports';
import { formatHash, parseHash, type HashState } from './hash';

export interface UsePlaygroundStateOptions {
  registry: Registry;
  contexts: readonly ContextDef[];
  viewports: readonly ViewportPreset[];
  initial?: { id?: string; variant?: string };
}

export interface PlaygroundState {
  entries: readonly Entry<any>[];
  groups: ReadonlyMap<string, readonly Entry<any>[]>;
  entry: Entry<any> | undefined;
  variant: string | undefined;
  variantNames: readonly string[];
  activeContexts: readonly ContextDef[];
  contexts: Readonly<Record<string, string>>;
  viewport: ViewportPreset | undefined;
  args: Readonly<Record<string, unknown>>;
  edited: boolean;
  selectEntry(id: string): void;
  selectVariant(name: string | undefined): void;
  setContext(contextId: string, optionId: string): void;
  setViewport(id: string): void;
  /** Enter custom viewport mode (or update it) with explicit dimensions. */
  setCustomViewport(width: number, height?: number | null): void;
  setArg(name: string, value: unknown): void;
  reset(): void;
}

function readHash(initial: UsePlaygroundStateOptions['initial']): HashState {
  const parsed = parseHash(window.location.hash);
  if (parsed.id) return parsed;
  return { ...parsed, id: initial?.id, variant: parsed.variant ?? initial?.variant };
}

export function usePlaygroundState({
  registry,
  contexts,
  viewports,
  initial,
}: UsePlaygroundStateOptions): PlaygroundState {
  const entries = useSyncExternalStore(registry.subscribe, registry.list, registry.list);
  const groups = useMemo(() => registry.groups(), [registry, entries]);

  const initialRef = useRef(initial);
  const [raw, setRaw] = useState<HashState>(() => readHash(initial));

  useEffect(() => {
    const onHashChange = () => setRaw(readHash(initialRef.current));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ----- entry & variant -----
  const requested = raw.id === undefined ? entries[0] : entries.find((e) => e.id === raw.id);
  const entry = requested ?? entries[0];
  const trusted = requested !== undefined;

  const variantNames = useMemo(() => Object.keys(entry?.variants ?? {}), [entry]);
  const variant =
    trusted && raw.variant !== undefined && variantNames.includes(raw.variant)
      ? raw.variant
      : undefined;

  // ----- args -----
  const overrides = useMemo(() => {
    const out: Record<string, unknown> = {};
    if (!entry || !trusted) return out;
    const controls: Controls = entry.controls ?? {};
    for (const [name, value] of Object.entries(raw.args)) {
      if (!Object.hasOwn(controls, name)) continue;
      const def = controls[name];
      if (def && checkValue(def, value) === null) out[name] = value;
    }
    return out;
  }, [entry, trusted, raw.args]);

  const args = useMemo(() => {
    const out: Record<string, unknown> = {};
    const controls: Controls = entry?.controls ?? {};
    for (const [name, def] of Object.entries(controls)) out[name] = def.default;
    const preset = variant ? entry?.variants?.[variant] : undefined;
    for (const [name, value] of Object.entries(preset ?? {})) {
      if (value !== undefined) out[name] = value;
    }
    return Object.assign(out, overrides);
  }, [entry, variant, overrides]);

  // ----- contexts -----
  const activeContexts = useMemo(
    () => contexts.filter((c) => !entry?.contexts || entry.contexts.includes(c.id)),
    [contexts, entry],
  );

  const pairs = activeContexts.map((c) => {
    const chosen = raw.contexts[c.id];
    const value =
      chosen !== undefined && c.options.some((o) => o.id === chosen) ? chosen : c.default;
    return [c.id, value] as const;
  });
  const signature = JSON.stringify(pairs);
  const resolved = useMemo(() => Object.fromEntries(pairs), [signature]);

  // ----- viewport -----
  const viewport: ViewportPreset | undefined = (() => {
    if (
      raw.viewport === 'custom' &&
      typeof raw.viewportWidth === 'number' &&
      raw.viewportWidth > 0
    ) {
      const height =
        typeof raw.viewportHeight === 'number' && raw.viewportHeight > 0
          ? raw.viewportHeight
          : null;
      return { id: 'custom', label: 'Custom', width: raw.viewportWidth, height };
    }
    return (
      viewports.find((p) => p.id === raw.viewport) ??
      viewports.find((p) => p.width === null) ??
      viewports[0]
    );
  })();

  // ----- write the hash (only valid, user-chosen values) -----
  useEffect(() => {
    const chosen: Record<string, string> = {};
    for (const c of contexts) {
      const v = raw.contexts[c.id];
      if (v !== undefined && c.options.some((o) => o.id === v)) chosen[c.id] = v;
    }

    const viewportInHash =
      raw.viewport === 'custom' && typeof raw.viewportWidth === 'number' && raw.viewportWidth > 0
        ? 'custom'
        : viewports.some((p) => p.id === raw.viewport)
          ? raw.viewport
          : undefined;

    const hash = formatHash({
      id: entry?.id,
      variant,
      contexts: chosen,
      viewport: viewportInHash,
      viewportWidth: viewportInHash === 'custom' ? raw.viewportWidth : undefined,
      viewportHeight: viewportInHash === 'custom' ? raw.viewportHeight : undefined,
      args: overrides,
    });
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  }, [
    entry,
    variant,
    overrides,
    raw.contexts,
    raw.viewport,
    raw.viewportWidth,
    raw.viewportHeight,
    contexts,
    viewports,
  ]);

  // ----- actions -----
  const selectEntry = useCallback(
    (id: string) => setRaw((r) => ({ ...r, id, variant: undefined, args: {} })),
    [],
  );
  const selectVariant = useCallback(
    (name: string | undefined) => setRaw((r) => ({ ...r, variant: name, args: {} })),
    [],
  );
  const setContext = useCallback(
    (contextId: string, optionId: string) =>
      setRaw((r) => ({ ...r, contexts: { ...r.contexts, [contextId]: optionId } })),
    [],
  );
  const setViewport = useCallback(
    (id: string) =>
      setRaw((r) => ({
        ...r,
        viewport: id,
        viewportWidth: id === 'custom' ? r.viewportWidth : undefined,
        viewportHeight: id === 'custom' ? r.viewportHeight : undefined,
      })),
    [],
  );
  const setCustomViewport = useCallback(
    (width: number, height?: number | null) =>
      setRaw((r) => ({
        ...r,
        viewport: 'custom',
        viewportWidth: width,
        viewportHeight: height ?? null,
      })),
    [],
  );
  const setArg = useCallback(
    (name: string, value: unknown) =>
      setRaw((r) => ({ ...r, args: { ...r.args, [name]: value } })),
    [],
  );
  const reset = useCallback(
    () => setRaw((r) => (Object.keys(r.args).length === 0 ? r : { ...r, args: {} })),
    [],
  );

  return {
    entries,
    groups,
    entry,
    variant,
    variantNames,
    activeContexts,
    contexts: resolved,
    viewport,
    args,
    edited: Object.keys(overrides).length > 0,
    selectEntry,
    selectVariant,
    setContext,
    setViewport,
    setCustomViewport,
    setArg,
    reset,
  };
}