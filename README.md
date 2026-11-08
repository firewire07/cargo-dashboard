# Cargo dashboard

A learning project built one working slice at a time: Nest HTTP services, MongoDB and an Angular dashboard using fictional demonstration data.

## Where we are

- Angular/Nginx, Mongo, flights, capacity and gateway run together in Docker Compose.
- Flights owns the Mongo documents; capacity reads flights over HTTP and calculates totals/weighted utilisation; gateway exposes `/flights` and `/capacity/summary`.
- Angular is served as a production static build by Nginx on `http://localhost:8080`; host hot reload on 4200 remains optional. The dashboard includes summary cards, a flight table, filters and utilisation bars.
- See [current architecture and horizontal scaling design](docs/architecture.md) for implemented boundaries versus future production plans.
- Automated component/unit and isolated HTTP tests exist. CI and production deployment hardening remain future work.

```text
Browser → Angular/Nginx :8080 → /api reverse proxy → gateway :3000
                                                ├─HTTP→ flights :3001 → mongo :27017
                                                └─HTTP→ capacity :3002 ─HTTP→ flights :3001
```

These are independent npm apps communicating over HTTP, not Nest microservice transport clients/servers.

| Component | Compose address / host access | Guide |
| --- | --- | --- |
| Flights | `http://flights:3001` / `http://localhost:3001` | [Flights](apps/flights/README.md) |
| Capacity | `http://capacity:3002` / `http://localhost:3002` | [Capacity](apps/capacity/README.md) |
| Gateway | `http://gateway:3000` / `http://localhost:3000` | [Gateway](apps/gateway/README.md) |
| MongoDB | `mongodb://mongo:27017/cargo-dashboard` / host port 27017 | Steps below |
| Angular/Nginx | `http://localhost:8080` (optional host hot reload: 4200) | [Web](apps/web/README.md) |

## Prerequisites

- Docker Desktop/Engine running, with Docker Compose (`docker compose`). Frontend/backend dependencies and builds happen inside Docker; host Node/npm is not needed to start the full stack.
- `curl` for manual HTTP checks; host ports 27017, 3000, 3001, 3002 and 8080 available (4200 only for optional host development).
- For host development or seeding: compatible Node/npm and the relevant app's installed dependencies. Dockerfiles pin Node `22.19.0-bookworm-slim`. Web declares Node `22.x >=22.19.0`; its npm engine and package manager both specify npm 11.6.2.

Replace `/path/to/cargo-dashboard` with your checkout location in all examples.

## Run the Docker backend

### 1. Switch off conflicting host processes

If you previously ran Nest with `npm run start:dev`, press **Ctrl+C** in all three Nest terminals before starting Compose. Do not run host and container versions on the same ports. Angular can remain on port 4200. No database reseed is needed when switching modes.

### 2. Build images and start containers

```bash
cd /path/to/cargo-dashboard
docker compose up -d --build
```

This builds the three Nest images and the Angular/Nginx image, then starts all five services in the background. Open **http://localhost:8080/** for the dashboard. Images are reusable packaged filesystems; containers are running instances of those images. Source is copied into images, not bind-mounted: after backend source/dependency changes, run the command again to rebuild/recreate affected services. Restarting alone does not rebuild code.

Compose sets production mode and service addresses explicitly:

- Flights: `PORT=3001`, `MONGODB_URI=mongodb://mongo:27017/cargo-dashboard`.
- Capacity: `PORT=3002`, `FLIGHTS_URL=http://flights:3001`.
- Gateway: `PORT=3000`, `FLIGHTS_URL=http://flights:3001`, `CAPACITY_URL=http://capacity:3002`.

Inside a container, `localhost` means that container—not another service. Compose DNS supplies `mongo`, `flights` and `capacity`. Host commands/browser requests use `localhost` instead.

### 3. Check status, readiness and logs

```bash
cd /path/to/cargo-dashboard
docker compose ps
docker compose logs --tail=50 mongo flights capacity gateway
docker compose exec mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'
```

Mongo has a healthcheck (5-second interval/timeout, 10 retries, 10-second start period). Flights waits for Mongo's `service_healthy`. Capacity/gateway use startup-order dependencies only: they do **not** wait for HTTP readiness or provide ongoing recovery guarantees. No Nest HTTP healthchecks are configured. Wait for Nest startup logs and verify endpoints; transient errors during startup can need a retry. For live troubleshooting, use `docker compose logs -f gateway capacity flights` and press Ctrl+C to stop following logs (not the containers).

