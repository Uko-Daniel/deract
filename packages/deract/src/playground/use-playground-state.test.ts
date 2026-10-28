import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { reducedMotionContext, themeContext } from '../contexts';
import { defineComponent } from '../define-component';
import { createRegistry } from '../registry';
import { viewportPresets } from '../viewports';
import { usePlaygroundState } from './use-playground-state';

const a = defineComponent({
  id: 'a',
  title: 'A',
  controls: {
    label: { type: 'text', default: 'Hi' },
    size: { type: 'select', default: 'sm', options: ['sm', 'lg'] },
  },
  variants: { big: { size: 'lg' }, hello: { label: 'Hello' } },
  render: () => null,
});
const b = defineComponent({ id: 'b', title: 'B', contexts: ['theme'], render: () => null });
const c = defineComponent({ id: 'c', title: 'C', render: () => null });

const contexts = [themeContext, reducedMotionContext];

const setup = (opts: { initial?: { id?: string; variant?: string }; entries?: typeof a[] } = {}) => {
  const registry = createRegistry(opts.entries ?? [a, b]);
  const hook = renderHook(() =>
    usePlaygroundState({ registry, contexts, viewports: viewportPresets, initial: opts.initial }),
  );
  return { registry, ...hook };
};

beforeEach(() => {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
});
afterEach(cleanup);

describe('defaults', () => {
  it('selects the first entry, default contexts, Fit viewport and default args', () => {
    const { result } = setup();
    expect(result.current.entry?.id).toBe('a');
    expect(result.current.args).toEqual({ label: 'Hi', size: 'sm' });
    expect(result.current.contexts).toEqual({ theme: 'light', motion: 'normal' });
    expect(result.current.viewport?.id).toBe('fit');
    expect(result.current.edited).toBe(false);
    expect(window.location.hash).toBe('#/a');
  });

  it('copes with an empty registry', () => {
    const { result } = setup({ entries: [] });
    expect(result.current.entry).toBeUndefined();
    expect(result.current.args).toEqual({});
    expect(result.current.viewport?.id).toBe('fit');
  });
});

describe('variants, edits and reset', () => {
  it('merges variant over defaults, user edits over both, and reset returns to the variant', () => {
    const { result } = setup();
    act(() => result.current.selectVariant('big'));
    expect(result.current.args).toEqual({ label: 'Hi', size: 'lg' });

    act(() => result.current.setArg('label', 'Yo'));
    expect(result.current.args).toEqual({ label: 'Yo', size: 'lg' });
    expect(result.current.edited).toBe(true);

    act(() => result.current.reset());
    expect(result.current.args).toEqual({ label: 'Hi', size: 'lg' });
    expect(result.current.variant).toBe('big');
    expect(result.current.edited).toBe(false);
  });

  it('selecting another variant clears user edits', () => {
    const { result } = setup();
    act(() => result.current.setArg('label', 'Yo'));
    act(() => result.current.selectVariant('hello'));
    expect(result.current.args).toEqual({ label: 'Hello', size: 'sm' });
  });

  it('ignores edits that fail the control rules or name unknown controls', () => {
    const { result } = setup();
    act(() => result.current.setArg('size', 'xl'));
    act(() => result.current.setArg('nope', 1));
    expect(result.current.args).toEqual({ label: 'Hi', size: 'sm' });
    expect(result.current.edited).toBe(false);
  });
});

describe('switching entries and contexts', () => {
  it('keeps contexts and viewport, clears variant and edits', () => {
    const { result } = setup();
    act(() => {
      result.current.setContext('theme', 'dark');
      result.current.setViewport('phone');
      result.current.selectVariant('big');
    });
    act(() => result.current.selectEntry('b'));
    expect(result.current.entry?.id).toBe('b');
    expect(result.current.variant).toBeUndefined();
    expect(result.current.contexts.theme).toBe('dark');
    expect(result.current.viewport?.id).toBe('phone');
  });

  it('only includes contexts the entry says are relevant, and remembers the rest', () => {
    const { result } = setup();
    act(() => result.current.setContext('motion', 'reduce'));
    act(() => result.current.selectEntry('b'));
    expect(result.current.activeContexts.map((x) => x.id)).toEqual(['theme']);
    expect(result.current.contexts).toEqual({ theme: 'light' });
    act(() => result.current.selectEntry('a'));
    expect(result.current.contexts).toEqual({ theme: 'light', motion: 'reduce' });
  });

  it('ignores an option that does not exist', () => {
    const { result } = setup();
    act(() => result.current.setContext('theme', 'purple'));
    expect(result.current.contexts.theme).toBe('light');
    expect(window.location.hash).not.toContain('ctx.theme');
  });
});

