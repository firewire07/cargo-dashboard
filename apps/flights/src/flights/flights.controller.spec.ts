import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';

describe('FlightsController', () => {
  it('returns the service result without changing its shape', async () => {
    const flights = [{ flightNumber: 'DEMO001', origin: 'KUL', destination: 'SIN' }];
    const findAll = jest.fn(async () => flights);
    const module = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [{ provide: FlightsService, useValue: { findAll } }],
    }).compile();

    try {
      const controller = module.get(FlightsController);
      await expect(controller.findAll()).resolves.toBe(flights);
      expect(findAll).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
  });
});
