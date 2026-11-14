// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// A jargon word with a plain-language explanation on hover and on keyboard focus. Explanations that
// state a rule value are built from the rules in force (RulesContext, provided by the App).
import { createContext, type ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { makeRules, type Rules } from '../engine/light';
import { glossaryText, isGlossaryKey, type GlossaryKey } from './glossary';

/** The rules on screen. Defaults to the build-plan defaults outside a provider. */
export const RulesContext = createContext<Rules>(makeRules());

export function Term({ tip, children }: { tip: GlossaryKey | string; children: ComponentChildren }) {
  const rules = useContext(RulesContext);
  const text = isGlossaryKey(tip) ? glossaryText(tip, rules) : tip;
  return (
    <span class="term" tabIndex={0}>
      {children}
      <span class="tip" role="tooltip">{text}</span>
    </span>
  );
}
