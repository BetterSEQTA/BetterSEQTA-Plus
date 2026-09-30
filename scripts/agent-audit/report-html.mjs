import {
  escapeHtml,
  computeDashboardStats,
  displaySummary,
  isJsonLikeSummary,
  prettyJsonString,
  normalizeAuditReport,
  normalizeSecurityItem,
  normalizeSoc2Item,
  exportItemPayloadBase64,
  buildAgentExportMeta,
  itemsToAgentMarkdown,
  itemsToAgentJson
} from './lib/audit-cjs.mjs';

const BRAND = '#007bff';
const RING_TRACK = '#3f3f46';
const BRAND_RGB = '0,123,255';
const DONUT_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#64748b',
  fail: '#ef4444',
  partial: '#eab308',
  pass: '#007bff'
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreColor(score) {
  if (score >= 90) return BRAND;
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function ringSvg(score, label, size = 104, { unknown = false } = {}) {
  if (unknown || score == null || Number.isNaN(Number(score))) {
    const r = (size - 12) / 2;
    const cx = size / 2;
    return `<div class="ring-wrap ring-unknown" title="${escapeHtml(label)}">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${RING_TRACK}" stroke-width="10" stroke-dasharray="4 6"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-size="${size > 120 ? 22 : 18}" font-weight="600">—</text>
    </svg>
    <span class="ring-label">${escapeHtml(label)}</span>
  </div>`;
  }
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp(score, 0, 100) / 100;
  const dash = c * pct;
  const color = scoreColor(score);
  return `<div class="ring-wrap" title="${escapeHtml(label)}">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${RING_TRACK}" stroke-width="10"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${dash} ${c - dash}" stroke-linecap="round"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#fafafa" font-size="${size > 120 ? 28 : 20}" font-weight="600">${Math.round(score)}</text>
    </svg>
    <span class="ring-label">${escapeHtml(label)}</span>
  </div>`;
}

function donutSvg(segments, size = 140) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const frac = seg.value / total;
      const angle = frac * 360;
      const large = angle > 180 ? 1 : 0;
      const start = polar(cx, cy, r, offset);
      offset += angle;
      const end = polar(cx, cy, r, offset);
      const color = DONUT_COLORS[seg.label] || '#64748b';
      if (frac >= 0.999) {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
      }
      return `<path d="M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} L ${cx} ${cy} Z" fill="${color}"/>`;
    })
    .join('');
  const legend = segments
    .map(
      (s) =>
        `<span class="legend-chip"><span class="dot" style="background:${DONUT_COLORS[s.label] || '#64748b'}"></span>${escapeHtml(s.label)} <strong>${s.value}</strong></span>`
    )
    .join('');
  return `<div class="donut-block">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${arcs}<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="var(--card)"/></svg>
    <div class="legend-row">${legend}</div>
  </div>`;
}

function severityBadge(sev) {
  const s = String(sev || 'info').toLowerCase();
  return `<span class="badge badge-sev badge-sev-${escapeHtml(s)}">${escapeHtml(sev || '')}</span>`;
}

function statusBadge(st) {
  const s = String(st || '').toLowerCase();
  return `<span class="badge badge-status badge-status-${escapeHtml(s)}">${escapeHtml(st || '')}</span>`;
}

function securityDetailBlock(f) {
  const scenario = f.scenario || f.exploitOrCrashScenario;
  const fix = f.fix || f.recommendedFix;
  return [
    f.evidence ? `<pre>${escapeHtml(f.evidence)}</pre>` : '',
    scenario ? `<p class="detail-line"><span class="detail-label">Scenario</span> ${escapeHtml(scenario)}</p>` : '',
    fix ? `<p class="detail-line"><span class="detail-label">Fix</span> ${escapeHtml(fix)}</p>` : ''
  ]
    .filter(Boolean)
    .join('');
}

function securityTableRows(findings) {
  if (!findings || !findings.length) return '';
  return findings
    .map((f, i) => {
      const rawId = f.id || `F${i + 1}`;
      const id = escapeHtml(rawId);
      const exportB64 = escapeHtml(exportItemPayloadBase64(normalizeSecurityItem(f, i)));
      const detailId = `detail-${id}`;
      const action =
        f.requiresAction || ['critical', 'high'].includes(String(f.severity || '').toLowerCase())
          ? '<span class="chip chip-warn">action</span>'
          : '';
      const detail = securityDetailBlock(f);
      const loc = f.location ? `<span class="path-pill">${escapeHtml(f.location)}</span>` : '';
      return `<tr data-severity="${escapeHtml(String(f.severity || '').toLowerCase())}" data-id="${id}" class="row-main" data-detail-id="${detailId}" data-export="${exportB64}" tabindex="0">
        <td class="col-chevron"><span class="chevron" aria-hidden="true"></span></td>
        <td><a href="#finding-${id}" id="finding-${id}" class="id-link">${id}</a></td>
        <td>${severityBadge(f.severity)}</td>
        <td>${escapeHtml(f.category || '')}</td>
        <td class="cell-title">${escapeHtml(f.title || '')}</td>
        <td>${loc}</td>
        <td>${escapeHtml(f.confidence || '')}</td>
        <td>${action}</td>
      </tr>
      ${detail ? `<tr class="row-detail" id="${detailId}" hidden><td colspan="8"><div class="detail-panel">${detail}</div></td></tr>` : ''}`;
    })
    .join('');
}

