export function reportToMarkdown(mode, report) {
  const lines = [];
  lines.push(`# ${mode === 'soc2' ? 'SOC2 weekly' : 'Security'} audit report`);
  lines.push('');
  lines.push(`**Requires action:** ${report.requiresAction ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(report.summary || '(none)');
  lines.push('');

  if (mode === 'soc2') {
    lines.push(`**Overall posture:** ${report.overallPosture || 'unknown'}`);
    lines.push('');
    if (Array.isArray(report.strengths) && report.strengths.length) {
      lines.push('## Strengths');
      for (const s of report.strengths) lines.push(`- ${s}`);
      lines.push('');
    }
    lines.push('## Gaps');
    lines.push('');
    for (const g of report.gaps || []) {
      lines.push(`### ${g.id || ''}: ${g.title || ''}`);
      lines.push(`- Severity: ${g.severity}, Status: ${g.status}, Criterion: ${g.criterion} ${g.criterionTitle || ''}`);
      lines.push(`- Location: ${g.location || ''}`);
      lines.push(`- Evidence: ${g.evidence || ''}`);
      if (g.failureDescription) lines.push(`- Failure: ${g.failureDescription}`);
      if (Array.isArray(g.mitigationSteps)) {
        lines.push('- Mitigation:');
        for (const step of g.mitigationSteps) lines.push(`  1. ${step}`);
      }
      lines.push('');
    }
    if (Array.isArray(report.attestationNeeded) && report.attestationNeeded.length) {
      lines.push('## Attestation needed');
      for (const a of report.attestationNeeded) lines.push(`- ${a}`);
      lines.push('');
    }
  } else {
    lines.push('## Findings');
    lines.push('');
    for (const f of report.findings || []) {
      lines.push(`### ${f.id || ''}: ${f.title || ''}`);
      lines.push(`- Severity: ${f.severity}, Category: ${f.category}, Confidence: ${f.confidence || ''}`);
      lines.push(`- Location: ${f.location || ''}`);
      lines.push(`- Evidence: ${f.evidence || ''}`);
      if (f.exploitOrCrashScenario) lines.push(`- Scenario: ${f.exploitOrCrashScenario}`);
      if (f.recommendedFix) lines.push(`- Fix: ${f.recommendedFix}`);
      lines.push('');
    }
  }

  lines.push('## Checked areas');
  for (const a of report.checkedAreas || []) lines.push(`- ${a}`);
  lines.push('');
  lines.push('## Limitations');
  for (const l of report.limitations || []) lines.push(`- ${l}`);
  lines.push('');

  if (Array.isArray(report.scratchNotes) && report.scratchNotes.length) {
    lines.push('## Session scratch notes');
    if (report.scratchNotesTruncated) {
      lines.push('');
      lines.push('_Some scratch content was truncated for report size limits._');
    }
    lines.push('');
    for (const n of report.scratchNotes) {
      lines.push(`### ${n.name || 'note'}${n.truncated ? ' (partial)' : ''}`);
      lines.push('');
      lines.push('```');
      lines.push(String(n.content ?? ''));
      lines.push('```');
      lines.push('');
    }
  }

  if (report.llmError) {
    lines.push('## LLM error');
    lines.push('');
    lines.push(`- **Message:** ${report.llmError.message || ''}`);
    if (report.llmError.status != null) lines.push(`- **HTTP status:** ${report.llmError.status}`);
    if (report.llmError.bodyPreview) {
      lines.push('');
      lines.push('```');
      lines.push(String(report.llmError.bodyPreview).slice(0, 8000));
      lines.push('```');
    }
    lines.push('');
  }

  if (report.rawAssistantOutput) {
    lines.push('## Model output (unstructured)');
    lines.push('');
    lines.push('```');
    lines.push(String(report.rawAssistantOutput).slice(0, 120000));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
