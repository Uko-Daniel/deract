export interface HashState {
  id?: string;
  variant?: string;
  contexts: Record<string, string>;
  viewport?: string;
  viewportWidth?: number;
  viewportHeight?: number | null;
  args: Record<string, unknown>;
}

export function parseHash(hash: string): HashState {
  const out: HashState = { contexts: {}, args: {} };
  if (!hash || hash === '#') return out;

  let h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (h.startsWith('/')) h = h.slice(1);

  const [pathPart, queryPart] = h.split('?', 2);
  if (pathPart) out.id = pathPart;
  if (!queryPart) return out;

  const params = new URLSearchParams(queryPart);

  const variant = params.get('variant');
  if (variant) out.variant = variant;

  const vp = params.get('vp');
  if (vp) out.viewport = vp;

  const vw = params.get('vw');
  if (vw !== null) {
    const n = Number(vw);
    if (Number.isFinite(n) && n > 0) out.viewportWidth = n;
  }

  const vh = params.get('vh');
  if (vh !== null) {
    const n = Number(vh);
    if (Number.isFinite(n) && n > 0) out.viewportHeight = n;
  }

  for (const [key, value] of params.entries()) {
    if (key.startsWith('ctx.')) {
      const contextId = key.slice(4);
      if (contextId) out.contexts[contextId] = value;
    }
  }

  const argsRaw = params.get('args');
  if (argsRaw) {
    try {
      const parsed = JSON.parse(argsRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        out.args = parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore malformed args */
    }
  }

  return out;
}

export function formatHash(s: HashState): string {
  const params: string[] = [];

  if (s.variant) params.push(`variant=${encodeURIComponent(s.variant)}`);

    for (const contextId of Object.keys(s.contexts).sort()) {
    const optionId = s.contexts[contextId];
    if (contextId && optionId) {
      params.push(`ctx.${contextId}=${encodeURIComponent(optionId)}`);
    }
  }

  if (s.viewport) params.push(`vp=${encodeURIComponent(s.viewport)}`);
  if (s.viewport === 'custom') {
    if (s.viewportWidth !== undefined) params.push(`vw=${s.viewportWidth}`);
    if (s.viewportHeight !== undefined && s.viewportHeight !== null) {
      params.push(`vh=${s.viewportHeight}`);
    }
  }

  const argKeys = Object.keys(s.args).sort();
  if (argKeys.length > 0) {
    const sorted: Record<string, unknown> = {};
    for (const k of argKeys) sorted[k] = s.args[k];
    params.push(`args=${encodeURIComponent(JSON.stringify(sorted))}`);
  }

  const query = params.join('&');
  return `#/${s.id ?? ''}${query ? `?${query}` : ''}`;
}