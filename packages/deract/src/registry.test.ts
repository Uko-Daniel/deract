import { describe, it, expect, vi } from 'vitest';
import { createRegistry } from './registry';
import { defineComponent } from './define-component';

const make = (id: string, group?: string) =>
  defineComponent({ id, title: id, group, render: () => null });

describe('registry', () => {
  it('adds and gets entries, in insertion order', () => {
    const r = createRegistry([make('a')]);
    r.add(make('b'), make('c'));
    expect(r.list().map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(r.get('b')?.id).toBe('b');
    expect(r.get('nope')).toBeUndefined();
  });

  it('replaces an entry with the same id and keeps its position', () => {
    const r = createRegistry([make('a'), make('b')]);
    const newer = defineComponent({ id: 'a', title: 'Newer', render: () => null });
    r.add(newer);
    expect(r.list()).toHaveLength(2);
    expect(r.list()[0]).toBe(newer);
  });

  it('groups entries and puts ungrouped ones under "Other" last', () => {
    const r = createRegistry([make('x'), make('b', 'Primitives'), make('c', 'Layout')]);
    expect([...r.groups().keys()]).toEqual(['Primitives', 'Layout', 'Other']);
    expect(r.groups().get('Other')?.map((e) => e.id)).toEqual(['x']);
  });

  it('notifies subscribers once per add, and stops after unsubscribe', () => {
    const r = createRegistry();
    const fn = vi.fn();
    const off = r.subscribe(fn);
    r.add(make('a'), make('b'));
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    r.add(make('c'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns stable snapshots until something changes', () => {
    const r = createRegistry([make('a')]);
    expect(r.list()).toBe(r.list());
    expect(r.groups()).toBe(r.groups());
    const before = r.list();
    r.add(make('b'));
    expect(r.list()).not.toBe(before);
  });
});