function soc2TableRows(gaps) {
  if (!gaps || !gaps.length) return '';
  return gaps
    .map((g, i) => {
      const rawId = g.id || `G${i + 1}`;
      const id = escapeHtml(rawId);
      const exportB64 = escapeHtml(exportItemPayloadBase64(normalizeSoc2Item(g, i)));
      const detailId = `detail-${id}`;
      const detail = [
        g.evidence ? `<pre>${escapeHtml(g.evidence)}</pre>` : '',
        g.mitigation ? `<p class="detail-line"><span class="detail-label">Mitigation</span> ${escapeHtml(g.mitigation)}</p>` : ''
      ]
        .filter(Boolean)
        .join('');
      return `<tr class="row-main" data-severity="${escapeHtml(String(g.severity || '').toLowerCase())}" data-status="${escapeHtml(String(g.status || '').toLowerCase())}" data-id="${id}" data-detail-id="${detailId}" data-export="${exportB64}" tabindex="0">
        <td class="col-chevron"><span class="chevron" aria-hidden="true"></span></td>
        <td><a href="#gap-${id}" id="gap-${id}" class="id-link">${id}</a></td>
        <td>${escapeHtml(g.criterion || '')}</td>
        <td>${statusBadge(g.status)}</td>
        <td>${severityBadge(g.severity)}</td>
        <td class="cell-title">${escapeHtml(g.title || '')}</td>
        <td>${escapeHtml(g.ownerHint || g.owner || '')}</td>
        <td>${escapeHtml(g.effort || '')}</td>
      </tr>
      ${detail ? `<tr class="row-detail" id="${detailId}" hidden><td colspan="8"><div class="detail-panel">${detail}</div></td></tr>` : ''}`;
    })
    .join('');
}

function itemsTableColgroup(mode) {
  if (mode === 'soc2') {
    return `<colgroup>
      <col style="width:2.25rem" />
      <col style="width:8%" />
      <col style="width:9%" />
      <col style="width:9%" />
      <col style="width:9%" />
      <col style="width:38%" />
      <col style="width:17%" />
      <col style="width:6%" />
    </colgroup>`;
  }
  return `<colgroup>
    <col style="width:2.25rem" />
    <col style="width:8%" />
    <col style="width:10%" />
    <col style="width:11%" />
    <col style="width:34%" />
    <col style="width:18%" />
    <col style="width:10%" />
    <col style="width:7%" />
  </colgroup>`;
}

const TL_ICONS = {
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13h4M10 17h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/>',
  folder: '<path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
  bundle: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2 2-3.3-1 1-3.3 2-2z"/>',
  outbound: '<path d="M5 12h12M13 6l6 6-6 6"/>',
  finish: '<path d="M20 6L9 17l-5-5"/>',
  notable: '<path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  error: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
};

