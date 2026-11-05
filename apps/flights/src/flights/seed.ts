import mongoose from 'mongoose';
import { FlightSchema } from './schemas/flight.schema';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cargo-dashboard';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const Flight = mongoose.model('Flight', FlightSchema);

  await Flight.deleteMany({});
  await Flight.insertMany([
    {
      flightNumber: 'MH610',
      origin: 'KUL',
      destination: 'SIN',
      departureAt: new Date('2026-11-08T02:00:00Z'),
      capacityKg: 18000,
      bookedKg: 14200,
      revenueUsd: 28500,
    },
    {
      flightNumber: 'SQ528',
      origin: 'SIN',
      destination: 'CGK',
      departureAt: new Date('2026-11-08T06:30:00Z'),
      capacityKg: 22000,
      bookedKg: 19800,
      revenueUsd: 41200,
    },
    {
      flightNumber: 'QR943',
      origin: 'DOH',
      destination: 'KUL',
      departureAt: new Date('2026-11-09T14:15:00Z'),
      capacityKg: 30000,
      bookedKg: 21000,
      revenueUsd: 67000,
    },
    {
      flightNumber: 'EK348',
      origin: 'DXB',
      destination: 'KUL',
      departureAt: new Date('2026-11-09T18:45:00Z'),
      capacityKg: 28000,
      bookedKg: 26500,
      revenueUsd: 72000,
    },
    {
      flightNumber: 'CX723',
      origin: 'HKG',
      destination: 'KUL',
      departureAt: new Date('2026-11-10T09:20:00Z'),
      capacityKg: 20000,
      bookedKg: 9000,
      revenueUsd: 19800,
    },
  ]);

  console.log('Seeded flights');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});