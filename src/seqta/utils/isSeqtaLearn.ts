import {
  detectSEQTAPlatform,
  detectSEQTAPlatformSync,
} from "@/seqta/utils/platformDetection";

/** Classic SEQTA Learn (student) shell. */
export function isSeqtaLearnExperience(): boolean {
  return detectSEQTAPlatformSync() === "learn";
}

export function isSeqtaLearnExperienceAsync(
  forceRefresh: boolean = false,
): Promise<boolean> {
  return detectSEQTAPlatform(forceRefresh).then((platform) => platform === "learn");
}
