import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FlightsService } from './flights.service';
import { Flight } from './schemas/flight.schema';

describe('FlightsService', () => {
  it('queries flights sorted by departure ascending', async () => {
    const flights = [{ flightNumber: 'DEMO001' }];
    const exec = jest.fn(async () => flights);
    const sort = jest.fn().mockReturnValue({ exec });
    const find = jest.fn().mockReturnValue({ sort });
    const module = await Test.createTestingModule({
      providers: [
        FlightsService,
        { provide: getModelToken(Flight.name), useValue: { find } },
      ],
    }).compile();

    try {
      await expect(module.get(FlightsService).findAll()).resolves.toBe(flights);
      expect(find).toHaveBeenCalledWith();
      expect(sort).toHaveBeenCalledWith({ departureAt: 1 });
      expect(exec).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
  });
});
