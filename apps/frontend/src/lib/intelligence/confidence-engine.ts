/**
 * Confidence Engine (EKVAAR OS v3.1)
 * 
 * Calculates, validates, and justifies confidence scores (0-100%) for AI agent recommendations.
 * Ensures AI outputs are never presented without structured evidence and reasoning factors.
 */

export interface ConfidenceAssessment {
  score: number // 0 - 100
  rating: 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'NEEDS_VERIFICATION'
  reasons: string[]
  factors: {
    dataCompleteness: number // 0 - 100
    salesVelocityMatch: number // 0 - 100
    supplierReliability: number // 0 - 100
    historicalVariance: number // 0 - 100
  }
}

export class ConfidenceEngine {
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
  }): ConfidenceAssessment {
    const completeness = Math.min(100, (params.historicalDataPoints / 30) * 100)
    const velocityMatch = Math.min(100, Math.max(50, 100 - Math.abs(params.salesVelocitySurgePercent || 0) * 0.5))
    const supplierScore = params.supplierLeadTimeDays ? (params.supplierLeadTimeDays <= 7 ? 95 : 75) : 85
    const varianceScore = (params.dataQualityScore || 90)

    // Weighted score formula
    const weightedScore = Math.round(
      completeness * 0.35 +
      velocityMatch * 0.25 +
      supplierScore * 0.20 +
      varianceScore * 0.20
    )

    const score = Math.max(10, Math.min(99, weightedScore))
    
    let rating: ConfidenceAssessment['rating'] = 'HIGH_CONFIDENCE'
    if (score < 85 && score >= 70) rating = 'MODERATE_CONFIDENCE'
    if (score < 70) rating = 'NEEDS_VERIFICATION'

    const reasons: string[] = []
    if (completeness >= 80) reasons.push(`Analyzed ${params.historicalDataPoints} trailing sales data points`)
    if (params.salesVelocitySurgePercent) reasons.push(`Detected ${params.salesVelocitySurgePercent}% velocity change`)
    if (params.supplierLeadTimeDays) reasons.push(`Vendor lead time verified at ${params.supplierLeadTimeDays} days`)
    reasons.push(`Data quality index at ${varianceScore}%`)

    return {
      score,
      rating,
      reasons,
      factors: {
        dataCompleteness: Math.round(completeness),
        salesVelocityMatch: Math.round(velocityMatch),
        supplierReliability: supplierScore,
        historicalVariance: varianceScore,
      },
    }
  }
}
