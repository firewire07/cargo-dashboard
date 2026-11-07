import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith } from 'rxjs';
import { DashboardApiService } from '../data-access/dashboard-api.service';
import type { CapacitySummary } from '../models/capacity-summary.interface';
import type { Flight } from '../models/flight.interface';

type DashboardState =
  | { status: 'loading' }
  | { status: 'success'; summary: CapacitySummary; flights: Flight[] }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(DashboardApiService);

  readonly state = toSignal(
    forkJoin({
      summary: this.api.getCapacitySummary(),
      flights: this.api.getFlights(),
    }).pipe(
      map(({ summary, flights }): DashboardState => ({
        status: 'success',
        summary,
        flights,
      })),
      startWith<DashboardState>({ status: 'loading' }),
      catchError(() =>
        of<DashboardState>({
          status: 'error',
          message: 'Unable to load the dashboard. Please try again later.',
        }),
      ),
    ),
    { requireSync: true },
  );
}