import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FlightsService {
  private readonly baseUrl =
    process.env.FLIGHTS_URL ?? 'http://localhost:3000';

  constructor(private readonly http: HttpService) {}

  async findAll() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/flights`),
    );
    return data;
  }
}