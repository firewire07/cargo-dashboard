import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CapacityService } from '../src/capacity/capacity.service';
import type { FlightResponse } from '../src/capacity/contracts/flight-response.interface';
import type { CapacitySummary } from '../src/capacity/contracts/capacity-summary.interface';

// Isolated HTTP tests: override the service so no upstream or database is used.
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

describe('Capacity routes (isolated HTTP)', () => {
  let app: INestApplication<App>;
  const fetchFlights = jest.fn<CapacityService['fetchFlights']>();
  const getSummary = jest.fn<CapacityService['getSummary']>();

  beforeEach(async () => {
    fetchFlights.mockReset().mockResolvedValue(flights);
    getSummary.mockReset().mockResolvedValue(summary);
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CapacityService)
      .useValue({ fetchFlights, getSummary })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /capacity/flights returns the flight array with HTTP 200', async () => {
    await request(app.getHttpServer())
      .get('/capacity/flights')
      .expect(200)
      .expect(flights);
    expect(fetchFlights).toHaveBeenCalledTimes(1);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it('GET /capacity/summary returns summary fields with HTTP 200', async () => {
    await request(app.getHttpServer())
      .get('/capacity/summary')
      .expect(200)
      .expect(summary);
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(fetchFlights).not.toHaveBeenCalled();
  });

  it('GET /capacity/flights propagates service unavailability as HTTP 503', async () => {
    fetchFlights.mockRejectedValueOnce(
      new ServiceUnavailableException('Flight data is temporarily unavailable'),
    );
    await request(app.getHttpServer())
      .get('/capacity/flights')
      .expect(503)
      .expect({
        statusCode: 503,
        message: 'Flight data is temporarily unavailable',
        error: 'Service Unavailable',
      });
  });

  it('GET /capacity/summary propagates service unavailability as HTTP 503', async () => {
    getSummary.mockRejectedValueOnce(
      new ServiceUnavailableException('Flight data is temporarily unavailable'),
    );
    await request(app.getHttpServer())
      .get('/capacity/summary')
      .expect(503)
      .expect({
        statusCode: 503,
        message: 'Flight data is temporarily unavailable',
        error: 'Service Unavailable',
      });
  });
});
