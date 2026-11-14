// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Width of an element in CSS pixels, so charts draw 1:1 and their text stays at 14 px on phones.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export function useWidth<T extends HTMLElement>(fallback = 800): [preact.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
