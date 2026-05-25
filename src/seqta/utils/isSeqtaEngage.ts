import {
  detectSEQTAPlatform,
  detectSEQTAPlatformSync,
} from "@/seqta/utils/platformDetection";

/** SEQTA Engage (React) uses a different shell from classic SEQTA Learn. */
export function isSeqtaEngageExperience(): boolean {
  return detectSEQTAPlatformSync() === "engage";
}

export function isSeqtaEngageExperienceAsync(
  forceRefresh: boolean = false,
): Promise<boolean> {
  return detectSEQTAPlatform(forceRefresh).then((platform) => platform === "engage");
}
