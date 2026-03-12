// Assessment Registry — clinical question definitions for all 20 assessment types.
// Each config defines sections, questions, and a scoring function.

export type QuestionType = "radio" | "checkbox" | "number" | "text" | "textarea" | "select" | "date" | "multicheck"

export interface QuestionOption {
  value: string | number
  label: string
  score?: number
  description?: string
}

export interface Question {
  id: string
  label: string
  type: QuestionType
  options?: QuestionOption[]
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
  description?: string
  required?: boolean
  scored?: boolean // contributes to total score
  conditional?: { id: string; value: string | number | boolean }
}

export interface AssessmentSection {
  title?: string
  description?: string
  questions: Question[]
}

export interface RiskResult {
  label: string
  level: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"
  colour: string
  recommendations?: string[]
}

export interface AssessmentConfig {
  type: string
  label: string
  description: string
  category: "Clinical" | "Safety" | "Nutrition" | "Wellbeing" | "Social" | "Legal" | "Hygiene"
  sections: AssessmentSection[]
  scoring?: {
    getTotal: (answers: Record<string, any>) => number
    getRiskResult: (score: number) => RiskResult
    scoreLabel?: string
  }
}

// ─── Risk helpers ────────────────────────────────────────────────────────────
const lowResult = (recs?: string[]): RiskResult => ({ label: "Low risk", level: "LOW", colour: "text-green-700", recommendations: recs })
const medResult = (recs?: string[]): RiskResult => ({ label: "Medium risk", level: "MEDIUM", colour: "text-yellow-700", recommendations: recs })
const highResult = (recs?: string[]): RiskResult => ({ label: "High risk", level: "HIGH", colour: "text-orange-700", recommendations: recs })
const vhResult = (recs?: string[]): RiskResult => ({ label: "Very high risk", level: "VERY_HIGH", colour: "text-red-700", recommendations: recs })

function sumScored(answers: Record<string, any>, questions: Question[]): number {
  return questions
    .filter((q) => q.scored && q.options)
    .reduce((total, q) => {
      const val = answers[q.id]
      if (val === undefined || val === null || val === "") return total
      const opt = q.options!.find((o) => String(o.value) === String(val))
      return total + (opt?.score ?? 0)
    }, 0)
}

function sumAllScored(config: AssessmentConfig, answers: Record<string, any>): number {
  return config.sections.flatMap((s) => s.questions).reduce((total, q) => {
    if (!q.scored || !q.options) return total
    const val = answers[q.id]
    if (val === undefined || val === null || val === "") return total
    const opt = q.options.find((o) => String(o.value) === String(val))
    return total + (opt?.score ?? 0)
  }, 0)
}

