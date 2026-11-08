import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { DashboardApiService } from '../data-access/dashboard-api.service';
import type { CapacitySummary } from '../models/capacity-summary.interface';
import type { Flight } from '../models/flight.interface';

// Entirely fictional fixtures: no HTTP calls, backends or business data.
function demoFlights(): Flight[] {
  const routes = [
    { origin: 'KUL', destination: 'SIN' },
    { origin: 'SIN', destination: 'CGK' },
    { origin: 'DOH', destination: 'KUL' },
    { origin: 'DXB', destination: 'KUL' },
    { origin: 'HKG', destination: 'KUL' },
  ];
  return routes.map((route, index) => ({
    _id: `demo-flight-${index + 1}`,
    flightNumber: `DEMO00${index + 1}`,
    ...route,
    departureAt: '2026-11-08T02:00:00.000Z',
    capacityKg: 1000,
    bookedKg: 500,
    revenueUsd: 0,
  }));
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let root: HTMLElement;
  let flights: Flight[];
  let summary: CapacitySummary;
  let summaryResponse: Subject<CapacitySummary>;
  let flightsResponse: Subject<Flight[]>;
  let api: Pick<DashboardApiService, 'getCapacitySummary' | 'getFlights'>;

  beforeEach(async () => {
    flights = demoFlights();
    summary = {
      flightCount: 5,
      totalCapacityKg: 5000,
      totalBookedKg: 2500,
      utilisationPercent: 50,
    };
    summaryResponse = new Subject<CapacitySummary>();
    flightsResponse = new Subject<Flight[]>();
    api = {
      getCapacitySummary: vi.fn(() => summaryResponse.asObservable()),
      getFlights: vi.fn(() => flightsResponse.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: DashboardApiService, useValue: api }],
      teardown: { destroyAfterEach: true },
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    root = fixture.nativeElement as HTMLElement;
    await render();
  });

  afterEach(() => {
    // Complete pending mock streams even if a test assertion fails.
    summaryResponse.complete();
    flightsResponse.complete();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function loadDashboard(): Promise<void> {
    summaryResponse.next(summary);
    summaryResponse.complete();
    flightsResponse.next(flights);
    flightsResponse.complete();
    await render();
  }

  function shownFlightNumbers(): string[] {
    return Array.from(root.querySelectorAll('tbody th[scope="row"]'))
      .map((cell) => cell.textContent?.trim() ?? '');
  }

  function summaryValues(): string[] {
    return Array.from(root.querySelectorAll('dl dd'))
      .map((card) => card.textContent?.trim() ?? '');
  }

  async function enterFilter(labelText: string, value: string): Promise<void> {
    const label = Array.from(root.querySelectorAll('label'))
      .find((candidate) => candidate.textContent?.includes(labelText));
    const input = label?.querySelector('input');
    if (!input) throw new Error(`Missing filter input: ${labelText}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await render();
  }

  it('shows loading until both API responses complete, then renders summary and flights', async () => {
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Loading capacity');
    expect(root.querySelector('table')).toBeNull();
    expect(api.getCapacitySummary).toHaveBeenCalledTimes(1);
    expect(api.getFlights).toHaveBeenCalledTimes(1);

    summaryResponse.next(summary);
    summaryResponse.complete();
    flightsResponse.next(flights);
    await render();
    // forkJoin must wait for the flights stream to complete as well.
    expect(fixture.componentInstance.state().status).toBe('loading');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Loading capacity');

    flightsResponse.complete();
    await render();
    expect(fixture.componentInstance.state()).toEqual({ status: 'success', summary, flights });
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('5 flights shown.');
    expect(summaryValues()).toEqual(['5', '5,000 kg', '2,500 kg', '50.00%']);
    expect(shownFlightNumbers()).toEqual(flights.map((flight) => flight.flightNumber));
    expect(root.querySelectorAll('.utilisation-chart li')).toHaveLength(5);
  });

  it('displays the generic API error instead of dashboard data', async () => {
    flightsResponse.error(new Error('Fictional API failure'));
    await render();

    expect(fixture.componentInstance.state().status).toBe('error');
    expect(root.querySelector('[role="alert"]')?.textContent).toBe(
      'Unable to load the dashboard. Please try again later.',
    );
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelector('table')).toBeNull();
    expect(root.textContent).not.toContain('Fictional API failure');
  });

  it('filters the table and bars to three KUL destinations without changing summary cards', async () => {
    await loadDashboard();
    const allFlightSummary = summaryValues();
    await enterFilter('Destination airport code', 'KUL');

    expect(fixture.componentInstance.filteredFlights().map((flight) => flight.flightNumber))
      .toEqual(['DEMO003', 'DEMO004', 'DEMO005']);
    expect(shownFlightNumbers()).toEqual(['DEMO003', 'DEMO004', 'DEMO005']);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('3 flights shown.');
    expect(root.querySelectorAll('.utilisation-chart li')).toHaveLength(3);
    expect(summaryValues()).toEqual(allFlightSummary);
  });

  it('shows the empty state when SIN origin and KUL destination have no matching flights', async () => {
    await loadDashboard();
    await enterFilter('Origin airport code', 'SIN');
    await enterFilter('Destination airport code', 'KUL');

    expect(fixture.componentInstance.filteredFlights()).toEqual([]);
    expect(shownFlightNumbers()).toEqual([]);
    expect(root.querySelector('tbody')?.textContent).toContain('No flights available.');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('0 flights shown.');
    expect(root.querySelectorAll('.utilisation-chart li')).toHaveLength(0);
  });

  it('clears both filters through the button and restores all five flights', async () => {
    await loadDashboard();
    await enterFilter('Origin airport code', 'DOH');
    await enterFilter('Destination airport code', 'KUL');
    expect(shownFlightNumbers()).toEqual(['DEMO003']);

    const clearButton = Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Clear filters');
    if (!clearButton) throw new Error('Missing Clear filters button');
    clearButton.click();
    await render();

    expect(fixture.componentInstance.origin()).toBe('');
    expect(fixture.componentInstance.destination()).toBe('');
    expect(Array.from(root.querySelectorAll('input')).map((input) => input.value))
      .toEqual(['', '']);
    expect(shownFlightNumbers()).toEqual(flights.map((flight) => flight.flightNumber));
    expect(root.querySelector('[role="status"]')?.textContent).toContain('5 flights shown.');
    expect(root.querySelectorAll('.utilisation-chart li')).toHaveLength(5);
    expect(api.getCapacitySummary).toHaveBeenCalledTimes(1);
    expect(api.getFlights).toHaveBeenCalledTimes(1);
  });
});
