import { describe, it, expect } from 'vitest';
import {
  applyContext,
  defineContext,
  localeContext,
  reducedMotionContext,
  themeContext,
} from './contexts';
import { viewportPresets } from './viewports';

const target = () => ({ root: document.createElement('div'), document });

describe('defineContext validation', () => {
  const opts = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];

  it('accepts a valid context and returns it', () => {
    const def = { id: 'density', label: 'Density', options: opts, default: 'a' };
    expect(defineContext(def)).toBe(def);
  });

  it('rejects a bad id, no options, duplicate options and an unknown default', () => {
    expect(() => defineContext({ id: 'Bad Id', label: 'x', options: opts, default: 'a' })).toThrow(
      /lowercase/,
    );
    expect(() => defineContext({ id: 'x', label: 'x', options: [], default: 'a' })).toThrow(
      /at least one option/,
    );
    expect(() =>
      defineContext({ id: 'x', label: 'x', options: [opts[0]!, opts[0]!], default: 'a' }),
    ).toThrow(/duplicate/);
    expect(() => defineContext({ id: 'x', label: 'x', options: opts, default: 'zzz' })).toThrow(
      /not one of the options/,
    );
  });
});

describe('applyContext', () => {
  const density = defineContext({
    id: 'density',
    label: 'Density',
    options: [
      { id: 'compact', label: 'Compact' },
      { id: 'roomy', label: 'Roomy' },
    ],
    default: 'compact',
  });

  it('by default sets data-<id> on the root and cleanup removes it', () => {
    const t = target();
    const undo = applyContext(density, t, density.options[1]!);
    expect(t.root.getAttribute('data-density')).toBe('roomy');
    undo();
    expect(t.root.hasAttribute('data-density')).toBe(false);
  });

  it('cleanup restores a previous attribute value', () => {
    const t = target();
    t.root.setAttribute('data-density', 'original');
    const undo = applyContext(density, t, density.options[1]!);
    undo();
    expect(t.root.getAttribute('data-density')).toBe('original');
  });

  it('uses a custom apply and tolerates one that returns nothing', () => {
    const t = target();
    const custom = defineContext({
      ...density,
      apply: ({ root }, option) => {
        root.dataset.custom = option.id;
      },
    });
    const undo = applyContext(custom, t, custom.options[0]!);
    expect(t.root.dataset.custom).toBe('compact');
    expect(() => undo()).not.toThrow();
  });
});

describe('built-in contexts', () => {
  it('theme sets data-theme and cleans up', () => {
    const t = target();
    const undo = applyContext(themeContext, t, themeContext.options[1]!);
    expect(t.root.getAttribute('data-theme')).toBe('dark');
    undo();
    expect(t.root.hasAttribute('data-theme')).toBe(false);
  });

  it('motion uses the default data-motion behaviour', () => {
    const t = target();
    expect(reducedMotionContext.id).toBe('motion');
    const undo = applyContext(reducedMotionContext, t, reducedMotionContext.options[1]!);
    expect(t.root.getAttribute('data-motion')).toBe('reduce');
    undo();
    expect(t.root.hasAttribute('data-motion')).toBe(false);
  });

  it('locale sets lang and data-locale, defaults to the first locale', () => {
    const ctx = localeContext(['en', 'yo']);
    expect(ctx.default).toBe('en');
    const t = target();
    const undo = applyContext(ctx, t, ctx.options[1]!);
    expect(t.root.getAttribute('lang')).toBe('yo');
    expect(t.root.getAttribute('data-locale')).toBe('yo');
    undo();
    expect(t.root.hasAttribute('lang')).toBe(false);
  });

  it('locale needs at least one locale', () => {
    expect(() => localeContext([])).toThrow(/at least one/);
  });
});

describe('viewportPresets', () => {
  it('has Phone 360, Tablet 768, Desktop 1280 and Fit', () => {
    expect(viewportPresets.map((p) => p.width)).toEqual([360, 768, 1280, null]);
  });
});