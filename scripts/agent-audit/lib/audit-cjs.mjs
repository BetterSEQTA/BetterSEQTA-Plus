import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const reportGate = require('./report-gate.cjs');
const normalizeReport = require('./normalize-report.cjs');
const reportStats = require('./report-stats.cjs');
const agentJson = require('./agent-json.cjs');
const exportForAgent = require('./export-for-agent.cjs');

export const {
  requiresDiscordNotifySecurity,
  requiresDiscordNotifySoc2,
  requiresDiscordNotify,
  chunkDiscordEmbeds,
  isValidDiscordWebhookUrl,
  syncRequiresAction
} = reportGate;

export const { normalizeAuditReport } = normalizeReport;

export const {
  escapeHtml,
  computeDashboardStats,
  computeSecurityStats,
  computeSoc2Stats,
  parseTranscriptJsonl,
  readTranscriptFile,
  buildTimelineEvents,
  computeAgentMetrics,
  healthFromFindings,
  countBySeverity,
  FINDING_ID_RE,
  extractFindingRef,
  collectReportItemIds
} = reportStats;

export const {
  parseAgentJson,
  extractFinishReport,
  displaySummary,
  isJsonLikeSummary,
  prettyJsonString
} = agentJson;

export const {
  normalizeSecurityItem,
  normalizeSoc2Item,
  exportItemPayloadBase64,
  buildAgentExportMeta,
  itemsToAgentMarkdown,
  itemsToAgentJson,
  EXPORT_SCHEMA
} = exportForAgent;
