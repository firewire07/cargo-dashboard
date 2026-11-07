# Cargo dashboard

A learning project for a cargo-flight dashboard, built one working slice at a time.

## Where we are

- Implemented: MongoDB in Docker, a Nest flights data service with schema/indexes and a demo seed, and a Nest HTTP gateway forwarding `GET /flights`.
- Implemented: capacity on port 3002 reads flights and calculates `GET /capacity/summary`; the gateway also forwards this summary route.
- Planned next: Angular table/chart, filters, application containers, project-specific tests and CI.
- The Nest apps currently run **on the host in separate terminals**. Only MongoDB is containerised. These are separate HTTP services, not Nest microservice transport clients/servers.

```text
curl / future Angular UI
        |
        v
 gateway :3000 --HTTP--> flights :3001 --> MongoDB :27017
        |
        +--HTTP--> capacity :3002 --HTTP--> flights :3001
```

| Component | Responsibility | Guide |
| --- | --- | --- |
| `apps/flights` | Own flight documents and return them sorted by departure | [Flights README](apps/flights/README.md) |
| `apps/gateway` | One API entry point; forward flight requests | [Gateway README](apps/gateway/README.md) |
| `docker-compose.yml` | Run `mongo:7` with the `mongo_data` volume | Steps below |

## Prerequisites

- Node.js and npm. Neither app declares a top-level `engines` field. The locked Nest core requires Node >=20, CLI >=20.11, and Mongoose >=20.19.0; use a supported Node release satisfying these requirements (at least 20.19.0 for this project).
- Docker Desktop running, with Docker Compose (`docker compose`).
- `curl` for API checks; ports 27017, 3000, 3001 and 3002 available.

Replace `/path/to/cargo-dashboard` in the commands below with your own checkout location; it is a placeholder, not a required directory.

## Run locally

### 1. Install each app's dependencies

```bash
cd /path/to/cargo-dashboard/apps/flights
npm ci
cd /path/to/cargo-dashboard/apps/gateway
npm ci
cd /path/to/cargo-dashboard/apps/capacity
npm ci
```

`npm ci` installs from each app's committed lockfile for repeatable setup. Run it inside each app, not in `apps/`. It replaces that app's installed dependency tree; it is not needed at every startup.

### 2. Start MongoDB and wait for readiness

```bash
cd /path/to/cargo-dashboard
docker compose up -d mongo
docker compose ps mongo
docker compose logs --tail=50 mongo
docker compose exec mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'
```

A started container is not necessarily ready. Wait until the ping returns `ok: 1`; if it fails during startup, check logs and retry the ping before seeding. `-d` leaves Mongo running in the background. The named volume keeps data between restarts.

This Compose configuration publishes Mongo on host port 27017 without authentication; it is a local-development setup, not a production deployment or a database to expose publicly.

### 3. Seed the development database

> **Data loss warning:** `npm run seed` deletes ALL flight documents in the selected database before inserting five fictional demo records. Every rerun replaces flight data. Use only a disposable development database, never production. Check any existing `MONGODB_URI` override first. Deletion and insertion are not transactional; an insertion failure can leave the collection empty.

```bash
cd /path/to/cargo-dashboard/apps/flights
MONGODB_URI=mongodb://localhost:27017/cargo-dashboard npm run seed
```

Expected success message: `Seeded flights`. Seed once for the demo, not on every API request or restart. The explicit URI above keeps this command aimed at the local development database.

### 4. Start flights — terminal A

```bash
cd /path/to/cargo-dashboard/apps/flights
MONGODB_URI=mongodb://localhost:27017/cargo-dashboard PORT=3001 npm run start:dev
```

Wait for Nest's successful startup message. Watch mode rebuilds when source files change; keep this terminal open.

### 5. Start gateway — terminal B

```bash
cd /path/to/cargo-dashboard/apps/gateway
FLIGHTS_URL=http://localhost:3001 CAPACITY_URL=http://localhost:3002 PORT=3000 npm run start:dev
```

Wait for successful startup here too. The gateway needs the flights service to answer requests; it does not query Mongo directly.

### 6. Start capacity — terminal C

```bash
cd /path/to/cargo-dashboard/apps/capacity
FLIGHTS_URL=http://localhost:3001 PORT=3002 npm run start:dev
```

Capacity reads flights over HTTP; leave flights running. Wait for successful startup.

### 7. Verify — terminal D

```bash
curl -i http://localhost:3001/flights
curl -i http://localhost:3000/flights
curl -i http://localhost:3000/capacity/summary
```

