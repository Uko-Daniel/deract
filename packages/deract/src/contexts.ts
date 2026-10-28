import type { Cleanup } from './types';

export interface ContextOption {
  id: string;
  label: string;
  value?: unknown;
}

export interface ContextDef {
  id: string;
  label: string;
  options: readonly ContextOption[];
  default: string;
  apply?: (
    target: { root: HTMLElement; document: Document },
    option: ContextOption,
  ) => void | Cleanup;
}

/** Sets an attribute and returns a function that restores whatever was there before. */
function setAttr(el: HTMLElement, name: string, value: string): Cleanup {
  const prev = el.getAttribute(name);
  el.setAttribute(name, value);
  return () => {
    if (prev === null) el.removeAttribute(name);
    else el.setAttribute(name, prev);
  };
}

/**
 * Internal (not exported from the package index). The playground calls this.
 * Uses def.apply when given, otherwise sets data-<id>="<optionId>" on the root.
 * Always returns a cleanup function.
 */
export function applyContext(
  def: ContextDef,
  target: { root: HTMLElement; document: Document },
  option: ContextOption,
): Cleanup {
  if (def.apply) {
    const cleanup = def.apply(target, option);
    return typeof cleanup === 'function' ? cleanup : () => {};
  }
  return setAttr(target.root, `data-${def.id}`, option.id);
}

export function defineContext(def: ContextDef): ContextDef {
  const problems: string[] = [];

  if (!/^[a-z][a-z0-9-]*$/.test(def.id)) {
    problems.push(`id "${def.id}" must be lowercase letters, digits and hyphens`);
  }
  if (def.options.length === 0) {
    problems.push('needs at least one option');
  }

  const seen = new Set<string>();
  for (const option of def.options) {
    if (option.id === '') problems.push('option ids cannot be empty');
    if (seen.has(option.id)) problems.push(`duplicate option id "${option.id}"`);
    seen.add(option.id);
  }
  if (!seen.has(def.default)) {
    problems.push(`default "${def.default}" is not one of the options`);
  }

  if (problems.length > 0) {
    throw new Error(`defineContext("${def.id}"): ${problems.join('; ')}`);
  }
  return def;
}

export const themeContext: ContextDef = defineContext({
  id: 'theme',
  label: 'Theme',
  options: [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ],
  default: 'light',
  apply({ root }, option) {
    const undoAttr = setAttr(root, 'data-theme', option.id);
    const prevScheme = root.style.getPropertyValue('color-scheme');
    root.style.setProperty('color-scheme', option.id);
    return () => {
      undoAttr();
      if (prevScheme === '') root.style.removeProperty('color-scheme');
      else root.style.setProperty('color-scheme', prevScheme);
    };
  },
});

// No custom apply: the default behaviour sets data-motion on the root.
export const reducedMotionContext: ContextDef = defineContext({
  id: 'motion',
  label: 'Motion',
  options: [
    { id: 'normal', label: 'Normal' },
    { id: 'reduce', label: 'Reduce' },
  ],
  default: 'normal',
});

export function localeContext(locales: readonly string[]): ContextDef {
  const first = locales[0];
  if (first === undefined) {
    throw new Error('localeContext: pass at least one locale, e.g. ["en", "yo"]');
  }
  return defineContext({
    id: 'locale',
    label: 'Locale',
    options: locales.map((l) => ({ id: l, label: l })),
    default: first,
    apply({ root }, option) {
      const undoLang = setAttr(root, 'lang', option.id);
      const undoData = setAttr(root, 'data-locale', option.id);
      return () => {
        undoData();
        undoLang();
      };
    },
  });
}