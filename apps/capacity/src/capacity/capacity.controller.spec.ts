import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import type { FlightResponse } from './contracts/flight-response.interface';
import type { CapacitySummary } from './contracts/capacity-summary.interface';

// Fictional data; the controller delegates to a mock, never a real upstream.
const flights: FlightResponse[] = [{
  _id: 'demo-flight',
  flightNumber: 'DEMO001',
  origin: 'KUL',
  destination: 'SIN',
  departureAt: '2026-11-08T02:00:00.000Z',
  capacityKg: 1000,
  bookedKg: 100,
  revenueUsd: 0,
}];
const summary: CapacitySummary = {
  flightCount: 1,
  totalCapacityKg: 1000,
  totalBookedKg: 100,
  utilisationPercent: 10,
};

describe('CapacityController', () => {
  let module: TestingModule;
  let controller: CapacityController;
  const fetchFlights = jest.fn<CapacityService['fetchFlights']>();
  const getSummary = jest.fn<CapacityService['getSummary']>();

  beforeEach(async () => {
    fetchFlights.mockReset().mockResolvedValue(flights);
    getSummary.mockReset().mockResolvedValue(summary);
    module = await Test.createTestingModule({
      controllers: [CapacityController],
      providers: [{
        provide: CapacityService,
        useValue: { fetchFlights, getSummary },
      }],
    }).compile();
    controller = module.get(CapacityController);
  });

  afterEach(async () => {
    await module.close();
  });

  it('delegates getFlights to fetchFlights and returns its result unchanged', async () => {
    await expect(controller.getFlights()).resolves.toBe(flights);
    expect(fetchFlights).toHaveBeenCalledTimes(1);
    expect(fetchFlights).toHaveBeenCalledWith();
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('delegates getSummary to the service and returns its result unchanged', async () => {
    await expect(controller.getSummary()).resolves.toBe(summary);
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(getSummary).toHaveBeenCalledWith();
    expect(fetchFlights).not.toHaveBeenCalled();
  });
});