The two flights calls should return HTTP 200 and the same flight array. Immediately after a successful seed, there should be five records sorted by `departureAt` ascending. The summary call should return aggregate capacity data and requires all three apps. The direct flights call isolates the data service; the gateway call verifies the complete HTTP path. These are instructions, not a claim that tests were run for this documentation update.

## Stop and resume

Press **Ctrl+C** in each Nest terminal. To stop Mongo while keeping its data:

```bash
cd /path/to/cargo-dashboard
docker compose stop mongo
```

Resume with `docker compose up -d mongo`, check readiness, then restart all three Nest apps. The volume persists: do not reseed unless you intend to replace the flight records.

## Configuration and troubleshooting

Values are read from `process.env`; the current bootstrap does not configure automatic `.env` loading. Use inline variables as above or `export` in each terminal. Exports in one terminal do not configure another.

- Flights: `PORT=3001`, `MONGODB_URI=mongodb://localhost:27017/cargo-dashboard` by default.
- Gateway: `PORT=3000`, `FLIGHTS_URL=http://localhost:3001`, `CAPACITY_URL=http://localhost:3002` by default. Use a base URL without `/flights` or a trailing slash.
- Capacity: `PORT=3002`, `FLIGHTS_URL=http://localhost:3001` by default.
- Mongo connection failure: check Docker, readiness ping and URI; see the [flights guide](apps/flights/README.md).
- Direct call works but gateway fails: check the gateway's upstream URL and flights availability; see the [gateway guide](apps/gateway/README.md).
- `EADDRINUSE`: another process already owns the port. Stop your previous app or choose another `PORT`; update `FLIGHTS_URL` if flights moves.
- Empty array: check both seed and service target the same development database. Reseeding is destructive, not a general troubleshooting reset.

## Performance learning notes

- Mongo performs the departure sort; the schema declares a departure index and a compound origin/destination index to support query patterns. Route filtering is not implemented yet. Actual index use and speed need query-plan inspection and measurement.
- The seed is a one-off write, not request-time work. A persistent volume improves development continuity, not proof of API speed.
- The gateway keeps upstream locations out of the future UI, but adds a network hop. Separate services enable independent scaling; they do not automatically make a small app faster.
- Current listing returns all documents with no pagination, projection or `.lean()`. Pagination and measured query tuning are future work, not existing optimisations.

## Feature-based Nest layout

Each app remains an independent npm project. `main.ts` bootstraps the app; `app.module.ts` wires features and root configuration. Controllers, services and unit tests live together inside the relevant feature folder. HTTP tests remain in each app's `test/` directory.

```text
apps/
├── flights/src/
│   ├── main.ts
│   ├── app.module.ts              # Mongo connection + FlightsModule
│   └── flights/
│       ├── flights.module.ts
│       ├── flights.controller.ts
│       ├── flights.controller.spec.ts
│       ├── flights.service.ts
│       ├── flights.service.spec.ts
│       ├── schemas/flight.schema.ts
│       └── seed.ts
├── gateway/src/
│   ├── main.ts
│   ├── app.module.ts              # FlightsModule
│   └── flights/
│       ├── flights.module.ts
│       ├── flights.controller.ts
│       ├── flights.controller.spec.ts
│       ├── flights.service.ts
│       └── flights.service.spec.ts
└── capacity/src/
    ├── main.ts
    ├── app.module.ts              # CapacityModule
    └── capacity/
        ├── capacity.module.ts
        ├── capacity.controller.ts
        ├── capacity.controller.spec.ts
        ├── capacity.service.ts
        └── contracts/flight-response.interface.ts
```

The [capacity guide](apps/capacity/README.md) describes its HTTP dependency and summary endpoint. Its local `FlightResponse` interface describes a possible HTTP payload, not an imported database entity. No shared library, `core` layer or workspace migration is needed for this small project.

This reorganisation improves navigation and maintainability, not runtime speed. Existing `/flights` endpoints and the flights seed location/command are unchanged. Unit tests use mocked dependencies; flights/gateway HTTP tests stub the feature service and do not verify a real database or upstream. Live end-to-end verification is still the manual startup/curl flow above.

Test configuration explicitly sets the source root for TypeScript 6 and uses Jest's ESM transform/VM-modules runtime for the installed Nest dependencies. Node may print an experimental VM-modules warning; this does not change the applications' runtime module layout.

## Switching from the previous ports

Stop **both flights and gateway** with Ctrl+C before starting either on its new port to avoid a port conflict. Restart flights on 3001, gateway on 3000, and capacity on 3002 so it picks up the new flights URL. Existing shell `PORT`/`FLIGHTS_URL` exports override defaults; use the explicit startup commands above or update those exports. No database reseed is needed.
