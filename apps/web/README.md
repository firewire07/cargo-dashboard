# Web

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.29.

## Production-style container

From the repository root:

```bash
docker compose up -d --build
```

Open **http://localhost:8080/**. The Node 22.19.0/npm 11.6.2 build stage uses the committed lockfile and produces `dist/web/browser`; only those static files enter the unprivileged Nginx 1.28 Alpine runtime. No dev server or Node runtime is needed in the final image. This is a local production-style build, not a secured public deployment.

Nginx forwards same-origin `/api/flights` and `/api/capacity/summary` to gateway without `/api`, preserving query parameters. SPA route refresh falls back to `index.html`; missing assets return 404 and API errors remain API errors. HTML/nonhashed assets revalidate, hashed JS/CSS caches immutably, and API responses are not cached. `/healthz` and the Compose healthcheck prove only web-server liveness. See [architecture and future scaling](../../docs/architecture.md).

```bash
docker compose ps web
docker compose logs --tail=50 web
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/flights
curl -i http://localhost:8080/api/capacity/summary
# After frontend source changes:
docker compose up -d --build web
# Stop just web without touching Mongo:
docker compose stop web
```

The web build context allowlists source/public files and build configuration; no `.env`, `.npmrc`, local dependencies or Git history enters it. Never add secrets under `src` or `public`: frontend output is public by design. Keep database volumes intact; no reseed is needed.

## Development server (optional hot reload)

Start only the backend from the repository root with `docker compose up -d mongo flights capacity gateway` (or leave the full stack running). The optional Angular dev server uses host port 4200, distinct from container web on 8080. With web dependencies already installed, replace the checkout placeholder below and run:

```bash
cd /path/to/cargo-dashboard/apps/web
npm start -- --proxy-config proxy.conf.json
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

The explicit dev proxy forwards `/api` to the Docker gateway published at `http://localhost:3000` and removes `/api`. `npm start` alone does not enable this proxy automatically. Check `http://localhost:4200/api/flights` and `http://localhost:4200/api/capacity/summary` while the dev server is running. Stop Angular with Ctrl+C; stop/resume the backend separately using the root guide. This proxy is for development, not a production deployment.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the browser build artifacts in `dist/web/browser/`. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