describe('the URL hash', () => {
  it('restores everything from the hash', () => {
    const args = encodeURIComponent(JSON.stringify({ label: 'Zed' }));
    window.history.replaceState(null, '', `#/a?variant=big&ctx.theme=dark&vp=phone&args=${args}`);
    const { result } = setup();
    expect(result.current.entry?.id).toBe('a');
    expect(result.current.variant).toBe('big');
    expect(result.current.contexts.theme).toBe('dark');
    expect(result.current.viewport?.id).toBe('phone');
    expect(result.current.args).toEqual({ label: 'Zed', size: 'lg' });
  });

  it('drops anything invalid and rewrites the hash clean', () => {
    const args = encodeURIComponent(JSON.stringify({ label: 5, nope: 1 }));
    window.history.replaceState(null, '', `#/zzz?variant=big&ctx.theme=nope&vp=nope&args=${args}`);
    const { result } = setup();
    expect(result.current.entry?.id).toBe('a');
    expect(result.current.variant).toBeUndefined();
    expect(result.current.contexts.theme).toBe('light');
    expect(result.current.viewport?.id).toBe('fit');
    expect(result.current.args).toEqual({ label: 'Hi', size: 'sm' });
    expect(window.location.hash).toBe('#/a');
  });

  it('round-trips: a new hook restores exactly what the first one wrote', () => {
    const first = setup();
    act(() => {
      first.result.current.selectVariant('big');
      first.result.current.setContext('theme', 'dark');
      first.result.current.setViewport('phone');
    });
    act(() => first.result.current.setArg('label', 'Yo'));
    const hash = window.location.hash;
    expect(hash).toBe('#/a?variant=big&ctx.theme=dark&vp=phone&args=%7B%22label%22%3A%22Yo%22%7D');
    const snapshot = {
      args: first.result.current.args,
      contexts: first.result.current.contexts,
      viewport: first.result.current.viewport?.id,
    };
    first.unmount();

    const second = setup();
    expect(second.result.current.args).toEqual(snapshot.args);
    expect(second.result.current.contexts).toEqual(snapshot.contexts);
    expect(second.result.current.viewport?.id).toBe(snapshot.viewport);
    expect(window.location.hash).toBe(hash);
  });

  it('follows hashchange (Back button or a pasted link)', () => {
    const { result } = setup();
    act(() => {
      window.history.replaceState(null, '', '#/b');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.entry?.id).toBe('b');
  });

  it('uses props.initial only when the URL has no entry', () => {
    expect(setup({ initial: { id: 'b' } }).result.current.entry?.id).toBe('b');
    cleanup();
    window.history.replaceState(null, '', '#/a');
    expect(setup({ initial: { id: 'b' } }).result.current.entry?.id).toBe('a');
  });
});

describe('registry changes and stable references', () => {
  it('shows entries added later and picks up replaced ones', () => {
    const { result, registry } = setup();
    act(() => {
      registry.add(c);
    });
    expect(result.current.entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);

    const newer = defineComponent({ id: 'a', title: 'A v2', render: () => null });
    act(() => {
      registry.add(newer);
    });
    expect(result.current.entry).toBe(newer);
  });

  it('keeps args and contexts the same object when unrelated things change', () => {
    const { result, registry } = setup();
    const { args, contexts: ctx } = result.current;

    act(() => result.current.setViewport('phone'));
    expect(result.current.args).toBe(args);
    expect(result.current.contexts).toBe(ctx);

    act(() => {
      registry.add(c);
    });
    expect(result.current.args).toBe(args);

    act(() => result.current.reset()); // nothing to reset
    expect(result.current.args).toBe(args);

    act(() => result.current.setArg('label', 'Yo'));
    expect(result.current.args).not.toBe(args);
  });
});