### 4. Verify the HTTP path

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/flights
curl -i http://localhost:8080/api/capacity/summary
curl -i http://localhost:3001/flights
curl -i http://localhost:3002/capacity/summary
curl -i http://localhost:3000/flights
curl -i http://localhost:3000/capacity/summary
```

Expect HTTP 200: flight calls return an array, summary calls return aggregate fields. A new empty database returns no flights; summary utilisation is null when total capacity is zero. Existing seeded data should survive normal stop/down and up. The application does not seed automatically. See [development seed](apps/flights/README.md#development-seed) only if you intentionally want to initialise/replace fictional development records.

## Angular on the host (optional hot reload)

For host hot reload, start only the backend with `docker compose up -d mongo flights capacity gateway`. The Nginx web container may also remain running on 8080; the host dev server uses 4200. With web dependencies already installed, start a separate terminal:

```bash
cd /path/to/cargo-dashboard/apps/web
npm start -- --proxy-config proxy.conf.json
```

Open `http://localhost:4200/`. The checked-in dev proxy forwards `/api` to `http://localhost:3000` and removes the `/api` prefix. The browser calls `/api/flights` and `/api/capacity/summary`; it does not use Compose DNS. The proxy is explicitly passed because `npm start` alone is `ng serve` and `angular.json` does not configure it automatically. This development proxy is separate from the production-style Nginx reverse proxy used by the Compose web service. Rebuild `docker compose up -d --build web` after frontend changes for the static container; the host dev server reloads automatically.

Optional proxy checks while Angular is running:

```bash
curl -i http://localhost:4200/api/flights
curl -i http://localhost:4200/api/capacity/summary
```

## Stop and resume

Stop containers while keeping them and the named Mongo volume:

```bash
cd /path/to/cargo-dashboard
docker compose stop
```

Resume with `docker compose up -d`. If source changed, use `docker compose up -d --build` instead. To remove this project's containers/network but retain the named volume:

```bash
cd /path/to/cargo-dashboard
docker compose down
```

A later `docker compose up -d` reuses `mongo_data` (normally project-prefixed by Compose) when run with the same project name. Keep the same checkout/project name to reuse the existing volume. Press Ctrl+C separately in the Angular terminal to stop the host dev server.

> **Data loss warning:** `docker compose down -v` removes the named Mongo volume and its database data. It is **not** a normal stop command. Do not use it for routine restarts or this persistence check. The seed also deletes all existing flight records before inserting fictional demo data; use it only against a disposable development database.

## Docker learning notes

- Each backend Dockerfile has build, production-deps and runtime stages. Build uses `npm ci` and `npm run build`; production-deps uses `npm ci --omit=dev`; runtime copies compiled `dist`, production dependencies and `package.json`, then executes `node dist/main.js`.
- Copying package manifests before source allows dependency-install layers to be cached when only application source changes. Cache reuse depends on inputs; it is not a guaranteed request-speed improvement.
- `.dockerignore` excludes local dependencies, build output, coverage, Git metadata, environment files and logs. The runtime has no TypeScript seed source or dev-only `ts-node`; run the seed from the host as documented, not inside the production image.
- Runtime uses the non-root `node` user and owned copied files. Fewer dev tools and a non-root runtime reduce unnecessary contents/privileges; this alone does not make the deployment production-ready or audited.
- `EXPOSE` describes an image port; Compose `ports` publishes it. All five services bind host publications to `127.0.0.1`, including Mongo (`127.0.0.1:27017:27017`). Mongo still has no authentication: loopback binding reduces host-network exposure but does not make this a production-secured database. Existing containers keep their previous port bindings until recreated; run `docker compose up -d mongo` from the repository root to apply the Mongo change while keeping its named volume.

## Configuration and troubleshooting

Compose `environment` values configure the container processes. Host shell `PORT`/URL exports apply to host npm commands, not these literal Compose values. App bootstrap reads `process.env`; it does not itself configure automatic `.env` loading.

For optional host Nest watch mode, see the per-app guides. Stop the Docker backend first, then run only `docker compose up -d mongo`, wait for readiness and start the three Nest apps in separate terminals. Host defaults are flights 3001, capacity 3002, gateway 3000, with upstream URLs using `localhost`. Reverse the switch by stopping those host Nest processes before starting all of Compose.

- Port already allocated: check for a previous host Nest process or another container using 3000–3002/27017. Do not kill unrelated processes as a shortcut.
- Mongo connection/readiness issue: inspect Mongo health/logs and verify the configured database address. Container flights must use `mongo`, not `localhost`.
- Gateway upstream errors: inspect flights/capacity logs and direct host endpoints. A running container is not proof its dependency is ready.
- UI API errors: check gateway endpoints first. For container web, check `docker compose logs --tail=50 web` and `/api` on 8080; for host development, ensure Angular was started with the proxy configuration. Web health indicates Nginx liveness only, not dependency readiness. If 8080 is occupied, preserve the existing service and choose an explicit local port override before starting web.
- Empty flights after restart: check the same Compose project/volume/database is being used. Do not reseed valuable data as a troubleshooting reset.

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