// ─── Registry ────────────────────────────────────────────────────────────────
export const ASSESSMENT_REGISTRY: Record<string, AssessmentConfig> = {

  // ── WATERLOW ──────────────────────────────────────────────────────────────
  WATERLOW: {
    type: "WATERLOW",
    label: "Waterlow Pressure Ulcer Risk",
    description: "Waterlow Pressure Ulcer Prevention/Treatment Policy scoring tool.",
    category: "Clinical",
    sections: [
      {
        title: "Build / Weight for Height",
        questions: [
          { id: "build", label: "Build / Weight for height", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "Average", score: 0 },
            { value: "1", label: "Above average", score: 1 },
            { value: "2", label: "Obese", score: 2 },
            { value: "3", label: "Below average", score: 3 },
          ]},
        ],
      },
      {
        title: "Visual Assessment of Skin",
        questions: [
          { id: "skin", label: "Skin type visual risk areas", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "Healthy", score: 0 },
            { value: "1a", label: "Tissue paper", score: 1 },
            { value: "1b", label: "Dry", score: 1 },
            { value: "1c", label: "Oedematous", score: 1 },
            { value: "1d", label: "Clammy / pyrexia", score: 1 },
            { value: "2", label: "Discoloured", score: 2 },
            { value: "3", label: "Broken / spots", score: 3 },
          ]},
        ],
      },
      {
        title: "Sex / Age",
        questions: [
          { id: "sex", label: "Sex", type: "radio", scored: true, required: true, options: [
            { value: "1m", label: "Male", score: 1 },
            { value: "2f", label: "Female", score: 2 },
          ]},
          { id: "age", label: "Age", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "14 – 49", score: 1 },
            { value: "2", label: "50 – 64", score: 2 },
            { value: "3", label: "65 – 74", score: 3 },
            { value: "4", label: "75 – 80", score: 4 },
            { value: "5", label: "81+", score: 5 },
          ]},
        ],
      },
      {
        title: "Malnutrition Screening",
        description: "Score from MUST assessment if available.",
        questions: [
          { id: "malnutrition", label: "Malnutrition score (MUST)", type: "radio", scored: true, options: [
            { value: "0", label: "No malnutrition risk (0)", score: 0 },
            { value: "1", label: "Mild risk (1)", score: 1 },
            { value: "2", label: "Moderate risk (2)", score: 2 },
            { value: "3", label: "Severe risk (3+)", score: 3 },
          ]},
        ],
      },
      {
        title: "Continence",
        questions: [
          { id: "continence", label: "Continence", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "Complete / catheterised", score: 0 },
            { value: "1", label: "Urinary incontinence", score: 1 },
            { value: "2", label: "Faecal incontinence", score: 2 },
            { value: "3", label: "Urinary + faecal incontinence", score: 3 },
          ]},
        ],
      },
      {
        title: "Mobility",
        questions: [
          { id: "mobility", label: "Mobility", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "Fully mobile", score: 0 },
            { value: "1", label: "Restless / fidgety", score: 1 },
            { value: "2", label: "Apathetic", score: 2 },
            { value: "3", label: "Restricted", score: 3 },
            { value: "4", label: "Inert / traction", score: 4 },
            { value: "5", label: "Chair-bound", score: 5 },
          ]},
        ],
      },
      {
        title: "Appetite",
        questions: [
          { id: "appetite", label: "Appetite", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "Average", score: 0 },
            { value: "1", label: "Poor", score: 1 },
            { value: "2", label: "NG tube / fluids only", score: 2 },
            { value: "3", label: "NBM / anorexic", score: 3 },
          ]},
        ],
      },
      {
        title: "Special Risks",
        description: "Add all applicable scores.",
        questions: [
          { id: "terminal_cachexia", label: "Terminal cachexia", type: "checkbox", scored: true, options: [{ value: "8", label: "Yes", score: 8 }] },
          { id: "cardiac_failure", label: "Multiple organ failure / cardiac failure", type: "checkbox", scored: true, options: [{ value: "8", label: "Yes", score: 8 }] },
          { id: "single_organ", label: "Single organ failure", type: "checkbox", scored: true, options: [{ value: "5", label: "Yes", score: 5 }] },
          { id: "peripheral_vascular", label: "Peripheral vascular disease", type: "checkbox", scored: true, options: [{ value: "5", label: "Yes", score: 5 }] },
          { id: "anaemia", label: "Anaemia (Hb < 8)", type: "checkbox", scored: true, options: [{ value: "2", label: "Yes", score: 2 }] },
          { id: "smoking", label: "Smoking", type: "checkbox", scored: true, options: [{ value: "1", label: "Yes", score: 1 }] },
          { id: "neurological", label: "Neurological deficit (diabetes, MS, CVA etc.)", type: "radio", scored: true, options: [
            { value: "0", label: "None", score: 0 },
            { value: "4", label: "Motor / sensory / paraplegia (4-6)", score: 4 },
            { value: "6", label: "Severe neurological deficit (6)", score: 6 },
          ]},
          { id: "surgery", label: "Major surgery / trauma", type: "radio", scored: true, options: [
            { value: "0", label: "None", score: 0 },
            { value: "5", label: "Orthopaedic / spinal / on table >2 hrs", score: 5 },
          ]},
          { id: "medication", label: "Medication (cytotoxics, high-dose steroids, anti-inflammatory)", type: "checkbox", scored: true, options: [{ value: "4", label: "Yes", score: 4 }] },
        ],
      },
      {
        title: "Clinical Notes",
        questions: [
          { id: "skin_notes", label: "Skin observation notes", type: "textarea", placeholder: "Describe any current skin concerns, markings, or vulnerabilities..." },
          { id: "action_plan", label: "Preventative action plan", type: "textarea", placeholder: "e.g. pressure-relieving mattress, repositioning schedule, barrier cream..." },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Waterlow score",
      getTotal: (answers) => {
        const sections: Question[] = []
        ASSESSMENT_REGISTRY.WATERLOW.sections.forEach((s) => sections.push(...s.questions))
        let total = 0
        for (const q of sections) {
          if (!q.scored) continue
          const val = answers[q.id]
          if (!val) continue
          if (q.type === "checkbox") {
            if (val === true || val === "true" || val === q.options?.[0]?.value) {
              total += q.options?.[0]?.score ?? 0
            }
          } else {
            const opt = q.options?.find((o) => String(o.value) === String(val))
            total += opt?.score ?? 0
          }
        }
        return total
      },
      getRiskResult: (score) => {
        if (score >= 20) return vhResult(["Dynamic pressure-relieving system", "Dietitian referral", "Specialist wound nurse", "4-hourly repositioning or continuous low-pressure system"])
        if (score >= 15) return highResult(["Pressure-relieving mattress", "2-hourly repositioning", "Skin inspection at each care episode", "Dietitian review"])
        if (score >= 10) return medResult(["Pressure-relieving cushion", "Skin inspection twice daily", "Encourage mobility", "Dietary review"])
        return lowResult(["Preventative measures", "Inspect skin daily"])
      },
    },
  },

  // ── MUST_NUTRITIONAL ──────────────────────────────────────────────────────
  MUST_NUTRITIONAL: {
    type: "MUST_NUTRITIONAL",
    label: "MUST Nutritional Screening",
    description: "Malnutrition Universal Screening Tool — 3-step nutritional risk screening.",
    category: "Nutrition",
    sections: [
      {
        title: "Step 1 — BMI Score",
        description: "Calculate from current weight and height.",
        questions: [
          { id: "weight", label: "Current weight (kg)", type: "number", unit: "kg", min: 20, max: 300, required: true },
          { id: "height", label: "Height (cm)", type: "number", unit: "cm", min: 100, max: 220, required: true },
          { id: "bmi_score", label: "BMI Score", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "BMI > 20", score: 0 },
            { value: "1", label: "BMI 18.5 – 20", score: 1 },
            { value: "2", label: "BMI < 18.5", score: 2 },
          ]},
        ],
      },
      {
        title: "Step 2 — Weight Loss Score",
        description: "Unplanned weight loss in past 3–6 months.",
        questions: [
          { id: "weight_change", label: "Reported / measured weight change (kg)", type: "number", unit: "kg" },
          { id: "weight_loss_pct", label: "Estimated weight loss %", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "< 5%", score: 0 },
            { value: "1", label: "5% – 10%", score: 1 },
            { value: "2", label: "> 10%", score: 2 },
          ]},
        ],
      },
      {
        title: "Step 3 — Acute Disease Effect",
        description: "If the patient is acutely ill AND there has been no nutritional intake or likelihood of no intake for more than 5 days, score 2.",
        questions: [
          { id: "acute_disease", label: "Acute disease effect", type: "radio", scored: true, required: true, options: [
            { value: "0", label: "No acute disease effect", score: 0 },
            { value: "2", label: "Acutely ill — no/little intake likely ≥5 days", score: 2 },
          ]},
        ],
      },
      {
        title: "Additional Details",
        questions: [
          { id: "previous_weight", label: "Previous recorded weight (kg)", type: "number", unit: "kg" },
          { id: "previous_weight_date", label: "Date of previous weight", type: "date" },
          { id: "supplements", label: "Currently receiving nutritional supplements?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "supplement_details", label: "Supplement details", type: "text", placeholder: "e.g. Fortisip 1 × daily, Ensure 2 × daily", conditional: { id: "supplements", value: "yes" } },
          { id: "dietitian_referral", label: "Dietitian referral recommended?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "existing", label: "Already referred" },
          ]},
          { id: "notes", label: "Additional clinical notes", type: "textarea", placeholder: "Any relevant history, preferences, concerns..." },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "MUST score",
      getTotal: (answers) => {
        const bmi = Number(answers.bmi_score ?? 0)
        const wl = Number(answers.weight_loss_pct ?? 0)
        const acute = Number(answers.acute_disease ?? 0)
        return bmi + wl + acute
      },
      getRiskResult: (score) => {
        if (score >= 2) return highResult(["Refer to dietitian", "Nutritional supplement prescription", "Weekly weight monitoring", "Document food and fluid intake", "Aim for 1.2–1.5g protein/kg/day"])
        if (score === 1) return medResult(["Monitor food intake 3 days", "Fortnightly weight monitoring", "Consider dietitian referral","Improve oral intake strategies"])
        return lowResult(["Routine nutritional screening", "Monthly weight monitoring"])
      },
    },
  },

  // ── FALLS_RISK ─────────────────────────────────────────────────────────────
  FALLS_RISK: {
    type: "FALLS_RISK",
    label: "Falls Risk Assessment",
    description: "Screening tool to identify and quantify risk factors for falls.",
    category: "Safety",
    sections: [
      {
        title: "Fall History",
        questions: [
          { id: "previous_fall", label: "History of previous fall(s)", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "falls_this_year", label: "Number of falls in past 12 months", type: "number", min: 0, max: 50 },
          { id: "fall_injury", label: "Fall resulting in injury", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No / no falls", score: 0 },
          ]},
          { id: "fear_of_falling", label: "Fear of falling / loss of confidence", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
        ],
      },
      {
        title: "Physical Factors",
        questions: [
          { id: "gait_balance", label: "Gait / balance problem", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "visual_impairment", label: "Visual impairment (uncorrected or significant)", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "urinary_incontinence", label: "Urinary incontinence / urgency", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "postural_hypotension", label: "Postural hypotension (drop ≥20mmHg systolic)", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No / not tested", score: 0 },
          ]},
        ],
      },
      {
        title: "Cognitive / Medication Factors",
        questions: [
          { id: "cognitive_impairment", label: "Cognitive impairment / confusion", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "four_plus_meds", label: "4 or more medications", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "psychoactive_meds", label: "Psychoactive / sedative medication", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "antihypertensives", label: "Antihypertensives / diuretics", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
        ],
      },
      {
        title: "Environmental / Other",
        questions: [
          { id: "environmental_hazards", label: "Environmental hazards identified", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
          { id: "hazards_detail", label: "Hazards identified", type: "text", placeholder: "e.g. wet floor, poor lighting, loose rugs...", conditional: { id: "environmental_hazards", value: "1" } },
          { id: "footwear", label: "Inappropriate / unsafe footwear", type: "radio", scored: true, options: [
            { value: "1", label: "Yes", score: 1 }, { value: "0", label: "No", score: 0 },
          ]},
        ],
      },
      {
        title: "Actions & Review",
        questions: [
          { id: "actions", label: "Actions / interventions planned", type: "textarea", placeholder: "e.g. call bell in reach, non-slip footwear, physio referral, bed sensor..." },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Falls risk score",
      getTotal: (answers) => sumAllScored(ASSESSMENT_REGISTRY.FALLS_RISK, answers),
      getRiskResult: (score) => {
        if (score >= 6) return highResult(["Multifactorial falls assessment", "Physio referral", "Bed/chair sensor", "Hip protectors consideration", "Medication review by GP", "Ensure call bell always in reach"])
        if (score >= 3) return medResult(["Monitor and review", "Ensure non-slip footwear", "Encourage exercise programme", "Falls prevention education"])
        return lowResult(["Standard falls prevention", "Annual review"])
      },
    },
  },

  // ── DEPENDENCY_RATING ──────────────────────────────────────────────────────
  DEPENDENCY_RATING: {
    type: "DEPENDENCY_RATING",
    label: "Dependency Rating",
    description: "Assessment of resident's level of dependency to inform staffing and care planning.",
    category: "Clinical",
    sections: [
      {
        title: "Activities of Daily Living",
        questions: [
          { id: "personal_care", label: "Washing / dressing / personal care", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Independent", score: 1 },
            { value: "2", label: "Minimal help / prompting", score: 2 },
            { value: "3", label: "Partial assistance", score: 3 },
            { value: "4", label: "Total / full assistance", score: 4 },
          ]},
          { id: "feeding", label: "Feeding / oral intake", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Independent", score: 1 },
            { value: "2", label: "Supervision / modified diet", score: 2 },
            { value: "3", label: "Needs physical help", score: 3 },
            { value: "4", label: "Tube / IV / NBM", score: 4 },
          ]},
          { id: "continence_dep", label: "Continence", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Continent", score: 1 },
            { value: "2", label: "Occasionally incontinent", score: 2 },
            { value: "3", label: "Frequently incontinent", score: 3 },
            { value: "4", label: "Totally incontinent / catheter / stoma", score: 4 },
          ]},
          { id: "mobility_dep", label: "Mobility / transfers", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Mobile / independent", score: 1 },
            { value: "2", label: "Walking aid / supervision", score: 2 },
            { value: "3", label: "One-person assistance", score: 3 },
            { value: "4", label: "Two-person / hoist", score: 4 },
            { value: "5", label: "Bed-bound", score: 5 },
          ]},
        ],
      },
      {
        title: "Communication & Cognition",
        questions: [
          { id: "communication", label: "Communication", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Effective verbal communication", score: 1 },
            { value: "2", label: "Some difficulty but manageable", score: 2 },
            { value: "3", label: "Significant difficulty", score: 3 },
            { value: "4", label: "Unable to communicate verbally", score: 4 },
          ]},
          { id: "cognition", label: "Cognition / orientation", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "Alert and orientated", score: 1 },
            { value: "2", label: "Occasional confusion", score: 2 },
            { value: "3", label: "Frequently confused / disoriented", score: 3 },
            { value: "4", label: "Unresponsive / severely impaired", score: 4 },
          ]},
          { id: "behaviour", label: "Behavioural support needs", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "No behavioural issue", score: 1 },
            { value: "2", label: "Occasional intervention required", score: 2 },
            { value: "3", label: "Regular behavioural intervention", score: 3 },
            { value: "4", label: "Constant supervision / specialist input", score: 4 },
          ]},
        ],
      },
      {
        title: "Clinical Complexity",
        questions: [
          { id: "medications", label: "Medication complexity", type: "radio", scored: true, options: [
            { value: "1", label: "Self-medicating or simple regime", score: 1 },
            { value: "2", label: "Staff administered (standard)", score: 2 },
            { value: "3", label: "Complex or multiple routes", score: 3 },
            { value: "4", label: "Invasive / IV / specialist regime", score: 4 },
          ]},
          { id: "clinical_care", label: "Clinical / nursing care needs", type: "radio", scored: true, options: [
            { value: "1", label: "Minimal — social care only", score: 1 },
            { value: "2", label: "Standard nursing interventions", score: 2 },
            { value: "3", label: "Frequent nursing interventions", score: 3 },
            { value: "4", label: "High complexity / specialist nursing", score: 4 },
          ]},
        ],
      },
      {
        title: "Summary",
        questions: [
          { id: "notes", label: "Additional dependency notes", type: "textarea", placeholder: "Any relevant context affecting dependency level..." },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Dependency score",
      getTotal: (answers) => sumAllScored(ASSESSMENT_REGISTRY.DEPENDENCY_RATING, answers),
      getRiskResult: (score) => {
        if (score >= 30) return { label: "Very high dependency", level: "VERY_HIGH", colour: "text-red-700" }
        if (score >= 22) return { label: "High dependency", level: "HIGH", colour: "text-orange-700" }
        if (score >= 14) return { label: "Medium dependency", level: "MEDIUM", colour: "text-yellow-700" }
        return { label: "Low dependency", level: "LOW", colour: "text-green-700" }
      },
    },
  },

  // ── CLINICAL_FRAILTY_SCORE ─────────────────────────────────────────────────
  CLINICAL_FRAILTY_SCORE: {
    type: "CLINICAL_FRAILTY_SCORE",
    label: "Clinical Frailty Scale (Rockwood)",
    description: "Rockwood Clinical Frailty Scale — 9-point global assessment of frailty.",
    category: "Clinical",
    sections: [
      {
        title: "Clinical Frailty Rating",
        description: "Select the level that best describes the resident's overall function.",
        questions: [
          { id: "frailty_level", label: "Frailty level", type: "radio", scored: true, required: true, options: [
            { value: "1", label: "1 — Very fit", description: "Robust, active, energetic, well motivated. Exercise regularly. Among the fittest for their age.", score: 1 },
            { value: "2", label: "2 — Well", description: "No active disease symptoms but less fit than category 1. Often exercises or is very active occasionally.", score: 2 },
            { value: "3", label: "3 — Managing well", description: "Medical problems well controlled but not regularly active beyond routine walking.", score: 3 },
            { value: "4", label: "4 — Living with very mild frailty", description: "Not dependent on others for daily help but often slowed up and/or tired during the day.", score: 4 },
            { value: "5", label: "5 — Living with mild frailty", description: "More evident slowing, and needs help in high order IADLs (finances, transportation, heavy housework). Does not depend on others for personal care.", score: 5 },
            { value: "6", label: "6 — Living with moderate frailty", description: "Needs help with all outside activities and with keeping house. Indoors, often has problems with stairs and needs help with bathing and might need minimal assistance with dressing.", score: 6 },
            { value: "7", label: "7 — Living with severe frailty", description: "Completely dependent for personal care, from whatever cause (physical or cognitive). Even so, stable and not at high risk of dying within 6 months.", score: 7 },
            { value: "8", label: "8 — Living with very severe frailty", description: "Completely dependent, approaching the end of life. Typically, could not recover even from a minor illness.", score: 8 },
            { value: "9", label: "9 — Terminally ill", description: "Approaching end of life. This category applies to people with a life expectancy <6 months who are not otherwise evidently frail.", score: 9 },
          ]},
        ],
      },
      {
        title: "Notes",
        questions: [
          { id: "basis", label: "Basis for this rating", type: "textarea", placeholder: "Describe the key factors informing this frailty level..." },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Frailty level",
      getTotal: (answers) => Number(answers.frailty_level ?? 0),
      getRiskResult: (score) => {
        if (score >= 8) return vhResult(["Palliative / end-of-life care planning", "ACP review", "Comfort care focus"])
        if (score >= 6) return highResult(["Review care package", "OT / physio input", "Falls prevention", "Dietitian input"])
        if (score >= 4) return medResult(["Maintain independence", "Physiotherapy referral", "Social activities programme"])
        return lowResult(["Maintain current wellbeing", "Annual review"])
      },
    },
  },

  // ── PAIN_ASSESSMENT ───────────────────────────────────────────────────────
  PAIN_ASSESSMENT: {
    type: "PAIN_ASSESSMENT",
    label: "Pain Assessment (Abbey Pain Scale)",
    description: "Abbey Pain Scale for residents who cannot verbalise pain; also includes self-report for verbal residents.",
    category: "Clinical",
    sections: [
      {
        title: "Pain Communication",
        questions: [
          { id: "can_verbalise", label: "Can the resident verbalise their pain?", type: "radio", required: true, options: [
            { value: "yes", label: "Yes — use self-report below" },
            { value: "no", label: "No — use Abbey Pain Scale" },
          ]},
          { id: "self_report_score", label: "Self-reported pain score (0 = no pain, 10 = worst imaginable)", type: "number", min: 0, max: 10, conditional: { id: "can_verbalise", value: "yes" } },
          { id: "pain_location", label: "Pain location(s)", type: "text", placeholder: "e.g. lower back, right hip..." },
          { id: "pain_type", label: "Pain type", type: "select", options: [
            { value: "chronic", label: "Chronic" },
            { value: "acute", label: "Acute" },
            { value: "acute_on_chronic", label: "Acute-on-chronic" },
            { value: "post_procedural", label: "Post-procedural" },
            { value: "unknown", label: "Unknown" },
          ]},
        ],
      },
      {
        title: "Abbey Pain Scale — Non-verbal Indicators",
        description: "Complete this section if the resident cannot verbalise pain.",
        questions: [
          { id: "vocalisation", label: "1. Vocalisation", description: "e.g. whimpering, groaning, crying", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
          { id: "facial_expression", label: "2. Facial expression", description: "e.g. looking tense, frowning, grimacing", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
          { id: "body_language", label: "3. Change in body language", description: "e.g. fidgeting, rocking, guarding", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
          { id: "behavioural_change", label: "4. Behavioural change", description: "e.g. increased confusion, refusing food, altered routine", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
          { id: "physiological_change", label: "5. Physiological change", description: "e.g. temperature, pulse, blood pressure change", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
          { id: "physical_changes", label: "6. Physical changes", description: "e.g. skin tears, pressure areas, arthritis, contractures", type: "radio", scored: true, options: [
            { value: "0", label: "Absent (0)", score: 0 },
            { value: "1", label: "Mild (1)", score: 1 },
            { value: "2", label: "Moderate (2)", score: 2 },
            { value: "3", label: "Severe (3)", score: 3 },
          ]},
        ],
      },
      {
        title: "Pain Management",
        questions: [
          { id: "current_analgesia", label: "Current analgesia / pain management", type: "textarea", placeholder: "e.g. Paracetamol 1g QDS, Ibuprofen PRN..." },
          { id: "non_pharmacological", label: "Non-pharmacological measures used", type: "textarea", placeholder: "e.g. repositioning, heat pad, massage, distraction..." },
          { id: "gp_review", label: "GP / pain review required?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "next_review", label: "Next pain review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Abbey Pain score",
      getTotal: (answers) => sumAllScored(ASSESSMENT_REGISTRY.PAIN_ASSESSMENT, answers),
      getRiskResult: (score) => {
        if (score >= 14) return { label: "Severe pain", level: "VERY_HIGH", colour: "text-red-700", recommendations: ["Urgent GP review", "Review analgesia regime", "Regular pain monitoring every 2 hours"] }
        if (score >= 8) return { label: "Moderate pain", level: "HIGH", colour: "text-orange-700", recommendations: ["GP / nurse review within 24 hours", "Review current analgesia", "Non-pharmacological measures"] }
        if (score >= 3) return { label: "Mild pain", level: "MEDIUM", colour: "text-yellow-700", recommendations: ["Monitor for changes", "Consider PRN analgesia", "Document pain pattern"] }
        return { label: "No pain indicated", level: "LOW", colour: "text-green-700" }
      },
    },
  },

  // ── CONTINENCE_ASSESSMENT ─────────────────────────────────────────────────
  CONTINENCE_ASSESSMENT: {
    type: "CONTINENCE_ASSESSMENT",
    label: "Continence Assessment",
    description: "Comprehensive assessment of continence needs and management plan.",
    category: "Clinical",
    sections: [
      {
        title: "Urinary Continence",
        questions: [
          { id: "urinary_status", label: "Urinary continence status", type: "radio", required: true, options: [
            { value: "continent", label: "Continent" },
            { value: "urge", label: "Urge incontinence" },
            { value: "stress", label: "Stress incontinence" },
            { value: "mixed", label: "Mixed incontinence" },
            { value: "overflow", label: "Overflow incontinence" },
            { value: "functional", label: "Functional incontinence" },
            { value: "catheter", label: "Catheterised" },
            { value: "unknown", label: "Unknown / to be assessed" },
          ]},
          { id: "urinary_frequency", label: "Frequency (times per day)", type: "number", min: 0, max: 30 },
          { id: "nocturia", label: "Nocturia (times per night)", type: "number", min: 0, max: 10 },
          { id: "catheter_type", label: "Catheter type", type: "select", options: [
            { value: "IDC", label: "Indwelling catheter" },
            { value: "SPC", label: "Suprapubic catheter" },
            { value: "ISC", label: "Intermittent self-catheterisation" },
            { value: "ISC_assisted", label: "ISC (staff assisted)" },
          ], conditional: { id: "urinary_status", value: "catheter" } },
          { id: "catheter_size", label: "Catheter size (Fr)", type: "text", conditional: { id: "urinary_status", value: "catheter" } },
          { id: "catheter_inserted", label: "Catheter insertion date", type: "date", conditional: { id: "urinary_status", value: "catheter" } },
        ],
      },
      {
        title: "Bowel Continence",
        questions: [
          { id: "bowel_status", label: "Bowel continence", type: "radio", required: true, options: [
            { value: "continent", label: "Continent" },
            { value: "occasionally", label: "Occasionally incontinent" },
            { value: "frequently", label: "Frequently incontinent" },
            { value: "stoma", label: "Stoma" },
          ]},
          { id: "bowel_frequency", label: "Normal bowel frequency", type: "select", options: [
            { value: "daily", label: "Daily" },
            { value: "alternate", label: "Alternate days" },
            { value: "twice_weekly", label: "Twice weekly" },
            { value: "less_frequent", label: "Less than twice weekly" },
            { value: "variable", label: "Variable" },
          ]},
          { id: "last_bowel", label: "Last recorded bowel movement", type: "date" },
          { id: "constipation", label: "Prone to constipation?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "laxatives", label: "Current laxatives / bowel management", type: "text", placeholder: "e.g. Laxido sachets, Senna, Microlax enema PRN..." },
        ],
      },
      {
        title: "Management & Skin Care",
        questions: [
          { id: "continence_management", label: "Continence aids / management strategy", type: "multicheck", options: [
            { value: "pads", label: "Continence pads" },
            { value: "pull_ups", label: "Pull-up pants" },
            { value: "sheaths", label: "Penile sheaths" },
            { value: "toilet_programme", label: "Prompted / timed toileting" },
            { value: "pelvic_floor", label: "Pelvic floor exercises" },
            { value: "none", label: "None required" },
          ]},
          { id: "skin_integrity", label: "Skin integrity concerns related to continence", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "skin_detail", label: "Skin concern details", type: "text", conditional: { id: "skin_integrity", value: "yes" } },
          { id: "fluid_intake", label: "Fluid intake adequacy", type: "radio", options: [
            { value: "adequate", label: "Adequate (>1500mL/day)" },
            { value: "inadequate", label: "Inadequate (<1500mL/day)" },
            { value: "excessive", label: "Excessive (>3000mL/day)" },
            { value: "unknown", label: "Unknown" },
          ]},
          { id: "continence_service", label: "Referral to continence service", type: "radio", options: [
            { value: "yes", label: "Yes — referred" },
            { value: "recommended", label: "Recommended but not yet done" },
            { value: "no", label: "Not required" },
          ]},
          { id: "notes", label: "Additional notes", type: "textarea" },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
  },

  // ── ORAL_HEALTH ───────────────────────────────────────────────────────────
  ORAL_HEALTH: {
    type: "ORAL_HEALTH",
    label: "Oral Health Assessment",
    description: "Assessment of oral hygiene and dental health needs.",
    category: "Clinical",
    sections: [
      {
        title: "Oral Health Screening",
        questions: [
          { id: "own_teeth", label: "Natural teeth present?", type: "radio", required: true, options: [
            { value: "yes", label: "Yes (some or all)" }, { value: "no", label: "No (edentulous)" },
          ]},
          { id: "dentures", label: "Wears dentures?", type: "radio", required: true, options: [
            { value: "full", label: "Full upper and lower" },
            { value: "upper", label: "Upper only" },
            { value: "lower", label: "Lower only" },
            { value: "partial", label: "Partial denture(s)" },
            { value: "no", label: "No dentures" },
          ]},
          { id: "oral_cleanliness", label: "Oral cleanliness", type: "radio", scored: true, options: [
            { value: "0", label: "Clean — no debris or staining", score: 0 },
            { value: "1", label: "Slightly unclean — small amounts of debris/stain", score: 1 },
            { value: "2", label: "Very unclean — extensive debris/staining", score: 2 },
          ]},
          { id: "lips", label: "Lips", type: "radio", scored: true, options: [
            { value: "0", label: "Smooth and pink", score: 0 },
            { value: "1", label: "Dry, chapped or cracked", score: 1 },
            { value: "2", label: "Ulcerated or bleeding", score: 2 },
          ]},
          { id: "gums_tissue", label: "Gums and oral tissue", type: "radio", scored: true, options: [
            { value: "0", label: "Pink and moist", score: 0 },
            { value: "1", label: "Red or swollen", score: 1 },
            { value: "2", label: "Ulcerated, bleeding or very dry", score: 2 },
          ]},
          { id: "teeth_dentures", label: "Teeth / denture condition", type: "radio", scored: true, options: [
            { value: "0", label: "Clean, no debris", score: 0 },
            { value: "1", label: "Plaque / debris in some areas", score: 1 },
            { value: "2", label: "Extensive plaque / debris / broken teeth", score: 2 },
          ]},
          { id: "saliva", label: "Saliva / mouth moisture", type: "radio", scored: true, options: [
            { value: "0", label: "Moist — watery saliva", score: 0 },
            { value: "1", label: "Dry / sticky mucous", score: 1 },
            { value: "2", label: "Very dry / no saliva", score: 2 },
          ]},
          { id: "ability_to_eat", label: "Ability to eat", type: "radio", scored: true, options: [
            { value: "0", label: "Normal — chews and swallows normally", score: 0 },
            { value: "1", label: "Some difficulty — slower / softer food needed", score: 1 },
            { value: "2", label: "Unable to eat — pain / dysphagia", score: 2 },
          ]},
        ],
      },
      {
        title: "Oral Care Plan",
        questions: [
          { id: "brushing_frequency", label: "Target brushing frequency", type: "radio", options: [
            { value: "after_every_meal", label: "After every meal" },
            { value: "twice_daily", label: "Twice daily" },
            { value: "daily", label: "Daily minimally" },
          ]},
          { id: "assistance_level", label: "Assistance required", type: "radio", options: [
            { value: "independent", label: "Independent" },
            { value: "prompting", label: "Prompting only" },
            { value: "partial", label: "Partial assistance" },
            { value: "full", label: "Full assistance" },
          ]},
          { id: "dentist_referral", label: "Dental referral required?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "ongoing", label: "Ongoing dental care" },
          ]},
          { id: "denture_care", label: "Denture care plan", type: "textarea", placeholder: "Remove overnight? Soaking solution? Labelled? Where stored?..." },
          { id: "notes", label: "Additional notes", type: "textarea" },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
    scoring: {
      scoreLabel: "Oral health score",
      getTotal: (answers) => sumAllScored(ASSESSMENT_REGISTRY.ORAL_HEALTH, answers),
      getRiskResult: (score) => {
        if (score >= 9) return highResult(["Urgent dental referral", "Four-times-daily oral care", "Mouth care protocol"])
        if (score >= 4) return medResult(["Dental review recommended", "Twice-daily oral care with assistance", "Review denture fit"])
        return lowResult(["Standard twice-daily oral care", "Annual dental check"])
      },
    },
  },

  // ── BED_RAILS_ASSESSMENT ──────────────────────────────────────────────────
  BED_RAILS_ASSESSMENT: {
    type: "BED_RAILS_ASSESSMENT",
    label: "Bed Rails Assessment",
    description: "Assessment of need for bed rails, alternatives, and entrapment risk.",
    category: "Safety",
    sections: [
      {
        title: "Risk Factors",
        description: "Consider all factors contributing to need for bed rails.",
        questions: [
          { id: "fall_from_bed", label: "Risk of falling from bed during sleep / movement", type: "radio", required: true, options: [
            { value: "high", label: "High risk" }, { value: "medium", label: "Medium risk" }, { value: "low", label: "Low risk" },
          ]},
          { id: "history_fall_bed", label: "History of falls from bed", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "restless_night", label: "Restless, agitated or confused at night", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "previous_rails", label: "Bed rails previously used", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "alternatives_tried", label: "Alternatives tried / considered", type: "multicheck", options: [
            { value: "low_bed", label: "Low bed / floor-level bed" },
            { value: "bed_sensor", label: "Bed sensor / alarm" },
            { value: "crash_mat", label: "Crash mat" },
            { value: "bedside_chair", label: "Chair pushed against bed" },
            { value: "one_rail_only", label: "One rail only" },
            { value: "grab_rail", label: "Grab rail (repositioning aid only)" },
            { value: "none_tried", label: "None tried yet" },
          ]},
          { id: "resident_request", label: "Resident or family requesting bed rails", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "entrapment_risk", label: "Risk of entrapment (gaps between rail, mattress, head/footboard)", type: "radio", options: [
            { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
          ]},
        ],
      },
      {
        title: "Mental Capacity",
        questions: [
          { id: "capacity", label: "Does the resident have capacity to make this decision?", type: "radio", required: true, options: [
            { value: "yes", label: "Yes — resident consents" },
            { value: "no_best_interests", label: "No — best interests decision made" },
            { value: "unknown", label: "Unknown — MCA assessment needed" },
          ]},
          { id: "best_interests_notes", label: "Best interests decision notes", type: "textarea", conditional: { id: "capacity", value: "no_best_interests" } },
        ],
      },
      {
        title: "Decision & Plan",
        questions: [
          { id: "outcome", label: "Outcome of assessment", type: "radio", required: true, options: [
            { value: "rails_recommended", label: "Bed rails recommended (least restrictive option)" },
            { value: "rails_not_recommended", label: "Bed rails not recommended" },
            { value: "alternatives_first", label: "Trial non-rail alternatives first" },
          ]},
          { id: "rail_type", label: "Rail type if used", type: "text", placeholder: "e.g. Full length, half rail both sides, one half rail..." },
          { id: "review_frequency", label: "Review frequency", type: "select", options: [
            { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "3_monthly", label: "3-monthly" }, { value: "on_change", label: "On condition change" },
          ]},
          { id: "next_review", label: "Next review date", type: "date" },
          { id: "notes", label: "Additional notes", type: "textarea" },
        ],
      },
    ],
  },

  // ── MATTRESS_CHECK ────────────────────────────────────────────────────────
  MATTRESS_CHECK: {
    type: "MATTRESS_CHECK",
    label: "Pressure Mattress Check",
    description: "Assessment and review of current mattress and pressure-relieving equipment.",
    category: "Safety",
    sections: [
      {
        title: "Current Mattress",
        questions: [
          { id: "mattress_type", label: "Current mattress type", type: "radio", required: true, options: [
            { value: "standard", label: "Standard foam mattress" },
            { value: "static_pr", label: "Static pressure-relieving foam" },
            { value: "dynamic_low", label: "Dynamic (alternating) — low risk" },
            { value: "dynamic_med", label: "Dynamic (alternating) — medium risk" },
            { value: "dynamic_high", label: "Dynamic (alternating) — high risk" },
            { value: "hybrid", label: "Hybrid foam/air" },
          ]},
          { id: "mattress_condition", label: "Mattress condition", type: "radio", required: true, options: [
            { value: "good", label: "Good — within life expectancy" },
            { value: "fair", label: "Fair — showing minor wear" },
            { value: "poor", label: "Poor — worn, bottoming out, or damaged" },
          ]},
          { id: "waterlow_score", label: "Current Waterlow score (from assessment)", type: "number", min: 0, max: 64 },
          { id: "cover_intact", label: "Mattress cover intact (no tears or holes)?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No — requires replacement" },
          ]},
        ],
      },
      {
        title: "Recommendation",
        questions: [
          { id: "recommended_mattress", label: "Recommended mattress", type: "radio", required: true, options: [
            { value: "current_suitable", label: "Current mattress suitable — no change" },
            { value: "static_pr", label: "Upgrade to static pressure-relieving foam" },
            { value: "dynamic_low", label: "Dynamic alternating — low risk (Waterlow 10–14)" },
            { value: "dynamic_med", label: "Dynamic alternating — medium risk (Waterlow 15–19)" },
            { value: "dynamic_high", label: "Dynamic alternating — high risk (Waterlow 20+)" },
            { value: "specialist_referral", label: "Specialist tissue viability referral" },
          ]},
          { id: "cushion", label: "Pressure-relieving cushion used?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "recommended", label: "Recommended" },
          ]},
          { id: "heel_protection", label: "Heel protection in place?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_required", label: "Not required" },
          ]},
          { id: "next_check", label: "Next mattress check date", type: "date" },
          { id: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },

  // ── MOBILITY_FUNCTION ─────────────────────────────────────────────────────
  MOBILITY_FUNCTION: {
    type: "MOBILITY_FUNCTION",
    label: "Mobility & Moving and Handling",
    description: "Assessment of mobility, transfers, and moving and handling requirements.",
    category: "Clinical",
    sections: [
      {
        title: "Key Mobility Measures",
        questions: [
          { id: "walking", label: "Walking ability", type: "radio", required: true, options: [
            { value: "independent", label: "Independent — no aids" },
            { value: "walking_stick", label: "Walking stick" },
            { value: "zimmer", label: "Zimmer frame / wheeled walker" },
            { value: "one_assist", label: "One-person assistance" },
            { value: "two_assist", label: "Two-person assistance" },
            { value: "wheelchair", label: "Wheelchair user (self-propelling)" },
            { value: "wheelchair_pushed", label: "Wheelchair user (needs pushing)" },
            { value: "bedbound", label: "Bed-bound" },
          ]},
          { id: "transfers", label: "Transfers (bed/chair/toilet)", type: "radio", required: true, options: [
            { value: "independent", label: "Independent" },
            { value: "supervision", label: "Supervision only" },
            { value: "one_assist", label: "One-person assistance" },
            { value: "two_assist", label: "Two-person assistance" },
            { value: "hoist_stand_aid", label: "Hoist / stand aid" },
            { value: "hoist_full", label: "Full hoist — passive" },
            { value: "slide_sheet", label: "Slide sheet required" },
          ]},
          { id: "stairs", label: "Stair climbing", type: "radio", options: [
            { value: "independent", label: "Independent — with / without rail" },
            { value: "supervised", label: "Supervised" },
            { value: "not_applicable", label: "Not applicable / no stairs used" },
          ]},
          { id: "balance", label: "Balance", type: "radio", options: [
            { value: "normal", label: "Normal / good" },
            { value: "mild", label: "Mild impairment" },
            { value: "moderate", label: "Moderate impairment" },
            { value: "severe", label: "Severe impairment" },
          ]},
        ],
      },
      {
        title: "Moving and Handling Plan",
        questions: [
          { id: "mah_plan", label: "Moving and handling plan completed / in place", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No — to be completed" },
          ]},
          { id: "hoist_sling_size", label: "Hoist sling size (if applicable)", type: "text", placeholder: "e.g. Large universal, medium netting..." },
          { id: "physio_referral", label: "Physiotherapy referral", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "existing", label: "Existing patient" },
          ]},
          { id: "ot_referral", label: "Occupational therapy referral", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "existing", label: "Existing patient" },
          ]},
          { id: "exercise_programme", label: "Exercise / rehabilitation programme", type: "radio", options: [
            { value: "yes", label: "Yes — in place" }, { value: "recommended", label: "Recommended" }, { value: "no", label: "Not appropriate" },
          ]},
          { id: "notes", label: "Mobility notes / special instructions", type: "textarea" },
          { id: "next_review", label: "Next review date", type: "date" },
        ],
      },
    ],
  },

  // ── CALL_BELL_RISK ────────────────────────────────────────────────────────
  CALL_BELL_RISK: {
    type: "CALL_BELL_RISK",
    label: "Call Bell Risk Assessment",
    description: "Assessment of ability to use call bell and communication alternatives.",
    category: "Safety",
    sections: [
      {
        title: "Call Bell Usage",
        questions: [
          { id: "can_use_bell", label: "Can the resident use the call bell?", type: "radio", required: true, options: [
            { value: "yes", label: "Yes — independently" },
            { value: "sometimes", label: "Sometimes — with prompting / reminders" },
            { value: "no_cognitive", label: "No — cognitive impairment prevents use" },
            { value: "no_physical", label: "No — physical limitation prevents use" },
            { value: "no_both", label: "No — cognitive and physical limitation" },
          ]},
          { id: "physical_limitation", label: "Physical limitation detail", type: "text", placeholder: "e.g. right-sided weakness, contractures..." },
          { id: "cognitive_limitation", label: "Cognitive / awareness limitation", type: "text", placeholder: "e.g. advanced dementia, does not understand system..." },
          { id: "bell_position", label: "Call bell position is appropriate", type: "radio", options: [
            { value: "yes", label: "Yes — within reach at all times" },
            { value: "adjusted", label: "Yes — but requires specific positioning (see notes)" },
            { value: "not_applicable", label: "Not applicable (cannot use)" },
          ]},
        ],
      },
      {
        title: "Alternatives & Plan",
        questions: [
          { id: "alternatives", label: "Alternative communication / alert system", type: "multicheck", options: [
            { value: "pressure_mat", label: "Pressure mat / floor sensor" },
            { value: "bed_sensor", label: "Bed sensor alarm" },
            { value: "chair_sensor", label: "Chair sensor alarm" },
            { value: "personal_alarm", label: "Personal alarm worn" },
            { value: "regular_checks", label: "Regular timed welfare checks" },
            { value: "carer_nearby", label: "Carer in close proximity" },
            { value: "none", label: "None required" },
          ]},
          { id: "check_frequency", label: "Welfare check frequency", type: "select", options: [
            { value: "15min", label: "Every 15 minutes" },
            { value: "30min", label: "Every 30 minutes" },
            { value: "hourly", label: "Hourly" },
            { value: "2hrly", label: "2-hourly" },
            { value: "when_awake", label: "During waking hours as needed" },
          ]},
          { id: "family_informed", label: "Family / NOK informed of plan", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "notes", label: "Additional notes", type: "textarea" },
          { id: "next_review", label: "Review date", type: "date" },
        ],
      },
    ],
  },

  // ── EATING_DRINKING_CHOKING ────────────────────────────────────────────────
  EATING_DRINKING_CHOKING: {
    type: "EATING_DRINKING_CHOKING",
    label: "Eating, Drinking & Choking Risk",
    description: "Assessment of swallowing ability, texture requirements, and choking risk.",
    category: "Clinical",
    sections: [
      {
        title: "Swallowing Assessment",
        questions: [
          { id: "swallowing_difficulty", label: "Swallowing difficulty (dysphagia)", type: "radio", required: true, options: [
            { value: "none", label: "No difficulty" },
            { value: "mild", label: "Mild — occasional episode" },
            { value: "moderate", label: "Moderate — frequent" },
            { value: "severe", label: "Severe — requiring specialist input" },
          ]},
          { id: "choking_risk", label: "Choking risk", type: "radio", required: true, options: [
            { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
          ]},
          { id: "slt_assessed", label: "Speech & Language Therapy assessment completed?", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "recommended", label: "Recommended — awaiting referral" },
          ]},
          { id: "slt_review_date", label: "SLT review date", type: "date" },
        ],
      },
      {
        title: "IDDSI Levels",
        description: "International Dysphagia Diet Standardisation Initiative (IDDSI) levels.",
        questions: [
          { id: "food_level", label: "IDDSI food level", type: "radio", required: true, options: [
            { value: "7", label: "Level 7 — Regular" },
            { value: "6", label: "Level 6 — Soft & Bite-size" },
            { value: "5", label: "Level 5 — Minced & Moist" },
            { value: "4", label: "Level 4 — Puréed" },
            { value: "3", label: "Level 3 — Liquidised" },
            { value: "tube", label: "Tube feeding only (nil by mouth)" },
          ]},
          { id: "fluid_level", label: "IDDSI fluid level", type: "radio", required: true, options: [
            { value: "0", label: "Level 0 — Thin (normal)" },
            { value: "1", label: "Level 1 — Slightly thick" },
            { value: "2", label: "Level 2 — Mildly thick" },
            { value: "3", label: "Level 3 — Moderately thick" },
            { value: "4", label: "Level 4 — Extremely thick" },
          ]},
          { id: "thickener_product", label: "Thickener product used (if applicable)", type: "text", placeholder: "e.g. Thick & Easy, Resource ThickenUp..." },
        ],
      },
      {
        title: "Mealtime Support",
        questions: [
          { id: "eating_assistance", label: "Eating assistance needed", type: "radio", options: [
            { value: "independent", label: "Independent" },
            { value: "setup", label: "Set up only" },
            { value: "prompting", label: "Prompting / cueing" },
            { value: "partial_help", label: "Partial physical assistance" },
            { value: "full_help", label: "Full assistance" },
          ]},
          { id: "positioning", label: "Positioning for meals", type: "radio", options: [
            { value: "upright", label: "Fully upright (90°)" },
            { value: "slightly_reclined", label: "Slightly reclined" },
            { value: "specialist_chair", label: "Specialist positioning chair" },
          ]},
          { id: "mouth_care_after", label: "Mouth care after every meal", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "cutlery_aids", label: "Adaptive cutlery / aids required", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "cutlery_detail", label: "Adaptive aids detail", type: "text", conditional: { id: "cutlery_aids", value: "yes" } },
          { id: "supplement", label: "Nutritional supplementation required", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "notes", label: "Food preferences and additional notes", type: "textarea" },
          { id: "next_review", label: "Review date", type: "date" },
        ],
      },
    ],
  },

  // ── MULTIFACTORIAL_FALLS ──────────────────────────────────────────────────
  MULTIFACTORIAL_FALLS: {
    type: "MULTIFACTORIAL_FALLS",
    label: "Multifactorial Falls Assessment",
    description: "Detailed post-fall assessment and individualised risk reduction planning.",
    category: "Safety",
    sections: [
      {
        title: "Fall Details",
        questions: [
          { id: "fall_date_time", label: "Date and time of fall", type: "text", placeholder: "e.g. 14 Jan 2025, 03:20" },
          { id: "location", label: "Location of fall", type: "select", options: [
            { value: "bedroom", label: "Bedroom" }, { value: "bathroom", label: "Bathroom / en-suite" },
            { value: "corridor", label: "Corridor" }, { value: "lounge", label: "Lounge / dining room" },
            { value: "garden", label: "Garden / outdoor area" }, { value: "other", label: "Other" },
          ]},
          { id: "activity", label: "What was the resident doing at the time?", type: "text", placeholder: "e.g. walking to bathroom, transferring from chair..." },
          { id: "witnessed", label: "Was the fall witnessed?", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "witness_names", label: "Witness name(s)", type: "text", conditional: { id: "witnessed", value: "yes" } },
          { id: "call_bell_used", label: "Call bell", type: "radio", options: [
            { value: "used", label: "Used — staff responded" },
            { value: "not_in_reach", label: "Not in reach at time of fall" },
            { value: "did_not_use", label: "Available but not used" },
            { value: "not_applicable", label: "Not applicable" },
          ]},
        ],
      },
      {
        title: "Post-Fall Assessment",
        questions: [
          { id: "consciousness", label: "Level of consciousness on assessment", type: "radio", required: true, options: [
            { value: "alert", label: "Alert and orientated" },
            { value: "confused", label: "Confused / disoriented" },
            { value: "unconscious", label: "Unconscious initially" },
          ]},
          { id: "pain_present", label: "Pain present?", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "pain_detail", label: "Pain location and severity", type: "text", conditional: { id: "pain_present", value: "yes" } },
          { id: "injury", label: "Injury sustained", type: "radio", required: true, options: [
            { value: "none", label: "No visible injury" },
            { value: "minor", label: "Minor skin tear / bruising" },
            { value: "laceration", label: "Laceration" },
            { value: "suspected_fracture", label: "Suspected fracture" },
            { value: "head_injury", label: "Head injury / loss of consciousness" },
          ]},
          { id: "lying_time", label: "Time on floor before found (mins)", type: "number", min: 0 },
          { id: "cpn_check", label: "Neurological observations completed (for head injury)", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "not_required", label: "Not required" },
          ]},
        ],
      },
      {
        title: "Actions Taken",
        questions: [
          { id: "first_aid", label: "First aid given", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "first_aid_detail", label: "First aid details", type: "text", conditional: { id: "first_aid", value: "yes" } },
          { id: "gp_notified", label: "GP notified", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "hospital", label: "Hospital attendance required", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "family_notified", label: "Family / NOK notified", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "incident_form", label: "Incident form completed", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "in_progress", label: "In progress" }] },
          { id: "referrals", label: "Referrals made", type: "multicheck", options: [
            { value: "physio", label: "Physiotherapy" },
            { value: "ot", label: "Occupational therapy" },
            { value: "falls_clinic", label: "Falls prevention clinic" },
            { value: "continence", label: "Continence service" },
            { value: "ophthalmology", label: "Ophthalmology / optician" },
            { value: "pharmacy", label: "Pharmacy / medication review" },
            { value: "none", label: "No referrals at this time" },
          ]},
          { id: "changes_to_care", label: "Changes to care plan following fall", type: "textarea" },
        ],
      },
    ],
  },

  // ── INTERESTS_ACTIVITIES ──────────────────────────────────────────────────
  INTERESTS_ACTIVITIES: {
    type: "INTERESTS_ACTIVITIES",
    label: "Interests, Activities & Life History",
    description: "Person-centred assessment of interests, activities preferences, and life history to support meaningful engagement.",
    category: "Wellbeing",
    sections: [
      {
        title: "Life History",
        questions: [
          { id: "life_summary", label: "Life history summary", type: "textarea", placeholder: "Birthplace, family, career, key life events, proudest achievements..." },
          { id: "reminiscence_topics", label: "Topics that spark positive reminiscence", type: "textarea", placeholder: "e.g. holidays in Spain, working as a nurse, dancing in the 60s..." },
          { id: "cultural_background", label: "Cultural background and significance", type: "textarea", placeholder: "National identity, traditions, festivals, language..." },
        ],
      },
      {
        title: "Interests and Activities",
        questions: [
          { id: "past_hobbies", label: "Past hobbies and interests", type: "textarea", placeholder: "What did they love doing before coming to the home?" },
          { id: "current_activities", label: "Current activities enjoyed", type: "multicheck", options: [
            { value: "music", label: "Music / singing" },
            { value: "television", label: "Television / films" },
            { value: "reading", label: "Reading / audiobooks" },
            { value: "gardening", label: "Gardening / plants" },
            { value: "crafts", label: "Arts and crafts" },
            { value: "baking", label: "Baking / cooking" },
            { value: "social", label: "Socialising / conversation" },
            { value: "exercise", label: "Exercise / walking group" },
            { value: "religious", label: "Religious / spiritual activities" },
            { value: "outdoors", label: "Outdoor trips" },
            { value: "animals", label: "Pets / animal therapy" },
            { value: "cards", label: "Cards / board games" },
            { value: "technology", label: "Tablets / video calls" },
            { value: "other", label: "Other" },
          ]},
          { id: "activities_other_detail", label: "Other activities detail", type: "text", conditional: { id: "current_activities", value: "other" } },
          { id: "activities_to_avoid", label: "Activities to avoid / disliked", type: "textarea" },
        ],
      },
      {
        title: "Preferences",
        questions: [
          { id: "preferred_time", label: "Preferred time of day for activities", type: "radio", options: [
            { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }, { value: "evening", label: "Evening" }, { value: "flexible", label: "Flexible / any" },
          ]},
          { id: "social_preference", label: "Social preference", type: "radio", options: [
            { value: "one_to_one", label: "One-to-one" },
            { value: "small_group", label: "Small group (2–5)" },
            { value: "large_group", label: "Large group" },
            { value: "community", label: "Community outings" },
            { value: "all", label: "Happy with any" },
          ]},
          { id: "favourite_food", label: "Favourite foods and treats", type: "textarea" },
          { id: "favourite_music", label: "Favourite music / artists", type: "textarea" },
          { id: "goals", label: "Personal goals and wishes", type: "textarea", placeholder: "What would bring this resident joy? Any bucket list items?" },
          { id: "next_review", label: "Review date", type: "date" },
        ],
      },
    ],
  },

  // ── PEEP ──────────────────────────────────────────────────────────────────
  PEEP: {
    type: "PEEP",
    label: "Personal Emergency Evacuation Plan (PEEP)",
    description: "Personalised fire and emergency evacuation plan for each resident.",
    category: "Safety",
    sections: [
      {
        title: "Evacuation Capability",
        questions: [
          { id: "ambulant", label: "Ambulant / can self-evacuate", type: "radio", required: true, options: [
            { value: "yes", label: "Yes — can independently evacuate" },
            { value: "with_mobility_aid", label: "Yes — but needs mobility aid" },
            { value: "no", label: "No — requires physical assistance" },
          ]},
          { id: "evacuation_aid", label: "Evacuation aid required", type: "radio", required: true, options: [
            { value: "none", label: "None" },
            { value: "evacuation_chair", label: "Evacuation chair" },
            { value: "stretcher", label: "Stretcher" },
            { value: "stay_put", label: "Stay put / refuge area" },
          ]},
          { id: "assistance_persons", label: "Number of staff required for evacuation", type: "radio", options: [
            { value: "0", label: "Self-evacuating — no staff required" },
            { value: "1", label: "1 person" },
            { value: "2", label: "2 persons" },
            { value: "specialist", label: "Specialist lift technique" },
          ]},
          { id: "understands_evacuation", label: "Resident's ability to understand evacuation instructions", type: "radio", options: [
            { value: "full", label: "Full understanding" },
            { value: "partial", label: "Partial understanding" },
            { value: "unable", label: "Unable to understand — staff-led" },
          ]},
        ],
      },
      {
        title: "Evacuation Routes & Procedures",
        questions: [
          { id: "primary_route", label: "Primary evacuation route", type: "text", required: true, placeholder: "e.g. Room 12 → Corridor 1 → Fire exit north" },
          { id: "alternative_route", label: "Alternative route (if primary blocked)", type: "text", placeholder: "e.g. Via fire door at south end of wing..." },
          { id: "refuge_location", label: "Refuge / assembly point", type: "text", placeholder: "e.g. Car park assembly area" },
          { id: "special_considerations", label: "Special considerations / mobility limitations", type: "textarea", placeholder: "e.g. Needs hoist for evacuation, cannot manage stairs..." },
          { id: "named_carer", label: "Named member of staff responsible for evacuation", type: "text" },
        ],
      },
      {
        title: "Review & Practice",
        questions: [
          { id: "mca_evacuation", label: "Resident has capacity to participate in evacuation decisions", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "practice_completed", label: "Practice evacuation completed", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No — to be arranged" }] },
          { id: "practice_date", label: "Date of last practice", type: "date" },
          { id: "next_review", label: "Next PEEP review date", type: "date" },
          { id: "notes", label: "Additional notes", type: "textarea" },
        ],
      },
    ],
  },

  // ── NUTRITIONAL_ASSESSMENT ────────────────────────────────────────────────
  NUTRITIONAL_ASSESSMENT: {
    type: "NUTRITIONAL_ASSESSMENT",
    label: "Detailed Nutritional Assessment",
    description: "Comprehensive nutritional assessment including weight monitoring, intake, and dietary goals.",
    category: "Nutrition",
    sections: [
      {
        title: "Anthropometric Measurements",
        questions: [
          { id: "weight_kg", label: "Current weight (kg)", type: "number", unit: "kg", required: true },
          { id: "height_cm", label: "Height (cm)", type: "number", unit: "cm" },
          { id: "bmi", label: "BMI (auto-calculated or manual)", type: "number", step: 0.1 },
          { id: "must_score", label: "MUST score (from screening)", type: "number", min: 0, max: 6 },
          { id: "weight_trend", label: "Weight trend", type: "radio", options: [
            { value: "stable", label: "Stable" },
            { value: "gaining", label: "Gaining" },
            { value: "losing", label: "Losing (unplanned)" },
            { value: "fluctuating", label: "Fluctuating" },
          ]},
          { id: "weight_monitoring_freq", label: "Weight monitoring frequency", type: "radio", options: [
            { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" },
          ]},
        ],
      },
      {
        title: "Dietary Intake",
        questions: [
          { id: "appetite", label: "Appetite level", type: "radio", options: [
            { value: "good", label: "Good — eats most of meals" },
            { value: "fair", label: "Fair — eats about half of meals" },
            { value: "poor", label: "Poor — eats less than a third" },
            { value: "very_poor", label: "Very poor — minimal intake" },
          ]},
          { id: "fluid_intake_ml", label: "Daily fluid intake target (mL)", type: "number", unit: "mL", placeholder: "1500" },
          { id: "supplements", label: "Nutritional supplements prescribed", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "supplement_details", label: "Supplement details", type: "text", placeholder: "e.g. Fortisip Compact 125mL × 2 daily", conditional: { id: "supplements", value: "yes" } },
          { id: "dietary_requirements", label: "Special dietary requirements", type: "textarea", placeholder: "Diabetic, Halal, Kosher, texture-modified, allergies..." },
        ],
      },
      {
        title: "Nutritional Goals & Referrals",
        questions: [
          { id: "goal", label: "Nutritional goal", type: "radio", options: [
            { value: "increase", label: "Increase weight / intake" },
            { value: "maintain", label: "Maintain current weight" },
            { value: "monitor", label: "Monitor — no immediate action" },
          ]},
          { id: "target_weight_kg", label: "Target weight (kg, if applicable)", type: "number", unit: "kg" },
          { id: "dietitian_referral", label: "Dietitian referral", type: "radio", options: [
            { value: "yes", label: "Yes — referred" }, { value: "recommended", label: "Recommended" }, { value: "no", label: "Not required" },
          ]},
          { id: "feed_chart", label: "Food and fluid chart in use", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "notes", label: "Additional nutritional notes", type: "textarea" },
          { id: "next_review", label: "Next nutritional review", type: "date" },
        ],
      },
    ],
  },

  // ── PERSONAL_HYGIENE ──────────────────────────────────────────────────────
  PERSONAL_HYGIENE: {
    type: "PERSONAL_HYGIENE",
    label: "Personal Hygiene Preferences",
    description: "Assessment of personal hygiene needs, preferences, and assistance required.",
    category: "Hygiene",
    sections: [
      {
        title: "Bathing & Washing",
        questions: [
          { id: "bathing_type", label: "Preferred bathing type", type: "radio", required: true, options: [
            { value: "bath", label: "Bath" }, { value: "shower", label: "Shower" },
            { value: "bed_bath", label: "Bed bath" }, { value: "strip_wash", label: "Strip wash at basin" },
          ]},
          { id: "bathing_frequency", label: "Bathing frequency preference", type: "radio", options: [
            { value: "daily", label: "Daily" }, { value: "alternate", label: "Alternate days" },
            { value: "twice_weekly", label: "Twice weekly" }, { value: "weekly", label: "Weekly" },
          ]},
          { id: "bathing_time", label: "Preferred time of day", type: "radio", options: [
            { value: "morning", label: "Morning" }, { value: "evening", label: "Evening" }, { value: "flexible", label: "Flexible" },
          ]},
          { id: "shower_seat", label: "Shower seat required", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "bath_hoist", label: "Bath hoist / bath lift required", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
        ],
      },
      {
        title: "Hair, Nails & Skin",
        questions: [
          { id: "hair_washing_freq", label: "Hair washing frequency", type: "radio", options: [
            { value: "daily", label: "Daily" }, { value: "twice_weekly", label: "Twice weekly" },
            { value: "weekly", label: "Weekly" }, { value: "fortnightly", label: "Fortnightly" },
          ]},
          { id: "hairdresser", label: "Regular visits from hairdresser / barber", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "nail_care", label: "Nail care", type: "radio", options: [
            { value: "independent", label: "Independent" }, { value: "staff", label: "Staff assisted" }, { value: "podiatrist", label: "Podiatry referral required" },
          ]},
          { id: "podiatry_frequency", label: "Podiatry visit frequency", type: "text", placeholder: "e.g. 6-weekly" },
          { id: "skin_care_products", label: "Preferred skin care products", type: "textarea", placeholder: "e.g. Dove soap, Nivea body lotion, E45 cream for dry areas..." },
        ],
      },
      {
        title: "Oral, Shaving & Additional",
        questions: [
          { id: "oral_care_freq", label: "Oral care frequency", type: "radio", options: [
            { value: "after_meals", label: "After every meal" }, { value: "twice_daily", label: "Twice daily" }, { value: "daily", label: "Daily" },
          ]},
          { id: "oral_care_assistance", label: "Oral care assistance", type: "radio", options: [
            { value: "independent", label: "Independent" }, { value: "prompting", label: "Prompting" }, { value: "partial", label: "Partial assistance" }, { value: "full", label: "Full assistance" },
          ]},
          { id: "shaving", label: "Shaving / facial hair management", type: "radio", options: [
            { value: "independent", label: "Independent" }, { value: "assisted", label: "Assisted" }, { value: "na", label: "Not applicable" },
          ]},
          { id: "independence_level", label: "Overall personal care independence", type: "radio", options: [
            { value: "independent", label: "Independent" }, { value: "prompting", label: "Prompting / supervision" }, { value: "partial", label: "Partial assistance" }, { value: "full", label: "Full assistance" },
          ]},
          { id: "privacy_preferences", label: "Privacy preferences (e.g. same-sex carer)", type: "textarea" },
          { id: "notes", label: "Additional preferences / notes", type: "textarea" },
          { id: "next_review", label: "Review date", type: "date" },
        ],
      },
    ],
  },

  // ── ADVANCE_CARE_PLAN ─────────────────────────────────────────────────────
  ADVANCE_CARE_PLAN: {
    type: "ADVANCE_CARE_PLAN",
    label: "Advance Care Plan",
    description: "Documentation of the resident's wishes, preferences, and advance decisions for future care.",
    category: "Legal",
    sections: [
      {
        title: "Medical Decision-Making",
        questions: [
          { id: "dnacpr_in_place", label: "DNACPR order in place", type: "radio", required: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "respect_form", label: "ReSPECT form completed", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "in_progress", label: "In progress" }] },
          { id: "hospital_admission_wishes", label: "Wishes regarding hospital admission", type: "radio", options: [
            { value: "yes_treatment", label: "Yes — for active treatment if needed" },
            { value: "only_if_necessary", label: "Only if really necessary" },
            { value: "prefer_not", label: "Prefer not to be admitted" },
            { value: "no", label: "No — prefer comfort care at home" },
          ]},
          { id: "adrt", label: "Advance Decision to Refuse Treatment (ADRT) in place", type: "radio", options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "adrt_details", label: "ADRT details", type: "textarea", conditional: { id: "adrt", value: "yes" } },
        ],
      },
      {
        title: "Preferred Place of Care",
        questions: [
          { id: "preferred_place_of_care", label: "Preferred place of care (when unwell)", type: "radio", options: [
            { value: "care_home", label: "Care home" }, { value: "own_home", label: "Own home" },
            { value: "hospital", label: "Hospital" }, { value: "hospice", label: "Hospice" }, { value: "undecided", label: "Undecided" },
          ]},
          { id: "preferred_place_of_death", label: "Preferred place of death", type: "radio", options: [
            { value: "care_home", label: "Care home" }, { value: "own_home", label: "Own home" },
            { value: "hospice", label: "Hospice" }, { value: "hospital", label: "Hospital" }, { value: "undecided", label: "Undecided / not discussed" },
          ]},
        ],
      },
      {
        title: "Legal & Capacity",
        questions: [
          { id: "mental_capacity_decision", label: "Has mental capacity to make decisions", type: "radio", options: [{ value: "yes", label: "Yes — fully" }, { value: "partial", label: "Partial / fluctuating" }, { value: "no", label: "No" }] },
          { id: "lpa_registered", label: "Lasting Power of Attorney registered", type: "radio", options: [
            { value: "health_welfare", label: "Yes — Health and Welfare" },
            { value: "property_finance", label: "Yes — Property and Finance" },
            { value: "both", label: "Yes — Both" },
            { value: "no", label: "No" },
          ]},
          { id: "lpa_holder", label: "LPA holder name(s)", type: "text" },
          { id: "imca", label: "Independent Mental Capacity Advocate (IMCA) involved", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
        ],
      },
      {
        title: "Personal Wishes",
        questions: [
          { id: "organ_donation", label: "Organ donation wishes", type: "radio", options: [
            { value: "yes", label: "Yes — registered donor" }, { value: "no", label: "No" }, { value: "not_stated", label: "Not stated" },
          ]},
          { id: "funeral_preferences", label: "Funeral preferences documented", type: "radio", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "funeral_director", label: "Preferred funeral director", type: "text" },
          { id: "religious_spiritual_wishes", label: "Religious / spiritual wishes for end of life", type: "textarea", placeholder: "e.g. Last rites, specific music, readings, rituals..." },
          { id: "key_people", label: "Key people to be contacted / involved in decisions", type: "textarea" },
          { id: "gp_discussion_date", label: "Date discussed with GP", type: "date" },
          { id: "next_review", label: "Next review date", type: "date" },
          { id: "notes", label: "Additional notes", type: "textarea" },
        ],
      },
    ],
  },

  // ── MENTAL_CAPACITY ───────────────────────────────────────────────────────
  MENTAL_CAPACITY: {
    type: "MENTAL_CAPACITY",
    label: "Mental Capacity Assessment (MCA)",
    description: "Two-stage mental capacity assessment under the Mental Capacity Act 2005.",
    category: "Legal",
    sections: [
      {
        title: "Decision to Assess",
        description: "Capacity is decision-specific — complete for each individual decision.",
        questions: [
          { id: "decision_subject", label: "What specific decision is this assessment for?", type: "textarea", required: true, placeholder: "e.g. 'Whether to accept the care package proposed', 'Consent to share information with family'..." },
          { id: "assessment_date", label: "Date of assessment", type: "date" },
          { id: "assessor_role", label: "Assessor's role", type: "text", placeholder: "e.g. Senior Care Worker, Registered Nurse, Social Worker..." },
        ],
      },
      {
        title: "Stage 1 — Impairment or Disturbance",
        description: "Is there an impairment or disturbance in the functioning of the mind or brain?",
        questions: [
          { id: "stage1_impairment", label: "Is there an impairment or disturbance of mind / brain?", type: "radio", required: true, options: [
            { value: "yes", label: "Yes" }, { value: "no", label: "No" },
          ]},
          { id: "stage1_condition", label: "Condition causing impairment", type: "text", placeholder: "e.g. Alzheimer's disease, stroke, ABI, severe depression..." },
        ],
      },
      {
        title: "Stage 2 — Decision-Making Ability",
        description: "Does the impairment cause the person to be unable to make the specific decision?",
        questions: [
          { id: "unable_understand", label: "Unable to understand the relevant information", type: "radio", required: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "unable_retain", label: "Unable to retain the information long enough to make the decision", type: "radio", required: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "unable_weigh", label: "Unable to use or weigh the information as part of the decision-making process", type: "radio", required: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "unable_communicate", label: "Unable to communicate the decision (by any means)", type: "radio", required: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
          { id: "support_given", label: "Support provided to assist decision-making", type: "textarea", placeholder: "What information was given? In what format? Over how long? Who was present?..." },
        ],
      },
      {
        title: "Outcome & Best Interests",
        questions: [
          { id: "outcome", label: "Outcome of assessment", type: "radio", required: true, options: [
            { value: "has_capacity", label: "Has capacity to make this decision" },
            { value: "lacks_capacity", label: "Lacks capacity to make this decision" },
          ]},
          { id: "best_interests_decision_maker", label: "Best interests decision-maker (if lacks capacity)", type: "text" },
          { id: "best_interests_actions", label: "Best interests actions / decisions made", type: "textarea" },
          { id: "review_date", label: "Review date (capacity may change)", type: "date" },
          { id: "witness", label: "Witnessed by", type: "text" },
          { id: "notes", label: "Additional notes", type: "textarea" },
        ],
      },
    ],
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export const ASSESSMENT_CATEGORIES = [
  { value: "Clinical", label: "Clinical", icon: "🩺" },
  { value: "Safety", label: "Safety", icon: "⚠️" },
  { value: "Nutrition", label: "Nutrition", icon: "🥗" },
  { value: "Wellbeing", label: "Wellbeing", icon: "💛" },
  { value: "Social", label: "Social", icon: "👥" },
  { value: "Legal", label: "Legal", icon: "📋" },
  { value: "Hygiene", label: "Personal Care", icon: "🚿" },
]

export function getAssessmentConfig(type: string): AssessmentConfig | undefined {
  return ASSESSMENT_REGISTRY[type]
}

export const ALL_ASSESSMENT_TYPES = Object.values(ASSESSMENT_REGISTRY)
