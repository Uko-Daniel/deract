export interface HashState {
  id?: string;
  variant?: string;
  contexts: Record<string, string>; // context id -> option id
  viewport?: string; // viewport preset id
  args: Record<string, unknown>; // user edits only, not defaults
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // malformed %-escape: keep it as typed
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Never throws. Anything it cannot understand is ignored. */
export function parseHash(hash: string): HashState {
  const state: HashState = { contexts: {}, args: {} };

  const raw = hash.replace(/^#\/?/, '');
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  const query = q === -1 ? '' : raw.slice(q + 1);

  if (path !== '') state.id = safeDecode(path);

  const params = new URLSearchParams(query);

  const variant = params.get('variant');
  if (variant) state.variant = variant;

  const viewport = params.get('vp');
  if (viewport) state.viewport = viewport;

  for (const [key, value] of params) {
    if (key.startsWith('ctx.') && key.length > 4) {
      state.contexts[key.slice(4)] = value;
    }
  }

  const args = params.get('args');
  if (args) {
    try {
      const parsed: unknown = JSON.parse(args);
      if (isPlainObject(parsed)) state.args = parsed;
    } catch {
      // not valid JSON: ignore
    }
  }

  return state;
}

/** Deterministic: the same state always gives the same URL. */
export function formatHash(state: HashState): string {
  const params = new URLSearchParams();

  if (state.variant) params.set('variant', state.variant);

  const ctx = Object.entries(state.contexts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [key, value] of ctx) params.set(`ctx.${key}`, value);

  if (state.viewport) params.set('vp', state.viewport);

  if (Object.keys(state.args).length > 0) params.set('args', JSON.stringify(state.args));

  const query = params.toString();
  const path = state.id ? encodeURIComponent(state.id) : '';
  return `#/${path}${query ? `?${query}` : ''}`;
}