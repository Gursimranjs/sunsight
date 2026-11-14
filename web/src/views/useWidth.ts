// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Width of an element in CSS pixels, so charts draw 1:1 and their text stays at 14 px on phones.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export function useWidth<T extends HTMLElement>(fallback = 800): [preact.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  const watched = useRef<{ el: T; ro: ResizeObserver | null } | null>(null);
  // Runs after every render: the element may mount later than the component (e.g. after a
  // loading message), and must be measured then, not only on first mount.
  useLayoutEffect(() => {
    const el = ref.current;
    if (watched.current?.el === el) return;
    watched.current?.ro?.disconnect();
    watched.current = null;
    if (!el) return;
    const set = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    ro?.observe(el);
    watched.current = { el, ro };
  });
  useLayoutEffect(() => () => watched.current?.ro?.disconnect(), []);
  return [ref, w];
}
