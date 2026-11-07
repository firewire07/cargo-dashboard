import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlightsService } from '../src/flights/flights.service';
import { AppModule } from '../src/app.module';

// HTTP routing test with a stubbed service: no MongoDB or upstream HTTP calls.
describe('Flights route (isolated HTTP)', () => {
  let app: INestApplication<App>;
  const flights = [{ flightNumber: 'DEMO001', origin: 'KUL', destination: 'SIN' }];

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FlightsService)
      .useValue({ findAll: () => Promise.resolve(flights) })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('/flights (GET) preserves the JSON response', () => {
    return request(app.getHttpServer()).get('/flights').expect(200).expect(flights);
  });

  afterEach(async () => {
    await app.close();
  });
});
