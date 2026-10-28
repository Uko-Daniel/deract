import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Entry } from '../types';

export type Groups = ReadonlyMap<string, readonly Entry<any>[]>;

export function filterGroups(
  groups: Groups,
  query: string,
): [string, readonly Entry<any>[]][] {
  const q = query.trim().toLowerCase();
  const out: [string, readonly Entry<any>[]][] = [];
  for (const [name, entries] of groups) {
    const hits =
      q === ''
        ? entries
        : entries.filter((e) => `${e.title} ${e.id} ${name}`.toLowerCase().includes(q));
    if (hits.length > 0) out.push([name, hits]);
  }
  return out;
}

export interface SidebarProps {
  groups: Groups;
  selectedId?: string;
  onSelect(id: string): void;
}

export function Sidebar({ groups, selectedId, onSelect }: SidebarProps) {
  const uid = useId();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = useMemo(() => filterGroups(groups, query), [groups, query]);

  // "/" focuses search when the user is not typing somewhere else.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const t = event.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const nav = e.currentTarget;
    const search = nav.querySelector<HTMLElement>('[data-dct-search]');
    const items = Array.from(nav.querySelectorAll<HTMLElement>('[data-dct-item]'));
    const stops = search ? [search, ...items] : items;
    const at = stops.indexOf(e.target as HTMLElement);
    if (at === -1) return;
    const onSearch = e.target === search;

    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(at + 1, stops.length - 1);
    else if (e.key === 'ArrowUp' && !onSearch) next = Math.max(at - 1, 0);
    else if (e.key === 'Home' && !onSearch) next = search ? 1 : 0;
    else if (e.key === 'End' && !onSearch) next = stops.length - 1;
    if (next === -1) return;

    e.preventDefault();
    stops[next]?.focus();
  }

  return (
    <nav className="dct-sidebar" aria-label="Components" onKeyDown={onKeyDown}>
      <div className="dct-search">
        <label className="dct-sr-only" htmlFor={`${uid}-search`}>
          Search components
        </label>
        <input
          ref={searchRef}
          id={`${uid}-search`}
          data-dct-search=""
          className="dct-search-input"
          type="search"
          autoComplete="off"
          placeholder="Search components… ( / )"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.map(([name, entries], i) => (
        <section key={name} className="dct-group" aria-labelledby={`${uid}-g${i}`}>
          <h2 className="dct-group-title" id={`${uid}-g${i}`}>
            {name}
          </h2>
          <ul className="dct-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  data-dct-item=""
                  className="dct-item"
                  aria-current={entry.id === selectedId ? 'true' : undefined}
                  onClick={() => onSelect(entry.id)}
                >
                  {entry.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {visible.length === 0 ? (
        <p className="dct-empty" role="status">
          {groups.size === 0 ? 'No components registered yet.' : 'No matching components.'}
        </p>
      ) : null}
    </nav>
  );
}