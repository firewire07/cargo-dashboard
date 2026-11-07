import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { FlightsService } from './flights.service';

describe('FlightsService', () => {
  it('forwards to the configured flights URL and returns the response body', async () => {
    const previousUrl = process.env.FLIGHTS_URL;
    process.env.FLIGHTS_URL = 'http://localhost:3100';
    const flights = [{ flightNumber: 'DEMO001' }];
    const get = jest.fn().mockReturnValue(of({ data: flights }));
    try {
      const module = await Test.createTestingModule({
        providers: [FlightsService, { provide: HttpService, useValue: { get } }],
      }).compile();
      try {
        await expect(module.get(FlightsService).findAll()).resolves.toBe(flights);
        expect(get).toHaveBeenCalledWith('http://localhost:3100/flights');
      } finally {
        await module.close();
      }
    } finally {
      if (previousUrl === undefined) delete process.env.FLIGHTS_URL;
      else process.env.FLIGHTS_URL = previousUrl;
    }
  });
});
