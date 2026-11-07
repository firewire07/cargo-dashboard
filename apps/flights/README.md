# Flights data service

Nest + Mongoose service owning flight documents in MongoDB. `GET /flights` reads all flights and sorts by `departureAt` ascending. The schema includes flight number, origin/destination, departure time, capacity/booked kilograms and revenue in USD, plus timestamps.

[Main project guide](../../README.md) — architecture, prerequisites and full startup order.

## Install and run

Replace `/path/to/cargo-dashboard` below with your own checkout location.

Use Node/npm meeting the [root prerequisites](../../README.md#prerequisites). Mongo must be ready before seeding or starting this service. Only Mongo runs in Docker; this Nest app runs on your host.

```bash
cd /path/to/cargo-dashboard/apps/flights
npm ci
```

Start Mongo from the repository root:

```bash
cd /path/to/cargo-dashboard
docker compose up -d mongo
docker compose logs --tail=50 mongo
docker compose exec mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'
```

Wait for `ok: 1` (retry the ping if Mongo is still starting). Then, in a dedicated terminal:

```bash
cd /path/to/cargo-dashboard/apps/flights
MONGODB_URI=mongodb://localhost:27017/cargo-dashboard PORT=3001 npm run start:dev
```

Watch mode recompiles on source changes. Wait for Nest startup, then check from another terminal:

```bash
curl -i http://localhost:3001/flights
```

Expected: HTTP 200 with a JSON array, empty if no flights exist. There are no list filters or pagination yet. Stop the service with **Ctrl+C**. Use the [root stop instructions](../../README.md#stop-and-resume) to stop Mongo without removing its data.

## Development seed

> **Destructive: development databases only.** The script calls `deleteMany({})` on the flight model, then inserts five fictional demo flights. Every run replaces ALL flight data in the selected database. Never point it at production or valuable records. The two operations are not transactional; failed insertion may leave an empty collection.

After Mongo is ready and dependencies are installed:

```bash
cd /path/to/cargo-dashboard/apps/flights
MONGODB_URI=mongodb://localhost:27017/cargo-dashboard npm run seed
```

Success prints `Seeded flights` and disconnects. The explicit URI targets the local development database. The script itself also accepts `MONGODB_URI`, so verify the target before using a different value. Seed only when you want to initialise/replace demo data; do not run it on every startup. The five records are fictional learning data, not live airline data.

## Environment

| Variable | Default | Used by |
| --- | --- | --- |
| `PORT` | `3001` | HTTP listener |
| `MONGODB_URI` | `mongodb://localhost:27017/cargo-dashboard` | API and seed |

The code reads `process.env` directly and does not configure automatic `.env` loading. Set variables inline as above or use `export` in the terminal running the command. Keep seed and API pointed at the same development database. If you change the service port, update both the gateway's and capacity service's `FLIGHTS_URL` in their respective terminals too.

## Why these choices?

- Mongo does the sort instead of Node sorting an array. Schema indexes on `departureAt` and `(origin, destination)` support relevant query patterns; index use/performance must be measured, not assumed. Route filtering is future work.
- Seeding separately avoids writes during list requests.
- The current query returns all hydrated Mongoose documents; it does not yet use `.lean()`, field projection or pagination. Those are possible later improvements, not implemented performance claims.

## Troubleshooting

- Connection refused / Mongoose retries: check Docker is running, ping Mongo as above, and confirm the URI/port. The Compose host port is 27017.
- Empty array: a fresh database has no records. Check the API and seed URI match before considering the destructive seed.
- `EADDRINUSE`: stop your earlier flights process or select another `PORT`; adjust the gateway URL as well.
- Missing packages or Nest DI errors: install with `npm ci` in **this app directory**, not its parent. Do not delete unrelated directories as a troubleshooting shortcut.

## Other npm scripts

`npm run build` compiles; `npm start` runs without watch mode. For a built run, use `npm run build` before `npm run start:prod`. `npm run lint`, `npm test`, `npm run test:e2e` and `npm run test:cov` are available scripts. Unit tests now live beside the feature controller/service. HTTP tests in `test/` stub the service and verify `/flights` routing without a database; they are not live Mongo integration coverage.

## Feature organisation

`src/main.ts` handles bootstrap and `src/app.module.ts` wires root setup. The flight feature lives in `src/flights/` with its module, controller, service and co-located `*.spec.ts` unit tests. HTTP tests stay in `test/app.e2e-spec.ts`. Unused generated root controllers/services have been removed; `/flights` behaviour is unchanged.

The Mongo schema stays in `src/flights/schemas/flight.schema.ts`, and `src/flights/seed.ts` still backs `npm run seed`. Database model types stay inside this data service.