function svgIcon(kind) {
  const paths = TL_ICONS[kind] || TL_ICONS.info;
  return `<svg class="tl-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function parseAssistantJson(content) {
  try {
    const t = String(content || '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(fence ? fence[1].trim() : t);
  } catch {
    return null;
  }
}

function timelineIconKind(ev) {
  if (ev.role === 'error') return 'error';
  if (ev.role === 'system') return 'info';
  if (ev.role === 'tool') {
    const n = ev.name || '';
    if (n === 'read_file') return 'file';
    if (n === 'grep') return 'search';
    if (n === 'list_files') return 'folder';
    if (n === 'read_context_bundle') return 'bundle';
    return 'wrench';
  }
  if (ev.role === 'assistant') {
    if (ev.flagged && ev.findingRef) return 'notable';
    const parsed = parseAssistantJson(ev.content || ev.summary);
    if (parsed?.type === 'finish') return 'finish';
    if (parsed?.type === 'tool') return 'outbound';
    if (ev.flagged) return 'notable';
    return 'message';
  }
  return 'info';
}

function timelineRoleClass(ev) {
  if (ev.role === 'error') return 'tl-role-error';
  if (ev.role === 'tool') return 'tl-role-tool';
  if (ev.role === 'system') return 'tl-role-system';
  return 'tl-role-assistant';
}

function timelineBodyHtml(ev) {
  const summary = escapeHtml(ev.summary || '');
  const raw = String(ev.content || ev.summary || '');
  const looksJson = raw.trim().startsWith('{') && raw.length > 80;
  if (looksJson && ev.role === 'assistant') {
    const compact = escapeHtml(raw.slice(0, 280)) + (raw.length > 280 ? '…' : '');
    return `<p class="tl-summary">${summary}</p><pre class="tl-mono">${compact}</pre>`;
  }
  return `<p class="tl-summary">${summary}</p>`;
}

function timelineHtml(events) {
  if (!events.length) {
    return '<div class="empty-state"><p>No agent transcript events in this report.</p></div>';
  }
  return `<ul class="tl-track">${events
    .map((ev, idx) => {
      const kind = timelineIconKind(ev);
      const icon = svgIcon(kind);
      const roleClass = timelineRoleClass(ev);
      const isLast = idx === events.length - 1;
      const flagBadge = ev.flagged
        ? `<span class="tl-flag">Notable</span>${ev.findingRef ? `<a class="tl-flag-link" href="#" data-goto-findings="${escapeHtml(ev.findingRef)}">${escapeHtml(ev.findingRef)}</a>` : ''}`
        : '';
      return `<li class="tl-node ${isLast ? 'tl-node-last' : ''}">
        <div class="tl-spine">
          <span class="tl-node-icon ${roleClass}">${icon}</span>
        </div>
        <div class="tl-card">
          <div class="tl-meta">
            <span class="tl-turn">Turn ${ev.turn != null ? ev.turn + 1 : '?'}</span>
            <span class="tl-ts">${escapeHtml(ev.ts)}</span>
            ${flagBadge}
          </div>
          ${timelineBodyHtml(ev)}
        </div>
      </li>`;
    })
    .join('')}</ul>`;
}

function formatDuration(ms) {
  if (ms == null) return 'n/a';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function truncate(text, max) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function buildStyles() {
  return `<style>
:root {
  --brand: ${BRAND};
  --brand-dark: #0069d9;
  --bg: #18181b;
  --bg-elevated: #27272a;
  --card: #27272a;
  --card-hover: #3f3f46;
  --border: #3f3f46;
  --border-subtle: #52525b;
  --text: #fafafa;
  --muted: #a1a1aa;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.35);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 15px;
  background: var(--bg);
  color: var(--text);
  line-height: 1.55;
}
.font-display, h1, h2, h3, .section-title { font-family: "DM Sans", "IBM Plex Sans", system-ui, sans-serif; }
.shell { max-width: 1400px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2.5rem) 3rem; }
.site-header {
  width: 100%;
  padding: 1.5rem 0 1rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(0,123,255,0.08) 0%, transparent 100%);
}
.site-header .shell { padding-bottom: 0; }
.header-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; justify-content: space-between; }
.brand-line { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; }
.wordmark { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; color: var(--text); text-decoration: none; }
.wordmark-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); }
.mode-pill { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(0,123,255,0.15); color: var(--brand); border: 1px solid rgba(0,123,255,0.35); }
h1 { margin: 0.35rem 0 0; font-size: 1.5rem; font-weight: 600; }
.header-meta {
  text-align: right;
  color: var(--muted);
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  min-width: 8rem;
}
.header-meta a { color: var(--brand); text-decoration: none; font-weight: 500; }
.header-meta a:hover { text-decoration: underline; }
.chip-incomplete { background: rgba(234,179,8,0.15); color: #fbbf24; border: 1px solid rgba(234,179,8,0.35); }
.incomplete-banner { margin-bottom: 1.25rem; }
.incomplete-banner p { margin: 0.35rem 0 0; font-size: 0.9rem; color: var(--muted); }
.scores-muted .ring-wrap { opacity: 0.55; }
.status-row { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
.status-summary { color: var(--muted); font-size: 0.9rem; max-width: 72ch; line-height: 1.45; }
.prose-summary { margin: 0.25rem 0 0; line-height: 1.65; color: var(--text); max-width: 85ch; }
.tab-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.85rem 0;
  margin-bottom: 1.25rem;
  background: rgba(24,24,27,0.94);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
}
.tab-btn {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.45rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.tab-btn:hover { background: var(--card-hover); color: var(--text); }
.tab-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.tab-btn[aria-selected="true"] {
  background: var(--brand);
  border-color: var(--brand-dark);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 0 1px rgba(${BRAND_RGB}, 0.25);
}
.tab-panel { display: none; animation: fadeIn 0.2s ease; }
.tab-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .tab-panel { animation: none; }
  .tab-btn, .row-main, .tl-card, .filter-chip, .chevron { transition: none; }
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.75rem;
  box-shadow: var(--shadow-sm);
}
.section-title { margin: 0 0 1.1rem; font-size: 1.05rem; font-weight: 600; }
.overview-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.overview-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .overview-grid { grid-template-columns: 1fr 1fr; }
  .scores-span { grid-column: 1 / -1; }
}
.overview-grid .card { margin-bottom: 0; }
.hero-primary { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; padding: 1.15rem 1.35rem; }
.breakdown-card { padding: 1.15rem 1.35rem; display: flex; flex-direction: column; }
.hero-verdict { flex: 1; min-width: 200px; }
.hero-verdict .section-title { margin-bottom: 0.5rem; }
.hero-verdict p { margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.45; }
.breakdown-card .section-title { margin-bottom: 0.65rem; }
.breakdown-card .donut-block { flex: 1; justify-content: flex-start; }
.scores-card { padding: 1rem 1.35rem 1.1rem; }
.scores-card .section-title { margin-bottom: 0.65rem; }
.rings-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  align-items: flex-start;
  gap: 0.75rem 1.25rem;
  padding: 0;
}
@media (min-width: 900px) {
  .rings-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(100px, 1fr));
    justify-content: stretch;
    gap: 0.75rem 1rem;
  }
}
.ring-wrap { text-align: center; min-width: 100px; padding: 0 0.15rem; }
.ring-unknown .ring-label { color: var(--muted); opacity: 0.85; }
.breakdown-unavailable { font-size: 0.875rem; color: var(--muted); line-height: 1.5; }
.breakdown-unavailable p { margin: 0 0 0.5rem; }
.breakdown-unavailable strong { color: var(--text); font-weight: 600; }
.breakdown-unavailable-hint { margin: 0; font-size: 0.82rem; }
.breakdown-unavailable code { font-size: 0.8rem; color: var(--text); }
.alert-structured-missing {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid rgba(234,179,8,0.35);
  background: rgba(234,179,8,0.08);
  font-size: 0.875rem;
  color: var(--muted);
}
.alert-structured-missing strong { color: #fbbf24; }
.ring-label { display: block; font-size: 0.78rem; line-height: 1.3; color: var(--muted); margin-top: 0.35rem; max-width: 10rem; margin-left: auto; margin-right: auto; }
.donut-block { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; justify-content: center; }
.legend-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.legend-chip strong { color: var(--text); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 0;
}
.kpi-tile {
  padding: 1.35rem 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 5.5rem;
}
.kpi-tile strong { display: block; font-size: 1.75rem; color: var(--brand); font-weight: 600; line-height: 1.2; }
.kpi-tile span { font-size: 0.8rem; color: var(--muted); margin-top: 0.45rem; }
.summary-card { padding: 1.5rem 1.75rem 1.75rem; margin-bottom: 0; }
.summary-card p { margin: 0.25rem 0 0; line-height: 1.65; color: var(--text); max-width: 85ch; }
.chip { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
.chip-ok { background: rgba(${BRAND_RGB}, 0.18); color: #93c5fd; border: 1px solid rgba(${BRAND_RGB}, 0.4); }
.chip-warn { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.35); }
.filter-bar {
  position: sticky;
  top: 3.25rem;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.search-wrap { flex: 1; min-width: 200px; position: relative; }
.search-wrap input {
  width: 100%;
  padding: 0.5rem 0.65rem 0.5rem 2rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
.search-wrap::before {
  content: "";
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid var(--muted);
  border-radius: 50%;
  opacity: 0.7;
}
.filter-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.filter-chip {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--muted);
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.filter-chip:hover { background: var(--card-hover); color: var(--text); }
.filter-chip[data-active="true"] { background: rgba(${BRAND_RGB}, 0.18); color: #93c5fd; border-color: var(--brand); }
.export-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  align-items: center;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.export-label { font-weight: 600; font-size: 0.875rem; color: var(--text); }
.export-hint { font-size: 0.8rem; color: var(--muted); flex: 1; min-width: 12rem; }
.export-btn {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  transition: background 0.15s, border-color 0.15s;
}
.export-btn:hover { background: var(--card-hover); border-color: var(--brand); color: var(--text); }
.export-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.export-btn-primary { background: rgba(${BRAND_RGB}, 0.12); border-color: rgba(${BRAND_RGB}, 0.45); }
.export-btn-primary:hover { background: rgba(${BRAND_RGB}, 0.22); }
.export-status { font-size: 0.8rem; color: var(--brand); min-width: 6rem; }
.filter-clear {
  flex-shrink: 0;
  min-width: 5.75rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--brand);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  padding: 0.35rem 0.25rem;
  white-space: nowrap;
}
.filter-clear.is-inactive { visibility: hidden; pointer-events: none; }
.table-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: auto;
  max-height: 70vh;
  box-shadow: var(--shadow-sm);
  background: var(--card);
}
#items-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.875rem;
}
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--card-hover);
  color: var(--muted);
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border-subtle); vertical-align: top; }
#items-table .cell-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.45;
}
#items-table tr.row-main.is-open .cell-title {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
}
.row-main { cursor: pointer; transition: background 0.15s; }
.row-main:hover { background: rgba(${BRAND_RGB}, 0.06); }
.row-main.is-open { background: rgba(${BRAND_RGB}, 0.1); }
.col-chevron { width: 2rem; color: var(--muted); }
.chevron {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.2s;
}
.row-main.is-open .chevron { transform: rotate(45deg); }
.row-detail td {
  padding: 0;
  background: var(--bg-elevated);
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
}
.detail-panel {
  margin: 0;
  padding: 1rem 1.25rem;
  border-left: 3px solid var(--brand);
  background: var(--bg-elevated);
  max-width: 100%;
  overflow-x: auto;
  line-height: 1.55;
}
.detail-panel pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0.35rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  max-height: min(28rem, 50vh);
  overflow: auto;
}
.detail-label { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 0.15rem; }
.detail-line { margin: 0.65rem 0 0; }
pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
.badge { display: inline-block; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.badge-sev-critical, .badge-sev-high { background: rgba(239,68,68,0.2); color: #f87171; }
.badge-sev-medium { background: rgba(234,179,8,0.2); color: #fbbf24; }
.badge-sev-low { background: rgba(59,130,246,0.2); color: #93c5fd; }
.badge-sev-info { background: rgba(100,116,139,0.25); color: #94a3b8; }
.badge-status-fail { background: rgba(239,68,68,0.2); color: #f87171; }
.badge-status-partial { background: rgba(234,179,8,0.2); color: #fbbf24; }
.badge-status-pass { background: rgba(${BRAND_RGB}, 0.18); color: #93c5fd; }
.path-pill {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
}
.id-link { font-weight: 600; text-decoration: none; }
a { color: var(--brand); }
a:hover { color: var(--brand-dark); }
.empty-state {
  text-align: center;
  padding: 2.5rem 1.5rem;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
}
.empty-state p { margin: 0 0 0.5rem; }
.empty-hint { font-size: 0.85rem; max-width: 42ch; margin: 0 auto !important; }
.tl-track {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}
.tl-track::before {
  content: "";
  position: absolute;
  left: 21px;
  top: 16px;
  bottom: 16px;
  width: 2px;
  background: var(--border);
  z-index: 0;
}
.tl-node {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  position: relative;
}
.tl-node-last { margin-bottom: 0; }
.tl-spine {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.tl-node-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 2px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.tl-role-assistant { border-color: var(--brand); color: var(--brand); }
.tl-role-tool { border-color: #3b82f6; color: #60a5fa; }
.tl-role-error { border-color: #ef4444; color: #f87171; }
.tl-role-system { border-color: #64748b; color: #94a3b8; }
.tl-card {
  flex: 1;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tl-card:hover { border-color: rgba(${BRAND_RGB}, 0.35); box-shadow: var(--shadow-sm); }
.tl-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.75rem; color: var(--muted); margin-bottom: 0.35rem; }
.tl-turn { font-weight: 600; color: var(--text); }
.tl-flag {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(234,179,8,0.2);
  color: #fbbf24;
}
.tl-flag-link { font-size: 0.75rem; margin-left: 0.25rem; }
.tl-summary { margin: 0; font-size: 0.9rem; }
.tl-mono {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border-subtle);
  max-height: 120px;
  overflow: auto;
}
.alert {
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.35);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}
.json-block {
  max-height: 480px;
  overflow: auto;
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  font-size: 0.8rem;
}
details { margin-top: 1rem; }
details summary { cursor: pointer; color: var(--brand); font-weight: 500; padding: 0.35rem 0; }
</style>`;
}

function buildHead(title) {
  return `<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
${buildStyles()}
</head>`;
}

function buildStatusChip(report) {
  if (report.llmError) {
    return '<span class="chip chip-incomplete">Incomplete audit</span>';
  }
  if (report.requiresAction) {
    return '<span class="chip chip-warn">Requires action</span>';
  }
  return '<span class="chip chip-ok">Clear</span>';
}

function buildIncompleteBanner(report) {
  if (!report.llmError) return '';
  const msg = escapeHtml(report.llmError.message || 'LLM error');
  return `<div class="alert incomplete-banner" role="alert">
    <strong class="font-display">Audit incomplete</strong>
    <p>${msg}. Scores and gap tables may be empty. Use the Agent run tab and transcript for work completed before the failure.</p>
  </div>`;
}

function donutSegmentTotal(segments) {
  return (segments || []).reduce((sum, seg) => sum + (seg.value || 0), 0);
}

function buildStructuredMissingBanner(mode, report) {
  if (mode === 'soc2' && report.structuredGapsMissing) {
    const rec = report.structuredGapsRecovered
      ? ' Some gap rows were recovered from truncated JSON.'
      : '';
    return `<div class="alert-structured-missing" role="status">
      <strong>Structured gaps missing</strong>
      <p class="breakdown-unavailable-hint">The summary and posture describe issues, but the saved report has no usable <code>gaps</code> array.${rec} See Executive summary and Raw, or re-run the audit.</p>
    </div>`;
  }
  if (mode === 'security' && report.structuredFindingsMissing) {
    return `<div class="alert-structured-missing" role="status">
      <strong>Structured findings missing</strong>
      <p class="breakdown-unavailable-hint">The summary mentions findings, but the saved report has no usable <code>findings</code> array. See Executive summary and Raw, or re-run the audit.</p>
    </div>`;
  }
  return '';
}

function buildBreakdownChart(mode, report, stats) {
  const segments = stats.donut?.segments || [];
  const total = donutSegmentTotal(segments);
  if (mode === 'soc2' && report.structuredGapsMissing) {
    const posture = escapeHtml(String(report.overallPosture || 'unknown'));
    return `<div class="breakdown-unavailable" role="status">
      <p><strong>Gap counts unavailable</strong></p>
      <p class="breakdown-unavailable-hint">Posture is <strong>${posture}</strong>. Fail, partial, and pass counts need a populated <code>gaps</code> array in the model finish JSON.</p>
    </div>`;
  }
  if (mode === 'security' && report.structuredFindingsMissing) {
    return `<div class="breakdown-unavailable" role="status">
      <p><strong>Severity breakdown unavailable</strong></p>
      <p class="breakdown-unavailable-hint">Finding counts need a populated <code>findings</code> array in the finish JSON.</p>
    </div>`;
  }
  if (total === 0 && mode === 'soc2') {
    return `<div class="breakdown-unavailable" role="status"><p>No fail, partial, or pass gaps were recorded in this report.</p></div>`;
  }
  return donutSvg(segments);
}

function buildExecutiveSummaryHtml(report) {
  const raw = String(report.summary || '');
  const prose = escapeHtml(displaySummary(report));
  if (isJsonLikeSummary(report)) {
    const pretty = prettyJsonString(raw);
    if (pretty) {
      return `<p class="prose-summary">${prose}</p>
        <details class="json-details">
          <summary>Structured finish payload (formatted)</summary>
          <pre class="json-block">${escapeHtml(pretty)}</pre>
        </details>`;
    }
  }
  return `<p class="prose-summary">${prose}</p>`;
}

function buildHeader(mode, report, runUrl, generatedAt) {
  const title = mode === 'soc2' ? 'SOC 2 audit dashboard' : 'Security audit dashboard';
  const modeLabel = mode === 'soc2' ? 'SOC 2' : 'Security';
  const statusChip = buildStatusChip(report);
  const shortSummary = escapeHtml(truncate(displaySummary(report), 140));
  const metaLink = runUrl
    ? `<a href="${escapeHtml(runUrl)}" rel="noopener">CI run</a>`
    : `<span>Local preview or CI artifact</span>`;
  const timeLine = generatedAt ? `<span class="header-ts">${escapeHtml(generatedAt)}</span>` : '';
  return `<header class="site-header">
  <div class="shell">
  <div class="header-row">
    <div>
      <div class="brand-line">
        <span class="wordmark font-display"><span class="wordmark-dot"></span> BetterSEQTA+</span>
        <span class="mode-pill">${escapeHtml(modeLabel)}</span>
      </div>
      <h1 class="font-display">${escapeHtml(title)}</h1>
    </div>
    <div class="header-meta">${metaLink}${timeLine}</div>
  </div>
  <div class="status-row">${statusChip}<span class="status-summary">${shortSummary}</span></div>
  </div>
</header>`;
}

function buildOverviewPanel(mode, report, stats, metrics) {
  const rings = stats.rings || [];
  const primary = rings[0];
  const secondary = rings.slice(1);
  const heroRing = primary
    ? ringSvg(primary.score, primary.label, 140, { unknown: primary.unknown })
    : '';
  const secondaryRings = secondary
    .map((r) => ringSvg(r.score, r.label, 104, { unknown: r.unknown }))
    .join('');
  const donut = buildBreakdownChart(mode, report, stats);
  const verdict = escapeHtml(truncate(displaySummary(report), 120));

  const kpiExtra =
    mode === 'soc2'
      ? `<div class="kpi-tile"><strong>${escapeHtml(String(stats.overallPosture || report.overallPosture || '—'))}</strong><span>posture</span></div>`
      : `<div class="kpi-tile"><strong>${stats.totalFindings ?? 0}</strong><span>findings</span></div>`;

  const incomplete = buildIncompleteBanner(report);
  const structuredMissing = buildStructuredMissingBanner(mode, report);
  const scoresClass = report.llmError
    ? 'card scores-card scores-span scores-muted'
    : 'card scores-card scores-span';
  const scoresMuted =
    report.llmError || stats.gapsUnknown || stats.findingsUnknown ? ' scores-muted' : '';

  return `<section id="panel-overview" class="tab-panel active" role="tabpanel">
    <div class="overview-stack">
    ${incomplete}
    ${structuredMissing}
    <div class="overview-grid">
      <div class="card hero-primary">
        ${heroRing}
        <div class="hero-verdict">
          <h2 class="section-title font-display">Overall</h2>
          <p>${verdict}</p>
        </div>
      </div>
      <div class="card breakdown-card">
        <h2 class="section-title font-display">Breakdown</h2>
        ${donut}
      </div>
      <div class="${scoresClass}${scoresMuted}">
        <h2 class="section-title font-display">Scores${report.llmError ? ' <span style="font-weight:400;color:var(--muted);font-size:0.85rem">(no structured report)</span>' : stats.gapsUnknown || stats.findingsUnknown ? ' <span style="font-weight:400;color:var(--muted);font-size:0.85rem">(partial data)</span>' : ''}</h2>
        <div class="rings-grid">${secondaryRings}</div>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-tile"><strong>${metrics.turnsUsed ?? '—'}</strong><span>turns</span></div>
      <div class="kpi-tile"><strong>${metrics.toolCalls ?? 0}</strong><span>tool calls</span></div>
      <div class="kpi-tile"><strong>${formatDuration(metrics.durationMs)}</strong><span>wall time</span></div>
      ${kpiExtra}
    </div>
    <div class="card summary-card">
      <h2 class="section-title font-display">Executive summary</h2>
      ${buildExecutiveSummaryHtml(report)}
    </div>
    </div>
  </section>`;
}

function severityChips(mode) {
  if (mode === 'soc2') {
    return ['critical', 'high', 'medium', 'low', 'info']
      .map((s) => `<button type="button" class="filter-chip" data-filter="severity" data-value="${s}">${s}</button>`)
      .concat(
        ['fail', 'partial', 'pass'].map(
          (s) => `<button type="button" class="filter-chip" data-filter="status" data-value="${s}">${s}</button>`
        )
      )
      .join('');
  }
  return ['critical', 'high', 'medium', 'low', 'info']
    .map((s) => `<button type="button" class="filter-chip" data-filter="severity" data-value="${s}">${s}</button>`)
    .join('');
}

function buildFindingsPanel(mode, report, exportMeta) {
  const items = mode === 'soc2' ? report.gaps : report.findings;
  const empty = !items || !items.length;
  const exportMetaJson = escapeHtml(
    JSON.stringify(buildAgentExportMeta(mode, report, exportMeta)).replace(/</g, '\\u003c')
  );
  const tableHead =
    mode === 'soc2'
      ? `${itemsTableColgroup('soc2')}<thead><tr><th></th><th>ID</th><th>Criterion</th><th>Status</th><th>Severity</th><th>Title</th><th>Owner</th><th>Effort</th></tr></thead><tbody>${soc2TableRows(items)}</tbody>`
      : `${itemsTableColgroup('security')}<thead><tr><th></th><th>ID</th><th>Severity</th><th>Category</th><th>Title</th><th>Location</th><th>Confidence</th><th></th></tr></thead><tbody>${securityTableRows(items)}</tbody>`;
  let emptyBlock;
  if (report.llmError && empty) {
    emptyBlock = `<div class="empty-state"><p>Audit stopped before gaps were saved to the report.</p><p class="empty-hint">Check the Agent run tab for tools and turns completed earlier in the job.</p></div>`;
  } else if (empty && mode === 'soc2' && report.structuredGapsMissing) {
    emptyBlock = `<div class="empty-state"><p>Structured gaps were not saved.</p><p class="empty-hint">The executive summary may still list issues. Open Raw for the full model payload or re-run the audit with a finish JSON that includes a <code>gaps</code> array.</p></div>`;
  } else if (empty && mode === 'security' && report.structuredFindingsMissing) {
    emptyBlock = `<div class="empty-state"><p>Structured findings were not saved.</p><p class="empty-hint">See Executive summary and Raw, or re-run the audit.</p></div>`;
  } else if (empty) {
    const emptyMsg = mode === 'soc2' ? 'No gaps in this report.' : 'No findings in this report.';
    emptyBlock = `<div class="empty-state"><p>${emptyMsg}</p></div>`;
  } else {
    emptyBlock = `<div class="table-card"><table id="items-table">${tableHead}</table></div>`;
  }
  const tableBlock = emptyBlock;
  const findingsBanner =
    (report.llmError ? buildIncompleteBanner(report) : '') +
    buildStructuredMissingBanner(mode, report);

  const exportBar = empty
    ? ''
    : `<div class="export-bar" id="findings-export-bar">
      <span class="export-label font-display">Export for agent</span>
      <span class="export-hint" id="export-count-hint">Matches table filters (severity, status, search). No severity selected exports all visible rows.</span>
      <button type="button" class="export-btn export-btn-primary" id="export-copy-md">Copy markdown</button>
      <button type="button" class="export-btn" id="export-dl-md">Download .md</button>
      <button type="button" class="export-btn" id="export-dl-json">Download .json</button>
      <span class="export-status" id="export-status" role="status" aria-live="polite"></span>
    </div>
    <script type="application/json" id="audit-export-meta">${exportMetaJson}</script>`;

  return `<section id="panel-findings" class="tab-panel" role="tabpanel">
    ${findingsBanner}
    <div class="filter-bar">
      <div class="search-wrap"><input type="search" id="filter-search" placeholder="Search…" aria-label="Search"/></div>
      <button type="button" class="filter-clear is-inactive" id="filter-clear">Clear filters</button>
      <div class="filter-chips" id="severity-chips">${severityChips(mode)}</div>
      <label class="filter-action-label"><input type="checkbox" id="filter-action"/> Action only</label>
    </div>
    ${exportBar}
    ${tableBlock}
  </section>`;
}

function buildAgentPanel(metrics, events) {
  return `<section id="panel-agent" class="tab-panel" role="tabpanel">
    <div class="kpi-grid" style="margin-bottom:1rem">
      <div class="kpi-tile"><strong>${metrics.turnsUsed ?? '—'}</strong><span>turns</span></div>
      <div class="kpi-tile"><strong>${metrics.toolCalls ?? 0}</strong><span>tools</span></div>
      <div class="kpi-tile"><strong>${metrics.parseRetries ?? 0}</strong><span>parse retries</span></div>
      <div class="kpi-tile"><strong>${metrics.errors ?? 0}</strong><span>errors</span></div>
    </div>
    ${timelineHtml(events)}
  </section>`;
}

function buildRawPanel(report) {
  const rawJson = escapeHtml(JSON.stringify(report, null, 2));
  const limitations = (report.limitations || []).map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const strengths = (report.strengths || []).map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const attestation = (report.attestationNeeded || []).map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const llmErr = report.llmError
    ? `<div class="alert" role="alert"><strong>LLM error</strong><p style="margin:0.35rem 0 0">${escapeHtml(report.llmError.message || '')}</p></div>`
    : '';
  let reasoningBlock = '';
  if (report.llmError?.bodyPreview) {
    try {
      const parsed = JSON.parse(report.llmError.bodyPreview);
      const rc = parsed?.choices?.[0]?.message?.reasoning_content;
      if (rc) {
        reasoningBlock = `<details class="card"><summary>Model reasoning (not used as audit output)</summary><pre class="json-block">${escapeHtml(String(rc))}</pre></details>`;
      }
    } catch {
      /* not JSON */
    }
  }

  return `<section id="panel-raw" class="tab-panel" role="tabpanel">
    ${llmErr}
    ${reasoningBlock}
    ${limitations ? `<div class="card"><h3 class="section-title font-display">Limitations</h3><ul>${limitations}</ul></div>` : ''}
    ${strengths ? `<div class="card"><h3 class="section-title font-display">Strengths</h3><ul>${strengths}</ul></div>` : ''}
    ${attestation ? `<div class="card"><h3 class="section-title font-display">Attestation needed</h3><ul>${attestation}</ul></div>` : ''}
    ${report.rawAssistantOutput ? `<details class="card"><summary>Raw assistant output</summary><pre class="json-block">${escapeHtml(prettyJsonString(report.rawAssistantOutput) || report.rawAssistantOutput)}</pre></details>` : ''}
    <details class="card"><summary>Report JSON</summary><pre class="json-block">${rawJson}</pre></details>
  </section>`;
}

function buildScript(exportMode) {
  const mdFn = itemsToAgentMarkdown.toString();
  const jsonFn = itemsToAgentJson.toString();
  const modeLiteral = JSON.stringify(exportMode);
  return `<script>
(function(){
  var exportMode = ${modeLiteral};
  var itemsToAgentMarkdown = ${mdFn};
  var itemsToAgentJson = ${jsonFn};
  var tabs = document.querySelectorAll('.tab-btn');
  var panels = {
    overview: document.getElementById('panel-overview'),
    findings: document.getElementById('panel-findings'),
    agent: document.getElementById('panel-agent'),
    raw: document.getElementById('panel-raw')
  };
  tabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      var id = btn.getAttribute('data-tab');
      tabs.forEach(function(b){ b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
      Object.keys(panels).forEach(function(k){ if (panels[k]) panels[k].classList.toggle('active', k === id); });
    });
  });
  document.querySelectorAll('[data-goto-findings]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var ref = a.getAttribute('data-goto-findings');
      document.querySelector('[data-tab="findings"]').click();
      setTimeout(function(){
        var target = document.getElementById('finding-' + ref) || document.getElementById('gap-' + ref);
        if (target) {
          var row = target.closest('tr');
          if (row && row.dataset.detailId) toggleDetail(row);
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    });
  });
  function toggleDetail(row){
    var id = row.getAttribute('data-detail-id');
    if (!id) return;
    var detail = document.getElementById(id);
    if (!detail) return;
    var open = !row.classList.contains('is-open');
    row.classList.toggle('is-open', open);
    detail.hidden = !open;
  }
  document.querySelectorAll('#items-table tbody tr.row-main').forEach(function(row){
    row.addEventListener('click', function(){ toggleDetail(row); });
    row.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetail(row); }
    });
  });
  var search = document.getElementById('filter-search');
  var actionOnly = document.getElementById('filter-action');
  var clearBtn = document.getElementById('filter-clear');
  var activeSeverity = new Set();
  var activeStatus = new Set();
  document.querySelectorAll('.filter-chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      var kind = chip.getAttribute('data-filter');
      var val = chip.getAttribute('data-value');
      var set = kind === 'status' ? activeStatus : activeSeverity;
      if (set.has(val)) { set.delete(val); chip.setAttribute('data-active', 'false'); }
      else { set.add(val); chip.setAttribute('data-active', 'true'); }
      applyFilter();
    });
  });
  function updateClear(){
    var any = activeSeverity.size || activeStatus.size || (search && search.value) || (actionOnly && actionOnly.checked);
    if (clearBtn) clearBtn.classList.toggle('is-inactive', !any);
  }
  if (clearBtn) clearBtn.addEventListener('click', function(){
    activeSeverity.clear(); activeStatus.clear();
    document.querySelectorAll('.filter-chip').forEach(function(c){ c.setAttribute('data-active', 'false'); });
    if (search) search.value = '';
    if (actionOnly) actionOnly.checked = false;
    applyFilter();
  });
  function applyFilter(){
    var q = (search && search.value || '').toLowerCase();
    var act = actionOnly && actionOnly.checked;
    document.querySelectorAll('#items-table tbody tr.row-main').forEach(function(tr){
      var text = tr.textContent.toLowerCase();
      var sev = (tr.getAttribute('data-severity') || '').toLowerCase();
      var st = (tr.getAttribute('data-status') || '').toLowerCase();
      var show = (!q || text.indexOf(q) >= 0);
      if (act && !text.includes('action')) show = false;
      if (activeSeverity.size && !activeSeverity.has(sev)) show = false;
      if (activeStatus.size && !activeStatus.has(st)) show = false;
      tr.style.display = show ? '' : 'none';
      var id = tr.getAttribute('data-detail-id');
      var detail = id ? document.getElementById(id) : null;
      if (detail) detail.style.display = show && !detail.hidden ? '' : 'none';
      if (!show) { tr.classList.remove('is-open'); if (detail) detail.hidden = true; }
    });
    updateClear();
    updateExportHint();
  }
  if (search) search.addEventListener('input', applyFilter);
  if (actionOnly) actionOnly.addEventListener('change', applyFilter);

  function readExportMeta(){
    var el = document.getElementById('audit-export-meta');
    if (!el) return { mode: exportMode };
    try { return JSON.parse(el.textContent); } catch (e) { return { mode: exportMode }; }
  }
  function visibleExportItems(){
    var items = [];
    document.querySelectorAll('#items-table tbody tr.row-main').forEach(function(tr){
      if (tr.style.display === 'none') return;
      var b64 = tr.getAttribute('data-export');
      if (!b64) return;
      try { items.push(JSON.parse(atob(b64))); } catch (e) { /* skip */ }
    });
    return items;
  }
  function updateExportHint(){
    var hint = document.getElementById('export-count-hint');
    if (!hint) return;
    var n = visibleExportItems().length;
    hint.textContent = n + ' item(s) match current filters. Use severity chips to narrow the export.';
  }
  function setExportStatus(msg){
    var st = document.getElementById('export-status');
    if (st) st.textContent = msg || '';
  }
  function exportBasename(){
    return exportMode === 'soc2' ? 'betterseqta-soc2-gaps' : 'betterseqta-security-findings';
  }
  function downloadBlob(filename, mime, text){
    var blob = new Blob([text], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 500);
  }
  function runExport(kind){
    var items = visibleExportItems();
    if (!items.length) {
      setExportStatus('Nothing to export.');
      return;
    }
    var meta = readExportMeta();
    var mode = meta.mode || exportMode;
    if (kind === 'md') {
      var md = itemsToAgentMarkdown(mode, meta, items);
      downloadBlob(exportBasename() + '-agent.md', 'text/markdown;charset=utf-8', md);
      setExportStatus('Downloaded markdown.');
    } else if (kind === 'json') {
      var json = itemsToAgentJson(meta, items);
      downloadBlob(exportBasename() + '-agent.json', 'application/json;charset=utf-8', json);
      setExportStatus('Downloaded JSON.');
    } else if (kind === 'copy') {
      var body = itemsToAgentMarkdown(mode, meta, items);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(function(){
          setExportStatus('Copied markdown.');
        }).catch(function(){
          setExportStatus('Copy failed.');
        });
      } else {
        setExportStatus('Clipboard unavailable.');
      }
    }
  }
  var copyMd = document.getElementById('export-copy-md');
  var dlMd = document.getElementById('export-dl-md');
  var dlJson = document.getElementById('export-dl-json');
  if (copyMd) copyMd.addEventListener('click', function(){ runExport('copy'); });
  if (dlMd) dlMd.addEventListener('click', function(){ runExport('md'); });
  if (dlJson) dlJson.addEventListener('click', function(){ runExport('json'); });
  updateExportHint();
})();
</script>`;
}

export function reportToHtml(mode, report, meta = {}) {
  report = normalizeAuditReport(mode, report);
  const stats = meta.recomputeStats === false ? meta.stats || {} : computeDashboardStats(mode, report);
  const metrics = meta.metrics || {};
  const events = meta.timelineEvents || [];
  const runUrl = meta.runUrl || '';
  const generatedAt = meta.generatedAt || new Date().toISOString();
  const title = mode === 'soc2' ? 'SOC 2 audit dashboard' : 'Security audit dashboard';
  const findingsLabel = mode === 'soc2' ? 'Gaps' : 'Findings';

  return `<!DOCTYPE html>
<html lang="en">
${buildHead(title)}
<body>
${buildHeader(mode, report, runUrl, generatedAt)}
<main class="shell">
  <div class="tab-bar" role="tablist">
    <button type="button" class="tab-btn" role="tab" aria-selected="true" data-tab="overview">Overview</button>
    <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="findings">${findingsLabel}</button>
    <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="agent">Agent run</button>
    <button type="button" class="tab-btn" role="tab" aria-selected="false" data-tab="raw">Raw</button>
  </div>
  ${buildOverviewPanel(mode, report, stats, metrics)}
  ${buildFindingsPanel(mode, report, { generatedAt, runUrl, summary: displaySummary(report) })}
  ${buildAgentPanel(metrics, events)}
  ${buildRawPanel(report)}
</main>
${buildScript(mode)}
</body>
</html>`;
}
