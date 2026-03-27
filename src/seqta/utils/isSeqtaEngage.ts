/** SEQTA Engage (React) uses a different shell from classic SEQTA Learn. */
export function isSeqtaEngageExperience(): boolean {
  return document.title.includes("SEQTA Engage");
}
