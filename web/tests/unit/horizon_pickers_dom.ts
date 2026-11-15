// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// A very small DOM, just enough for Preact to render the Horizon pickers in Vitest's node environment
// (no jsdom in this project). Elements, text nodes, attributes, events with bubbling, focus.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Listener = (e: any) => void;

class MiniNode {
  nodeType: number;
  parentNode: MiniElement | null = null;
  childNodes: MiniNode[] = [];
  ownerDocument: any;
  constructor(nodeType: number, doc: any) { this.nodeType = nodeType; this.ownerDocument = doc; }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get nextSibling(): MiniNode | null {
    const p = this.parentNode;
    if (!p) return null;
    return p.childNodes[p.childNodes.indexOf(this) + 1] ?? null;
  }
  get parentElement() { return this.parentNode; }
  insertBefore(n: MiniNode, ref: MiniNode | null) {
    if (n.parentNode) n.parentNode.removeChild(n);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n);
    n.parentNode = this as any;
    return n;
  }
  appendChild(n: MiniNode) { return this.insertBefore(n, null); }
  removeChild(n: MiniNode) {
    const i = this.childNodes.indexOf(n);
    if (i >= 0) this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  remove() { this.parentNode?.removeChild(this); }
  contains(n: MiniNode | null): boolean {
    for (let x: MiniNode | null = n; x; x = x.parentNode) if (x === this) return true;
    return false;
  }
  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }
}

class MiniText extends MiniNode {
  data: string;
  constructor(data: string, doc: any) { super(3, doc); this.data = data; }
  get nodeValue() { return this.data; }
  override get textContent() { return this.data; }
}

class MiniElement extends MiniNode {
  localName: string;
  tagName: string;
  namespaceURI: string | null;
  attributes = new Map<string, string>();
  listeners = new Map<string, Listener[]>();
  style: Record<string, any> = { setProperty(k: string, v: string) { (this as any)[k] = v; } };
  // Event-handler properties Preact looks for to lower-case the event name.
  onclick = null; onkeydown = null; oninput = null; onchange = null; onfocus = null; onblur = null;
  onmouseenter = null; onmouseleave = null; onsubmit = null; ontoggle = null;
  value = '';
  checked = false;
  disabled = false;
  open = false;
  constructor(tag: string, doc: any, ns: string | null = null) {
    super(1, doc);
    this.localName = tag;
    this.tagName = tag.toUpperCase();
    this.namespaceURI = ns;
  }
  get children(): MiniElement[] { return this.childNodes.filter((c): c is MiniElement => c instanceof MiniElement); }
  setAttribute(k: string, v: unknown) { this.attributes.set(k, String(v)); }
  getAttribute(k: string) { return this.attributes.has(k) ? this.attributes.get(k)! : null; }
  hasAttribute(k: string) { return this.attributes.has(k); }
  removeAttribute(k: string) { this.attributes.delete(k); }
  setAttributeNS(_ns: string, k: string, v: unknown) { this.setAttribute(k, v); }
  removeAttributeNS(_ns: string, k: string) { this.removeAttribute(k); }
  addEventListener(type: string, f: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), f]); }
  removeEventListener(type: string, f: Listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter((x) => x !== f)); }
  dispatchEvent(e: any) {
    e.target ??= this;
    for (let x: MiniElement | null = this; x && !e._stop; x = x.parentNode as MiniElement | null) {
      e.currentTarget = x;
      for (const f of x.listeners?.get(e.type) ?? []) f.call(x, e);
      if (!e.bubbles) break;
    }
    return !e.defaultPrevented;
  }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  click() { this.dispatchEvent(makeEvent('click')); }
  get className() { return this.getAttribute('class') ?? ''; }
}

export function makeEvent(type: string, init: Record<string, unknown> = {}) {
  const e: any = {
    type, bubbles: init.bubbles ?? true, defaultPrevented: false, _stop: false, ...init,
    preventDefault() { e.defaultPrevented = true; },
    stopPropagation() { e._stop = true; },
  };
  return e;
}

/** Install a fresh document on globalThis; returns it. */
export function installDom() {
  const doc: any = {
    activeElement: null,
    createElement: (t: string) => new MiniElement(t, doc),
    createElementNS: (ns: string, t: string) => new MiniElement(t, doc, ns),
    createTextNode: (d: string) => new MiniText(String(d), doc),
  };
  doc.body = new MiniElement('body', doc);
  doc.activeElement = doc.body;
  const g = globalThis as any;
  g.document = doc;
  g.window ??= g;
  return doc;
}

export type El = MiniElement;

/** Every element under root (document order) that matches the predicate. */
export function findAll(root: any, pred: (el: MiniElement) => boolean): MiniElement[] {
  const out: MiniElement[] = [];
  const walk = (n: MiniNode) => {
    for (const c of n.childNodes) {
      if (c instanceof MiniElement) { if (pred(c)) out.push(c); walk(c); }
    }
  };
  walk(root);
  return out;
}

export const byAttr = (k: string, v?: string) => (el: MiniElement) => (v === undefined ? el.hasAttribute(k) : el.getAttribute(k) === v);
export const byTag = (t: string) => (el: MiniElement) => el.localName === t;
export const text = (el: any) => (el.textContent as string).replace(/\s+/g, ' ').trim();
