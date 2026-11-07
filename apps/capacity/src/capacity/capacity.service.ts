import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { FlightResponse } from './contracts/flight-response.interface';
import { CapacitySummary } from './contracts/capacity-summary.interface';

@Injectable()
export class CapacityService {
  private readonly flightsUrl =
    process.env.FLIGHTS_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async fetchFlights(): Promise<FlightResponse[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<FlightResponse[]>(`${this.flightsUrl}/flights`),
      );

      return response.data;
    } catch {
      throw new ServiceUnavailableException(
        'Flight data is temporarily unavailable',
      );
    }
  }

  async getSummary(): Promise<CapacitySummary> {
    const flights = await this.fetchFlights();
  
    const totals = flights.reduce(
      (sum, flight) => ({
        capacityKg: sum.capacityKg + flight.capacityKg,
        bookedKg: sum.bookedKg + flight.bookedKg,
      }),
      { capacityKg: 0, bookedKg: 0 },
    );
  
    return {
      flightCount: flights.length,
      totalCapacityKg: totals.capacityKg,
      totalBookedKg: totals.bookedKg,
      utilisationPercent:
        totals.capacityKg === 0
          ? null
          : Number(
              ((totals.bookedKg / totals.capacityKg) * 100).toFixed(2),
            ),
    };
  }
}