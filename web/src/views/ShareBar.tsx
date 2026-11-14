// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Copy a link to this exact scenario; download the metrics and the 10-minute series.
import { useState } from 'preact/hooks';
import type { WindowAnswer } from '../engine/compute';
import { download, toCsv, toJson, type ExportContext } from '../export';

export function ShareBar({ answer, ctx }: { answer: WindowAnswer; ctx: ExportContext }) {
  const [copied, setCopied] = useState('');
  const base = `sunsight_${(ctx.site.id ?? 'custom').replace(/[^\w-]/g, '_')}_${ctx.start_utc.slice(0, 10)}`;
  return (
    <section class="card" aria-label="Share and export">
      <h3>Share and export</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => {
          const done = () => setCopied('Link copied.');
          navigator.clipboard?.writeText(ctx.link).then(done, () => setCopied('Copy the address bar to share this view.'))
            ?? setCopied('Copy the address bar to share this view.');
        }}>Copy link</button>
        <button type="button" onClick={() => download(`${base}.csv`, toCsv(answer, ctx), 'text/csv')}>Download CSV</button>
        <button type="button" onClick={() => download(`${base}.json`, toJson(answer, ctx), 'application/json')}>Download JSON</button>
        <span role="status" class="small">{copied}</span>
      </div>
      <p class="small muted" style={{ margin: '6px 0 0' }}>
        The link holds the site, dates, preset, any edited rules, the view and the selected time. Files hold the verdict, every metric shown above and the 10-minute series{ctx.fixture ? ', flagged as fixture data' : ''}.
      </p>
    </section>
  );
}
