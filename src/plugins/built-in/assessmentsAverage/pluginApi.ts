import type { BooleanSetting, PluginAPI } from "@/plugins/core/types";

export interface WeightingEntry {
  weight: string;
  fingerprint: string;
  pluginVersion: number;
  refreshing?: boolean;
}

export type WeightingsMap = Record<string, WeightingEntry>;

export type AssessmentsAveragePluginSettings = {
  lettergrade: BooleanSetting;
};

export type AssessmentsAverageStorage = {
  weightings: WeightingsMap;
  assessments: Record<string, string>;
  weightingOverrides: Record<string, string>;
};

export type AssessmentsAverageApi = PluginAPI<
  AssessmentsAveragePluginSettings,
  AssessmentsAverageStorage
>;

export type AssessmentMark = {
  id: string | number;
  title?: string;
  metaclassID?: string | number;
  status?: string;
  graded?: boolean;
  availability?: string;
  due?: string;
  results?: { percentage?: unknown; score?: unknown };
};
