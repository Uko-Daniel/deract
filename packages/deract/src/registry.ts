import type { Cleanup, Entry } from './types';

export interface Registry {
  add(...entries: Entry<any>[]): Registry;
  get(id: string): Entry<any> | undefined;
  list(): readonly Entry<any>[];
  groups(): ReadonlyMap<string, readonly Entry<any>[]>;
  subscribe(fn: () => void): Cleanup;
}

export function createRegistry(initial: readonly Entry<any>[] = []): Registry {
  const byId = new Map<string, Entry<any>>();
  const listeners = new Set<() => void>();
  // Cached snapshots: the same object is returned until something changes.
  let listSnapshot: readonly Entry<any>[] | null = null;
  let groupSnapshot: ReadonlyMap<string, readonly Entry<any>[]> | null = null;

  const registry: Registry = {
    add(...entries) {
      if (entries.length === 0) return registry;
      for (const entry of entries) byId.set(entry.id, entry); // same id = replace
      listSnapshot = null;
      groupSnapshot = null;
      for (const fn of [...listeners]) fn();
      return registry;
    },

    get: (id) => byId.get(id),

    list() {
      listSnapshot ??= [...byId.values()];
      return listSnapshot;
    },

    groups() {
      if (groupSnapshot) return groupSnapshot;
      const map = new Map<string, Entry<any>[]>();
      for (const entry of registry.list()) {
        const name = entry.group ?? 'Other';
        let bucket = map.get(name);
        if (!bucket) {
          bucket = [];
          map.set(name, bucket);
        }
        bucket.push(entry);
      }
      // Keep "Other" at the bottom of the sidebar.
      const other = map.get('Other');
      if (other) {
        map.delete('Other');
        map.set('Other', other);
      }
      groupSnapshot = map;
      return map;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };

  registry.add(...initial);
  return registry;
}