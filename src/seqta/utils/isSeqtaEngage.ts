/** SEQTA Engage (React) uses a different shell from classic SEQTA Learn. */
export function isSeqtaEngageExperience(): boolean {
  return document.title.includes("SEQTA Engage");
}

/** Unauthenticated SEQTA login shell (Learn + Engage). */
export function isSeqtaLoginPage(): boolean {
  return document.querySelector(".login") !== null;
}
