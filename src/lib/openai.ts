import OpenAI from "openai"

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined
}

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai

export const AI_MODELS = {
  CARE_PLAN: "gpt-4o",
  HANDOVER: "gpt-4o-mini",
  SHIFT_SUMMARY: "gpt-4o-mini",
  RISK_ANALYSIS: "gpt-4o",
} as const
