export type RiskLevel = 'منخفض' | 'متوسط' | 'مرتفع' | 'حرج'

export type RiskFactors = {
  wasteHazard: number
  populationProximity: number
  waterProximity: number
  agricultureProximity: number
  wasteQuantity: number
  burning: number
  leakage: number
}

export type RiskResult = {
  score: number
  level: RiskLevel
  percentage: number
}

const MAX_FACTOR_VALUE = 4
const FACTOR_COUNT = 7
const MAX_SCORE = MAX_FACTOR_VALUE * FACTOR_COUNT

function normalizeFactor(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(
    MAX_FACTOR_VALUE,
    Math.max(0, Math.round(value)),
  )
}

export function calculateRisk(
  factors: RiskFactors,
): RiskResult {
  const wasteHazard = normalizeFactor(
    factors.wasteHazard,
  )

  const populationProximity = normalizeFactor(
    factors.populationProximity,
  )

  const waterProximity = normalizeFactor(
    factors.waterProximity,
  )

  const agricultureProximity = normalizeFactor(
    factors.agricultureProximity,
  )

  const wasteQuantity = normalizeFactor(
    factors.wasteQuantity,
  )

  const burning = normalizeFactor(
    factors.burning,
  )

  const leakage = normalizeFactor(
    factors.leakage,
  )

  const score =
    wasteHazard +
    populationProximity +
    waterProximity +
    agricultureProximity +
    wasteQuantity +
    burning +
    leakage

  let level: RiskLevel

  if (score <= 7) {
    level = 'منخفض'
  } else if (score <= 14) {
    level = 'متوسط'
  } else if (score <= 21) {
    level = 'مرتفع'
  } else {
    level = 'حرج'
  }

  const percentage = Math.round(
    (score / MAX_SCORE) * 100,
  )

  return {
    score,
    level,
    percentage,
  }
}