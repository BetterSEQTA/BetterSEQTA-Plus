/** Stable content fingerprint for skip-unchanged calendar sync. */

export type FingerprintableEvent = {
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
};

export function eventFingerprint(event: FingerprintableEvent): string {
  return [
    event.summary.trim(),
    (event.location ?? "").trim(),
    (event.description ?? "").trim(),
    event.startDateTime.trim(),
    event.endDateTime.trim(),
    event.timeZone.trim(),
  ].join("\n");
}

/** Parse `Key: {seqtaKey}` from Outlook event body text. */
export function parseOutlookSeqtaKey(bodyContent: string | undefined | null): string | undefined {
  if (!bodyContent) return undefined;
  const match = bodyContent.match(/^Key:\s*(.+)$/m);
  const key = match?.[1]?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function outlookDescriptionWithKey(
  description: string | undefined,
  seqtaKey: string,
): string {
  const base = (description ?? "Synced by BetterSEQTA+").trim();
  const withoutKey = base
    .split("\n")
    .filter((line) => !/^Key:\s*/.test(line))
    .join("\n")
    .trim();
  return `${withoutKey}\nKey: ${seqtaKey}`;
}
