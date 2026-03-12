/**
 * CareFlow AI Risk Scoring Engine
 *
 * Pure functions — fully testable in isolation.
 * All scores are 0–100. Thresholds: LOW <34, MEDIUM 34–66, HIGH >66
 *
 * Step 18.3–18.7
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type RiskDomain = 'FALLS' | 'PRESSURE_ULCER' | 'MEDICATION' | 'SAFEGUARDING'

export interface RiskFactor {
  domain: RiskDomain
  description: string
  weight: number // 1–10
}

export interface DomainScore {
  score: number
  level: RiskLevel
  factors: RiskFactor[]
}

export interface ResidentRiskData {
  // Falls data
  fallIncidents30Days: number
  fallIncidents7Days: number
  mobilityLevel: string // MobilityLevel enum
  waterlowMobilityScore: number // 0–5 from assessment
  hasSedativePRN: boolean
  environmentRiskNotes: string

  // Pressure ulcer data
  waterlowOverallScore: number // raw Waterlow total
  mustScore: number // 0–6 MUST nutritional score
  continenceLevel: string
  activeBodyMapEntries: number // unresolved pressure/skin entries
  hasSkinIntegrityConcerns: boolean

  // Medication data
  activeMedicationCount: number
  missedDosesLast30Days: number
  totalDosesLast30Days: number
  controlledDrugCount: number

  // Safeguarding data
  unexplainedBodyMapEntries: number
  unwitnessedIncidents30Days: number
  safeguardingIncidents90Days: number
  incidentFrequencyRising: boolean // more incidents this month vs last
}

// ─────────────────────────────────────────────
// Threshold helper
// ─────────────────────────────────────────────

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'VERY_HIGH'
  if (score >= 67) return 'HIGH'
  if (score >= 34) return 'MEDIUM'
  return 'LOW'
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

// ─────────────────────────────────────────────
// 18.4 — FALL RISK SCORING
// ─────────────────────────────────────────────

export function scoreFallRisk(data: ResidentRiskData): DomainScore {
  let score = 0
  const factors: RiskFactor[] = []

  // Incident frequency (30 days)
  if (data.fallIncidents30Days >= 3) {
    score += 30
    factors.push({ domain: 'FALLS', description: `${data.fallIncidents30Days} falls in past 30 days`, weight: 8 })
  } else if (data.fallIncidents30Days === 2) {
    score += 20
    factors.push({ domain: 'FALLS', description: '2 falls in past 30 days', weight: 6 })
  } else if (data.fallIncidents30Days === 1) {
    score += 10
    factors.push({ domain: 'FALLS', description: '1 fall in past 30 days', weight: 4 })
  }

  // Recent cluster (7 days)
  if (data.fallIncidents7Days >= 2) {
    score += 20
    factors.push({ domain: 'FALLS', description: `${data.fallIncidents7Days} falls in past 7 days — clustering pattern`, weight: 9 })
  }

  // Mobility
  const mobilityScores: Record<string, number> = {
    INDEPENDENT: 0,
    SUPERVISED: 5,
    ONE_PERSON_ASSIST: 15,
    TWO_PERSON_ASSIST: 20,
    HOIST: 10,
    BEDBOUND: 5, // bedbound has lower ambulatory fall risk
  }
  const mobilityAdd = mobilityScores[data.mobilityLevel] ?? 10
  if (mobilityAdd >= 15) {
    score += mobilityAdd
    factors.push({ domain: 'FALLS', description: `Mobility: ${data.mobilityLevel.replace(/_/g, ' ')}`, weight: 6 })
  }

  // Waterlow mobility component (0 = fully mobile, 5 = chairbound)
  if (data.waterlowMobilityScore >= 3) {
    score += data.waterlowMobilityScore * 3
    factors.push({ domain: 'FALLS', description: `Waterlow mobility score: ${data.waterlowMobilityScore}/5`, weight: 5 })
  }

  // PRN sedatives
  if (data.hasSedativePRN) {
    score += 10
    factors.push({ domain: 'FALLS', description: 'PRN sedative/hypnotic medication prescribed', weight: 6 })
  }

  // Environment
  if (data.environmentRiskNotes?.length > 0) {
    score += 5
    factors.push({ domain: 'FALLS', description: 'Environmental risk factors noted', weight: 3 })
  }

  return { score: clamp(score), level: scoreToLevel(score), factors }
}

// ─────────────────────────────────────────────
// 18.5 — PRESSURE ULCER RISK SCORING
// ─────────────────────────────────────────────

export function scorePressureUlcerRisk(data: ResidentRiskData): DomainScore {
  let score = 0
  const factors: RiskFactor[] = []

  // Waterlow score (industry standard — score ≥10 = at risk, ≥15 = high, ≥20 = very high)
  if (data.waterlowOverallScore >= 20) {
    score += 40
    factors.push({ domain: 'PRESSURE_ULCER', description: `Waterlow score: ${data.waterlowOverallScore} (Very High Risk)`, weight: 10 })
  } else if (data.waterlowOverallScore >= 15) {
    score += 25
    factors.push({ domain: 'PRESSURE_ULCER', description: `Waterlow score: ${data.waterlowOverallScore} (High Risk)`, weight: 8 })
  } else if (data.waterlowOverallScore >= 10) {
    score += 15
    factors.push({ domain: 'PRESSURE_ULCER', description: `Waterlow score: ${data.waterlowOverallScore} (At Risk)`, weight: 5 })
  }

  // MUST nutritional score
  if (data.mustScore >= 2) {
    score += 15
    factors.push({ domain: 'PRESSURE_ULCER', description: `MUST score: ${data.mustScore} (High nutritional risk)`, weight: 7 })
  } else if (data.mustScore === 1) {
    score += 8
    factors.push({ domain: 'PRESSURE_ULCER', description: `MUST score: ${data.mustScore} (Medium nutritional risk)`, weight: 4 })
  }

  // Continence
  if (['TOTALLY_INCONTINENT', 'CATHETERISED'].includes(data.continenceLevel)) {
    score += 15
    factors.push({ domain: 'PRESSURE_ULCER', description: `Continence: ${data.continenceLevel.replace(/_/g, ' ')}`, weight: 7 })
  } else if (['FREQUENTLY_INCONTINENT', 'STOMA'].includes(data.continenceLevel)) {
    score += 8
    factors.push({ domain: 'PRESSURE_ULCER', description: `Continence: ${data.continenceLevel.replace(/_/g, ' ')}`, weight: 4 })
  }

  // Active body map entries (skin concerns)
  if (data.activeBodyMapEntries > 0) {
    score += data.activeBodyMapEntries * 10
    factors.push({ domain: 'PRESSURE_ULCER', description: `${data.activeBodyMapEntries} active skin/pressure area(s) recorded on body map`, weight: 8 })
  }

  if (data.hasSkinIntegrityConcerns) {
    score += 10
    factors.push({ domain: 'PRESSURE_ULCER', description: 'Skin integrity concerns noted in care plan', weight: 5 })
  }

  return { score: clamp(score), level: scoreToLevel(score), factors }
}

// ─────────────────────────────────────────────
// 18.6 — MEDICATION RISK SCORING
// ─────────────────────────────────────────────

export function scoreMedicationRisk(data: ResidentRiskData): DomainScore {
  let score = 0
  const factors: RiskFactor[] = []

  // Polypharmacy
  if (data.activeMedicationCount >= 8) {
    score += 35
    factors.push({ domain: 'MEDICATION', description: `Polypharmacy: ${data.activeMedicationCount} active medications (≥8 HIGH threshold)`, weight: 9 })
  } else if (data.activeMedicationCount >= 5) {
    score += 20
    factors.push({ domain: 'MEDICATION', description: `Polypharmacy: ${data.activeMedicationCount} active medications (≥5 flags for review)`, weight: 6 })
  }

  // Missed doses rate
  if (data.totalDosesLast30Days > 0) {
    const missedRate = data.missedDosesLast30Days / data.totalDosesLast30Days
    if (missedRate >= 0.2) {
      score += 30
      factors.push({ domain: 'MEDICATION', description: `${Math.round(missedRate * 100)}% doses missed in past 30 days`, weight: 8 })
    } else if (missedRate >= 0.1) {
      score += 15
      factors.push({ domain: 'MEDICATION', description: `${Math.round(missedRate * 100)}% doses missed in past 30 days`, weight: 5 })
    }
  }

  // Controlled drugs
  if (data.controlledDrugCount >= 3) {
    score += 20
    factors.push({ domain: 'MEDICATION', description: `${data.controlledDrugCount} controlled drug(s) prescribed`, weight: 7 })
  } else if (data.controlledDrugCount > 0) {
    score += 10
    factors.push({ domain: 'MEDICATION', description: `${data.controlledDrugCount} controlled drug(s) prescribed`, weight: 4 })
  }

  return { score: clamp(score), level: scoreToLevel(score), factors }
}

// ─────────────────────────────────────────────
// 18.7 — SAFEGUARDING RISK SCORING
// ─────────────────────────────────────────────

export function scoreSafeguardingRisk(data: ResidentRiskData): DomainScore {
  let score = 0
  const factors: RiskFactor[] = []

  // Unexplained injuries on body map
  if (data.unexplainedBodyMapEntries >= 2) {
    score += 40
    factors.push({ domain: 'SAFEGUARDING', description: `${data.unexplainedBodyMapEntries} unexplained injuries recorded on body map`, weight: 10 })
  } else if (data.unexplainedBodyMapEntries === 1) {
    score += 20
    factors.push({ domain: 'SAFEGUARDING', description: '1 unexplained injury recorded on body map', weight: 8 })
  }

  // Unwitnessed incidents
  if (data.unwitnessedIncidents30Days >= 2) {
    score += 20
    factors.push({ domain: 'SAFEGUARDING', description: `${data.unwitnessedIncidents30Days} unwitnessed incidents in past 30 days`, weight: 7 })
  } else if (data.unwitnessedIncidents30Days === 1) {
    score += 10
    factors.push({ domain: 'SAFEGUARDING', description: '1 unwitnessed incident in past 30 days', weight: 4 })
  }

  // Safeguarding history (90 days)
  if (data.safeguardingIncidents90Days >= 1) {
    score += 25
    factors.push({ domain: 'SAFEGUARDING', description: `${data.safeguardingIncidents90Days} safeguarding incident(s) in past 90 days`, weight: 9 })
  }

  // Rising pattern
  if (data.incidentFrequencyRising) {
    score += 15
    factors.push({ domain: 'SAFEGUARDING', description: 'Incident frequency increasing compared to previous month', weight: 6 })
  }

  return { score: clamp(score), level: scoreToLevel(score), factors }
}

// ─────────────────────────────────────────────
// COMBINED SCORE
// ─────────────────────────────────────────────

export function calculateCombinedScore(
  fallScore: number,
  pressureScore: number,
  medicationScore: number,
  safeguardingScore: number
): { combinedScore: number; level: RiskLevel } {
  // Weighted average: safeguarding and falls weighted slightly higher
  const combined = Math.round(
    fallScore * 0.3 +
    pressureScore * 0.25 +
    medicationScore * 0.2 +
    safeguardingScore * 0.25
  )
  return { combinedScore: clamp(combined), level: scoreToLevel(combined) }
}
