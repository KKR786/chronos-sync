/**
 * @license Apache-2.0
 * Domain Service: PredictiveDurationAuditor
 * Logs historical completion metrics and flags tasks with unrealistic allocated durations.
 */

export interface HistoricalMetricRecord {
  id: string;
  userId: string;
  category: string;
  estimatedMinutes: number;
  actualMinutes: number;
  variancePercentage: number;
  loggedAt: Date;
}

export interface EstimationAuditReport {
  isUnrealistic: boolean;
  confidence: number;
  category: string;
  allocatedMinutes: number;
  historicalAverageMinutes: number;
  historicalSampleCount: number;
  recommendedDurationMinutes: number;
  varianceRiskPercentage: number;
  advisoryMessage: string;
}

export class PredictiveDurationAuditor {
  private static historicalStore: HistoricalMetricRecord[] = [
    { id: '1', userId: 'default', category: 'ARCHITECTURE', estimatedMinutes: 45, actualMinutes: 90, variancePercentage: 100, loggedAt: new Date(Date.now() - 86400000 * 5) },
    { id: '2', userId: 'default', category: 'ARCHITECTURE', estimatedMinutes: 60, actualMinutes: 120, variancePercentage: 100, loggedAt: new Date(Date.now() - 86400000 * 4) },
    { id: '3', userId: 'default', category: 'ARCHITECTURE', estimatedMinutes: 30, actualMinutes: 75, variancePercentage: 150, loggedAt: new Date(Date.now() - 86400000 * 2) },
    { id: '4', userId: 'default', category: 'CODE_REVIEW', estimatedMinutes: 20, actualMinutes: 25, variancePercentage: 25, loggedAt: new Date(Date.now() - 86400000 * 3) },
    { id: '5', userId: 'default', category: 'CODE_REVIEW', estimatedMinutes: 30, actualMinutes: 35, variancePercentage: 16.6, loggedAt: new Date(Date.now() - 86400000 * 1) },
    { id: '6', userId: 'default', category: 'DATABASE_MIGRATION', estimatedMinutes: 30, actualMinutes: 80, variancePercentage: 166.7, loggedAt: new Date(Date.now() - 86400000 * 6) },
    { id: '7', userId: 'default', category: 'TESTING', estimatedMinutes: 40, actualMinutes: 55, variancePercentage: 37.5, loggedAt: new Date(Date.now() - 86400000 * 7) },
  ];

  public static recordMetric(record: Omit<HistoricalMetricRecord, 'id' | 'loggedAt' | 'variancePercentage'>): HistoricalMetricRecord {
    const variance = ((record.actualMinutes - record.estimatedMinutes) / Math.max(record.estimatedMinutes, 1)) * 100;
    const newEntry: HistoricalMetricRecord = {
      ...record,
      id: crypto.randomUUID(),
      variancePercentage: Number(variance.toFixed(1)),
      loggedAt: new Date(),
    };
    this.historicalStore.push(newEntry);
    return newEntry;
  }

  public static auditTask(
    taskTitle: string,
    allocatedMinutes: number,
    userId: string = 'default'
  ): EstimationAuditReport {
    // Categorize task from title
    const category = this.categorizeTitle(taskTitle);
    const relevantRecords = this.historicalStore.filter((r) => r.category === category);

    if (relevantRecords.length === 0) {
      return {
        isUnrealistic: false,
        confidence: 0.4,
        category,
        allocatedMinutes,
        historicalAverageMinutes: allocatedMinutes,
        historicalSampleCount: 0,
        recommendedDurationMinutes: allocatedMinutes,
        varianceRiskPercentage: 0,
        advisoryMessage: 'Insufficient historical samples for this category. Standard allocation applied.',
      };
    }

    const totalActual = relevantRecords.reduce((sum, r) => sum + r.actualMinutes, 0);
    const avgActual = Math.round(totalActual / relevantRecords.length);

    // If allocated duration is less than 60% of historical average, flag as unrealistic!
    const ratio = allocatedMinutes / avgActual;
    const isUnrealistic = ratio < 0.65;
    const varianceRisk = Math.round(((avgActual - allocatedMinutes) / avgActual) * 100);

    return {
      isUnrealistic,
      confidence: Math.min(0.95, 0.5 + relevantRecords.length * 0.1),
      category,
      allocatedMinutes,
      historicalAverageMinutes: avgActual,
      historicalSampleCount: relevantRecords.length,
      recommendedDurationMinutes: Math.max(allocatedMinutes, avgActual),
      varianceRiskPercentage: Math.max(0, varianceRisk),
      advisoryMessage: isUnrealistic
        ? `⚠️ High Overrun Risk: Tasks in [${category}] historically average ${avgActual}m (allocated: ${allocatedMinutes}m, -${varianceRisk}% deficit). Recommended buffer expansion: +${avgActual - allocatedMinutes}m.`
        : `Allocated duration of ${allocatedMinutes}m aligns with historical average (${avgActual}m).`,
    };
  }

  public static getMetrics(): HistoricalMetricRecord[] {
    return [...this.historicalStore];
  }

  private static categorizeTitle(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('architect') || lower.includes('design') || lower.includes('dag') || lower.includes('system')) {
      return 'ARCHITECTURE';
    }
    if (lower.includes('review') || lower.includes('pr ') || lower.includes('audit')) {
      return 'CODE_REVIEW';
    }
    if (lower.includes('migration') || lower.includes('schema') || lower.includes('database') || lower.includes('prisma')) {
      return 'DATABASE_MIGRATION';
    }
    if (lower.includes('test') || lower.includes('e2e') || lower.includes('qa')) {
      return 'TESTING';
    }
    if (lower.includes('meeting') || lower.includes('sync') || lower.includes('standup')) {
      return 'COLLABORATION';
    }
    return 'GENERAL';
  }
}
