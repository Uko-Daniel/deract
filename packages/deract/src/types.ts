import type { ReactNode } from 'react';

export type Cleanup = () => void;

export type ControlDef =
  | { type: 'text'; default: string; label?: string }
  | { type: 'number'; default: number; min?: number; max?: number; step?: number; label?: string }
  | { type: 'range'; default: number; min: number; max: number; step?: number; label?: string }
  | { type: 'boolean'; default: boolean; label?: string }
  | { type: 'select'; default: string; options: readonly string[]; label?: string }
  | { type: 'color'; default: string; label?: string };

export type Controls = Record<string, ControlDef>;

// Maps ONE control definition to the value type it produces.
type ArgOf<D extends ControlDef> = D extends { type: 'select'; options: readonly (infer O)[] }
  ? O
  : D extends { type: 'text' | 'color' }
    ? string
    : D extends { type: 'number' | 'range' }
      ? number
      : D extends { type: 'boolean' }
        ? boolean
        : never;

// Maps a whole controls object to the args object.
export type ArgsOf<C extends Controls> = { [K in keyof C]: ArgOf<C[K]> };

export interface Env {
  contexts: Readonly<Record<string, string>>;
  viewport: { width: number; height: number };
  document: Document;
  window: Window;
}

interface EntryBase<C extends Controls> {
  id: string;
  title: string;
  group?: string;
  description?: string;
  controls?: C;
  variants?: Record<string, Partial<ArgsOf<C>>>;
  contexts?: string[];
}

export type ReactEntry<C extends Controls> = EntryBase<C> & {
  render: (args: ArgsOf<C>, env: Env) => ReactNode;
  mount?: never;
};

export type MountEntry<C extends Controls> = EntryBase<C> & {
  mount: (
    el: HTMLElement,
    args: ArgsOf<C>,
    env: Env,
  ) => void | Cleanup | { update?(args: ArgsOf<C>, env: Env): void; destroy?(): void };
  render?: never;
};

export type Entry<C extends Controls = Controls> = ReactEntry<C> | MountEntry<C>;