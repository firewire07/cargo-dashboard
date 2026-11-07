import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { CapacityService } from './capacity.service';
import type { FlightResponse } from './contracts/flight-response.interface';
import type { CapacitySummary } from './contracts/capacity-summary.interface';

// Fictional fixtures only. fetchFlights is mocked so no HTTP or database is used.
function flight(overrides: Partial<FlightResponse> = {}): FlightResponse {
  return {
    _id: 'demo-flight',
    flightNumber: 'DEMO001',
    origin: 'KUL',
    destination: 'SIN',
    departureAt: '2026-11-08T02:00:00.000Z',
    capacityKg: 100,
    bookedKg: 100,
    revenueUsd: 0,
    ...overrides,
  };
}

describe('CapacityService.getSummary', () => {
  let service: CapacityService;

  beforeEach(() => {
    service = new CapacityService(new HttpService());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses total booked / total capacity, not an average of flight percentages', async () => {
    const fetchFlights = jest.spyOn(service, 'fetchFlights').mockResolvedValue([
      flight({ capacityKg: 100, bookedKg: 100 }),
      flight({ _id: 'demo-flight-2', flightNumber: 'DEMO002', capacityKg: 900, bookedKg: 0 }),
    ]);
    const expected: CapacitySummary = {
      flightCount: 2,
      totalCapacityKg: 1000,
      totalBookedKg: 100,
      utilisationPercent: 10,
    };

    await expect(service.getSummary()).resolves.toEqual(expected);
    expect(fetchFlights).toHaveBeenCalledTimes(1);
  });

  it('returns zero totals and null utilisation for an empty flight list', async () => {
    jest.spyOn(service, 'fetchFlights').mockResolvedValue([]);
    const expected: CapacitySummary = {
      flightCount: 0,
      totalCapacityKg: 0,
      totalBookedKg: 0,
      utilisationPercent: null,
    };

    await expect(service.getSummary()).resolves.toEqual(expected);
  });

  it('returns null utilisation when a flight has zero capacity', async () => {
    jest.spyOn(service, 'fetchFlights').mockResolvedValue([
      flight({ capacityKg: 0, bookedKg: 0 }),
    ]);
    const expected: CapacitySummary = {
      flightCount: 1,
      totalCapacityKg: 0,
      totalBookedKg: 0,
      utilisationPercent: null,
    };

    await expect(service.getSummary()).resolves.toEqual(expected);
  });
});
