export interface Flight {
    _id: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureAt: string;
    capacityKg: number;
    bookedKg: number;
    revenueUsd: number;
  }