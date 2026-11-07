import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CapacityService {
  private readonly baseUrl =
    process.env.CAPACITY_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async getSummary(): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`${this.baseUrl}/capacity/summary`),
      );
      return data;
    } catch {
      throw new ServiceUnavailableException(
        'Capacity summary is temporarily unavailable',
      );
    }
  }
}