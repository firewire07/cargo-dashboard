# HTTP gateway

Nest entry point for the future dashboard UI. `GET /flights` uses Nest's `HttpModule` (Axios) to call the flights data service and return its response body. The gateway does not own flight data or connect directly to MongoDB.

[Main project guide](../../README.md) — prerequisites, Mongo startup, development seed and full startup order. See also the [flights service guide](../flights/README.md).

## Install and run

Replace `/path/to/cargo-dashboard` below with your own checkout location.

Use Node/npm meeting the [root prerequisites](../../README.md#prerequisites). First start Mongo and the flights service following the main guide. Check that `http://localhost:3001/flights` responds before testing through the gateway.

Install from the gateway's own lockfile:

```bash
cd /path/to/cargo-dashboard/apps/gateway
npm ci
```

Start in a separate terminal, leaving flights running (also run capacity on port 3002 for the summary route):

```bash
cd /path/to/cargo-dashboard/apps/gateway
FLIGHTS_URL=http://localhost:3001 CAPACITY_URL=http://localhost:3002 PORT=3000 npm run start:dev
```

Wait for successful Nest startup. From another terminal:

```bash
curl -i http://localhost:3001/flights
curl -i http://localhost:3000/flights
curl -i http://localhost:3000/capacity/summary
```

The two flights calls should return HTTP 200 with the same JSON array (five fictional records immediately after seeding). The first call checks the upstream directly; the second checks forwarding. The third calls the capacity summary through the gateway and requires the capacity service. Gateway startup alone does not prove the upstream is reachable. Stop this app with **Ctrl+C**; stopping it does not stop flights or Mongo. See [stopping everything](../../README.md#stop-and-resume).

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Gateway HTTP listener |
| `FLIGHTS_URL` | `http://localhost:3001` | Flights upstream base URL |
| `CAPACITY_URL` | `http://localhost:3002` | Capacity upstream base URL |

Use a base URL **without** `/flights` or a trailing slash: the service appends `/flights`. If flights uses another port, update this URL. Set values inline as above or with `export` in the gateway terminal; another terminal's exports do not apply here. The current bootstrap reads `process.env` and does not configure automatic `.env` loading. Mongo's URI belongs to the flights service, not the gateway.

## Design and performance learning

These apps communicate over ordinary HTTP, not Nest's microservice transport layer. The gateway forwards the flight list and `GET /capacity/summary` to their respective services. Authentication, caching, rate limiting and upstream resilience policies are not implemented. A single API entry point simplifies the future UI, but the extra hop has overhead; this architecture is not proof of better performance. `firstValueFrom` converts the HTTP Observable to a Promise so the service can await the response.

Only Mongo is containerised today. All three Nest processes run on the host, which is why `localhost:3001` is the flights upstream address. Container networking will need different configuration if application containers are added later.

## Troubleshooting

- Gateway error / upstream connection refused: call port 3001 directly. Check flights is running and can reach Mongo; inspect both Nest terminal logs. This gateway has no custom upstream-error translation, so failures can surface as a generic server error.
- Direct flights call works but gateway fails: check `FLIGHTS_URL` in the gateway terminal, without an extra path/trailing slash, then restart the gateway after changing it.
- `EADDRINUSE`: another process owns port 3000. Stop your previous gateway or use a different `PORT` and update your curl URL.
- Missing packages or Nest DI errors: run `npm ci` inside `apps/gateway`, not `apps/`.
- Empty array from both calls: consult the flights guide; do not reseed valuable data merely to troubleshoot forwarding.

## Other npm scripts

`npm run build` compiles; `npm start` runs without watch mode. Run `npm run build` before `npm run start:prod`. Scripts also exist for `npm run lint`, `npm test`, `npm run test:e2e` and `npm run test:cov`. Unit tests now live beside the feature controller/service. HTTP tests in `test/` stub the feature service and verify `/flights` routing without contacting the upstream; they are not live distributed integration coverage.

## Feature organisation

`src/main.ts` handles bootstrap and `src/app.module.ts` wires root setup. The flight feature lives in `src/flights/` with its module, controller, service and co-located `*.spec.ts` unit tests. HTTP tests stay in `test/app.e2e-spec.ts`. Unused generated root controllers/services have been removed; `/flights` behaviour is unchanged.
