import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CapacitySummary } from '../models/capacity-summary.interface';
import type { Flight } from '../models/flight.interface';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  getCapacitySummary(): Observable<CapacitySummary> {
    return this.http.get<CapacitySummary>('/api/capacity/summary');
  }

  getFlights(): Observable<Flight[]> {
    return this.http.get<Flight[]>('/api/flights');
  }
}