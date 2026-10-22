const SESSION_KEY = "bsplus-tc-resume-opt-in-after-cloud-login";

export function markResumeOptInAfterCloudLogin(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearResumeOptInAfterCloudLogin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode */
  }
}

export function shouldResumeOptInAfterCloudLogin(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
