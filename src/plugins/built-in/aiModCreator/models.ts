export const DEFAULT_OPENROUTER_MODEL_ID = "minimax/minimax-m2.7:free";

export interface AiModModelOption {
  id: string;
  label: string;
  description: string;
  tier: "free" | "paid";
}

export const AI_MOD_MODEL_OPTIONS: readonly AiModModelOption[] = [
  {
    id: "minimax/minimax-m2.7:free",
    label: "MiniMax M2.7 (free)",
    description:
      "Best free option for agentic DOM mods. Separate provider rate limits apply.",
    tier: "free",
  },
  {
    id: "minimax/minimax-m3:free",
    label: "MiniMax M3 (free)",
    description: "Alternate free MiniMax with GMICloud rate limits.",
    tier: "free",
  },
  {
    id: "google/gemma-3-27b-it:free",
    label: "Gemma 3 27B (free)",
    description: "Free Google model; useful when MiniMax free tiers are busy.",
    tier: "free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B (free)",
    description: "Free Meta model with broader availability.",
    tier: "free",
  },
  {
    id: "minimax/minimax-m3",
    label: "MiniMax M3 (paid)",
    description: "Paid tier with much higher rate limits.",
    tier: "paid",
  },
] as const;

export const ALLOWED_OPENROUTER_MODEL_IDS = new Set(
  AI_MOD_MODEL_OPTIONS.map((option) => option.id),
);

export function validateModelId(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Model id is required");
  }
  const modelId = value.trim();
  if (!ALLOWED_OPENROUTER_MODEL_IDS.has(modelId)) {
    throw new Error("Unsupported OpenRouter model");
  }
  return modelId;
}

export function getModelOption(modelId: string): AiModModelOption | undefined {
  return AI_MOD_MODEL_OPTIONS.find((option) => option.id === modelId);
}
