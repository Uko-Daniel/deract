import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Env } from '../types';
import { createMountRunner } from './mount-runner';

const env = (theme = 'light'): Env => ({
  contexts: { theme },
  viewport: { width: 360, height: 640 },
  document,
  window,
});

const setup = () => ({ el: document.createElement('div'), onError: vi.fn() });

afterEach(() => vi.restoreAllMocks());

describe('mount runner: first mount', () => {
  it('mounts once with el, args and env, and reports success', () => {
    const { el, onError } = setup();
    const mount = vi.fn();
    const runner = createMountRunner({ id: 'm', mount }, el, onError);
    const e = env();
    runner.update({ n: 1 }, e);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledWith(el, { n: 1 }, e);
    expect(onError).toHaveBeenLastCalledWith(null);
  });
});

describe('mount runner: args or env change', () => {
  it('calls update when the entry returned a handle with update', () => {
    const { el, onError } = setup();
    const update = vi.fn();
    const destroy = vi.fn();
    const mount = vi.fn(() => ({ update, destroy }));
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({ n: 1 }, env());
    runner.update({ n: 2 }, env('dark')); // args AND env changed

    expect(mount).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      { n: 2 },
      expect.objectContaining({ contexts: { theme: 'dark' } }),
    );
  });

  it('cleans up then remounts when the entry returned only a cleanup function', () => {
    const { el, onError } = setup();
    const calls: string[] = [];
    const mount = () => {
      calls.push('mount');
      el.append(document.createElement('span'));
      return () => calls.push('cleanup');
    };
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.update({}, env());

    expect(calls).toEqual(['mount', 'cleanup', 'mount']);
    expect(el.children).toHaveLength(1); // container was cleared, not stacked
  });

  it('remounts when the handle has destroy but no update', () => {
    const { el, onError } = setup();
    const destroy = vi.fn();
    const mount = vi.fn(() => ({ destroy }));
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.update({}, env());

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it('remounts and clears the DOM when the entry returned nothing', () => {
    const { el, onError } = setup();
    const mount = vi.fn((target: HTMLElement) => {
      target.append(document.createElement('span'));
    });
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.update({}, env());

    expect(mount).toHaveBeenCalledTimes(2);
    expect(el.children).toHaveLength(1);
  });
});

describe('mount runner: destroy', () => {
  it('always runs cleanup, once, and then ignores further updates', () => {
    const { el, onError } = setup();
    const cleanup = vi.fn();
    const mount = vi.fn(() => cleanup);
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.destroy();
    runner.destroy();
    runner.update({}, env());

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it('runs destroy even when the handle also has update', () => {
    const { el, onError } = setup();
    const destroy = vi.fn();
    const runner = createMountRunner(
      { id: 'm', mount: () => ({ update: () => {}, destroy }) },
      el,
      onError,
    );
    runner.update({}, env());
    runner.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe('mount runner: errors', () => {
  it('reports a throwing mount, leaves a clean container, and recovers', () => {
    const { el, onError } = setup();
    let shouldThrow = true;
    const mount = (target: HTMLElement) => {
      target.append(document.createElement('span'));
      if (shouldThrow) throw new Error('nope');
    };
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    expect(() => runner.update({}, env())).not.toThrow();
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'nope' }));
    expect(el.children).toHaveLength(0);

    shouldThrow = false;
    runner.update({}, env());
    expect(onError).toHaveBeenLastCalledWith(null);
    expect(el.children).toHaveLength(1);
  });

  it('turns a thrown string into an Error', () => {
    const { el, onError } = setup();
    const runner = createMountRunner(
      {
        id: 'm',
        mount: () => {
          throw 'boom';
        },
      },
      el,
      onError,
    );
    runner.update({}, env());
    const err = onError.mock.lastCall?.[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('boom');
  });

  it('tears down after a throwing update and remounts on the next change', () => {
    const { el, onError } = setup();
    const destroy = vi.fn();
    const mount = vi.fn(() => ({
      update: () => {
        throw new Error('bad update');
      },
      destroy,
    }));
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.update({}, env());
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'bad update' }));

    runner.update({}, env());
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it('logs a throwing cleanup but still remounts', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { el, onError } = setup();
    const mount = vi.fn(() => () => {
      throw new Error('bad cleanup');
    });
    const runner = createMountRunner({ id: 'm', mount }, el, onError);

    runner.update({}, env());
    runner.update({}, env());

    expect(mount).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalled();
    expect(onError).toHaveBeenLastCalledWith(null);
  });
});