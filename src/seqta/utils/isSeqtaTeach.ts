import {
  detectSEQTAPlatform,
  detectSEQTAPlatformSync,
} from "@/seqta/utils/platformDetection";

/** SEQTA Teach uses the Spine shell, distinct from classic Learn and Engage. */
export function isSeqtaTeachExperience(): boolean {
  return detectSEQTAPlatformSync() === "teach";
}

export function isSeqtaTeachExperienceAsync(
  forceRefresh: boolean = false,
): Promise<boolean> {
  return detectSEQTAPlatform(forceRefresh).then((platform) => platform === "teach");
}
