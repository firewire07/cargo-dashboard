export interface CapacitySummary {
    flightCount: number;
    totalCapacityKg: number;
    totalBookedKg: number;
    utilisationPercent: number | null;
  }