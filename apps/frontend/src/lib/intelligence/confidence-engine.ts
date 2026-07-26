/**
 * Confidence Engine (EKVAAR OS v3.2)
 * 
 * Calculates, validates, and justifies confidence scores (0-100%) for AI agent recommendations.
 * Features Confidence Decay over time to ensure stale data automatically degrades trust.
 */

export interface ConfidenceAssessment {
  score: number // 0 - 100
  rating: 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'NEEDS_VERIFICATION'
  reasons: string[]
  decayAppliedPercent: number
  factors: {
    dataCompleteness: number // 0 - 100
    salesVelocityMatch: number // 0 - 100
    supplierReliability: number // 0 - 100
    historicalVariance: number // 0 - 100
  }
}

export class ConfidenceEngine {
  /**
   * Applies Confidence Decay based on how old the underlying data is
   */
  static calculateDecay(dataAgeMinutes: number): number {
    if (dataAgeMinutes <= 60) return 0 // Fresh data (< 1 hour): 0% decay
    if (dataAgeMinutes <= 360) return 5 // 1 - 6 hours: 5% decay
    if (dataAgeMinutes <= 1440) return 15 // 6 - 24 hours: 15% decay
    return 30 // > 24 hours: 30% decay
  }

  /**
   * Evaluates an operational recommendation and returns structured confidence metrics
   */
  static evaluate(params: {
    businessObjectType: string
    action: string
    historicalDataPoints: number
    dataQualityScore?: number
    supplierLeadTimeDays?: number
    salesVelocitySurgePercent?: number
    dataAgeMinutes?: number
  }): ConfidenceAssessment {
    const completeness = Math.min(100, (params.historicalDataPoints / 30) * 100)
    const velocityMatch = Math.min(100, Math.max(50, 100 - Math.abs(params.salesVelocitySurgePercent || 0) * 0.5))
    const supplierScore = params.supplierLeadTimeDays ? (params.supplierLeadTimeDays <= 7 ? 95 : 75) : 85
    const varianceScore = (params.dataQualityScore || 90)

    // Weighted base score formula
    const weightedScore = Math.round(
      completeness * 0.35 +
      velocityMatch * 0.25 +
      supplierScore * 0.20 +
      varianceScore * 0.20
    )

    // Apply confidence decay based on data age
    const decayPercent = this.calculateDecay(params.dataAgeMinutes || 0)
    const finalScore = Math.max(10, Math.min(99, Math.round(weightedScore * (1 - decayPercent / 100))))
    
    let rating: ConfidenceAssessment['rating'] = 'HIGH_CONFIDENCE'
    if (finalScore < 85 && finalScore >= 70) rating = 'MODERATE_CONFIDENCE'
    if (finalScore < 70) rating = 'NEEDS_VERIFICATION'

    const reasons: string[] = []
    if (completeness >= 80) reasons.push(`Analyzed ${params.historicalDataPoints} trailing sales data points`)
    if (params.salesVelocitySurgePercent) reasons.push(`Detected ${params.salesVelocitySurgePercent}% velocity change`)
    if (params.supplierLeadTimeDays) reasons.push(`Vendor lead time verified at ${params.supplierLeadTimeDays} days`)
    if (decayPercent > 0) reasons.push(`Confidence decayed by ${decayPercent}% due to data age (${params.dataAgeMinutes}m old)`)
    reasons.push(`Data quality index at ${varianceScore}%`)

    return {
      score: finalScore,
      rating,
      reasons,
      decayAppliedPercent: decayPercent,
      factors: {
        dataCompleteness: Math.round(completeness),
        salesVelocityMatch: Math.round(velocityMatch),
        supplierReliability: supplierScore,
        historicalVariance: varianceScore,
      },
    }
  }
}
