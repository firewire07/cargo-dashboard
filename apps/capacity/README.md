# Capacity service

[Main project guide](../../README.md) · [Flights data service](../flights/README.md)

This independent Nest app reads flights over HTTP. `GET /capacity/flights` returns upstream flight data; `GET /capacity/summary` returns totals and weighted utilisation. The gateway exposes the summary at `http://localhost:3000/capacity/summary`.

## Layout

```text
src/
├── main.ts
├── app.module.ts
└── capacity/
    ├── capacity.module.ts
    ├── capacity.controller.ts
    ├── capacity.controller.spec.ts
    ├── capacity.service.ts
    └── contracts/
        └── flight-response.interface.ts
test/
└── app.e2e-spec.ts
```

`AppModule` imports `CapacityModule`; `main.ts` bootstraps the app. The feature module owns HTTP client configuration (`timeout: 3000`, `maxRedirects: 0`), used for flights requests. The 3000 value here is a timeout in milliseconds, not a listener port. `FlightResponse` is the existing local HTTP-response interface, moved without changing its fields; it does not import a Mongo schema/entity from another app.

## Run with Docker Compose

Use the [root Docker workflow](../../README.md#run-the-docker-backend); stop any host Nest watch processes before binding the same ports.

```bash
cd /path/to/cargo-dashboard
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 capacity
curl -i http://localhost:3002/capacity/flights
curl -i http://localhost:3002/capacity/summary
curl -i http://localhost:3000/capacity/summary
```

Compose builds `cargo-capacity:dev`, sets `PORT=3002` and `FLIGHTS_URL=http://flights:3001`, and publishes 3002 on host loopback. The last command checks the gateway path. Startup ordering waits for the flights container to start, not for its HTTP readiness. Capacity does not own a database; its endpoints depend on flights being available.

The multi-stage Dockerfile installs production dependencies separately and runs compiled code as the non-root `node` user. Rebuild after source changes. Follow the [root safe stop/resume guide](../../README.md#stop-and-resume); ordinary down preserves Mongo data, whereas **down with `-v` deletes its volume**.

## Host watch-mode alternative


For host watch mode, stop the Compose backend, start only Mongo and run flights on the host before this app; avoid running both host and container listeners on the same port. Replace `/path/to/cargo-dashboard` with your checkout location. Use Node/npm meeting the [root prerequisites](../../README.md#prerequisites). If dependencies are not installed, run `npm ci` inside this app first.

```bash
cd /path/to/cargo-dashboard/apps/capacity
FLIGHTS_URL=http://localhost:3001 PORT=3002 npm run start:dev
```

From another terminal:

```bash
curl -i http://localhost:3002/capacity/summary
```

Start Mongo and flights on port 3001 first using the main guide. Expected: HTTP 200 with flight count, capacity/booked totals and utilisation (null for zero total capacity). Stop with **Ctrl+C**. The route depends on flights availability. This alternative runs the Nest apps on the host; the default Docker workflow above runs all backend services in containers.

`PORT` defaults to `3002` and is read from `process.env`. Set it inline or with a shell export; bootstrap does not configure automatic `.env` loading. `FLIGHTS_URL` defaults to `http://localhost:3001`; set the base URL without a trailing slash or `/flights`. Restart this app after changing the URL.

## Build and tests

```bash
cd /path/to/cargo-dashboard/apps/capacity
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Unit tests are co-located with the controller/service, and HTTP tests remain in `test/`. Service unit tests cover summary calculations. Controller tests verify delegation using a mocked service; isolated HTTP tests cover both current routes with HTTP 200 responses and service-unavailable HTTP 503 responses. These HTTP tests stub the service: they do not verify a real upstream connection or its error translation. Scripts use installed dependencies; no new packages are needed for the folder reorganisation.

If port 3002 is occupied, stop your earlier process or choose another `PORT` and update the curl URL. For missing dependencies, install in this app, not in `apps/`.

## Next learning step

Consider testing the real HTTP client error translation separately, before adding live integration coverage. Feature folders improve maintainability; moving files alone does not make requests faster.
