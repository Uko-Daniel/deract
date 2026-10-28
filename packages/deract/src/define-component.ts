import type { ArgsOf, ControlDef, Controls, Entry } from './types';

function checkValue(c: ControlDef, v: unknown): string | null {
  switch (c.type) {
    case 'text':
    case 'color':
      return typeof v === 'string' ? null : 'must be a string';
    case 'boolean':
      return typeof v === 'boolean' ? null : 'must be a boolean';
    case 'select':
      return typeof v === 'string' && c.options.includes(v)
        ? null
        : `must be one of: ${c.options.join(', ')}`;
    case 'number':
    case 'range':
      if (typeof v !== 'number' || Number.isNaN(v)) return 'must be a number';
      if (c.min !== undefined && v < c.min) return `must be >= ${c.min}`;
      if (c.max !== undefined && v > c.max) return `must be <= ${c.max}`;
      return null;
    default:
      return 'has an unknown control type';
  }
}

export function defineComponent<const C extends Controls = {}>(entry: Entry<C>): Entry<C> {
  const problems: string[] = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.id)) {
    problems.push(`id "${entry.id}" must be kebab-case`);
  }

  const hasRender = typeof entry.render === 'function';
  const hasMount = typeof entry.mount === 'function';
  if (hasRender === hasMount) {
    problems.push(hasRender ? 'has both render and mount' : 'needs either render or mount');
  }

  const controls: Controls = entry.controls ?? {};
  for (const [name, def] of Object.entries(controls)) {
    const err = checkValue(def, def.default);
    if (err) problems.push(`control "${name}" default ${err}`);
  }

  for (const [variant, args] of Object.entries(entry.variants ?? {})) {
    for (const [key, value] of Object.entries(args as Partial<ArgsOf<C>>)) {
      const def = controls[key];
      if (!def) {
        problems.push(`variant "${variant}" uses unknown control "${key}"`);
        continue;
      }
      const err = checkValue(def, value);
      if (err) problems.push(`variant "${variant}" ${key} ${err}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`defineComponent("${entry.id}"): ${problems.join('; ')}`);
  }
  return entry;
}