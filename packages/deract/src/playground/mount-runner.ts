import type { Cleanup, Env } from '../types';

/** What an entry's mount() may return, normalised to one shape. */
interface Handle {
  update?(args: any, env: Env): void;
  destroy?(): void;
}

/** The minimum the runner needs from an entry. MountEntry<any> fits this. */
export interface MountSource {
  id: string;
  mount: (el: HTMLElement, args: any, env: Env) => void | Cleanup | Handle;
}

export interface MountRunner {
  /** First call mounts. Later calls update or remount. Never throws. */
  update(args: Record<string, unknown>, env: Env): void;
  /** Always cleans up. After this the runner is dead; make a new one. */
  destroy(): void;
}

export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  try {
    return new Error(String(e));
  } catch {
    return new Error('Unknown error');
  }
}

function toHandle(result: void | Cleanup | Handle): Handle {
  if (typeof result === 'function') return { destroy: result };
  if (typeof result === 'object' && result !== null) return result;
  return {};
}

function attempt(fn: () => void): Error | null {
  try {
    fn();
    return null;
  } catch (e) {
    return toError(e);
  }
}

/**
 * onError is called with an Error when mount/update throws, and with null
 * after every success (so the UI can clear a previous error panel).
 */
export function createMountRunner(
  entry: MountSource,
  el: HTMLElement,
  onError: (error: Error | null) => void,
): MountRunner {
  let handle: Handle | null = null;
  let destroyed = false;

  function teardown(): void {
    const old = handle;
    handle = null;
    if (old?.destroy) {
      try {
        old.destroy();
      } catch (e) {
        // A broken cleanup must not block the next mount.
        console.error(`[deract] cleanup of "${entry.id}" threw`, e);
      }
    }
    el.replaceChildren(); // leave a clean container for the next mount
  }

  return {
    update(args, env) {
      if (destroyed) return;

      const current = handle;
      if (current?.update) {
        const err = attempt(() => current.update?.(args, env));
        if (err) teardown(); // state unknown: next change remounts from scratch
        onError(err);
        return;
      }

      teardown();
      const err = attempt(() => {
        handle = toHandle(entry.mount(el, args, env));
      });
      if (err) teardown();
      onError(err);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      teardown();
    },
  };
}