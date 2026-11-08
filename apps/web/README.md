# Web

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.29.

## Development server

Start the Docker backend using the [main project guide](../../README.md#run-the-docker-backend). Angular itself still runs on the host, not in Compose. With web dependencies already installed, replace the checkout placeholder below and run:

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

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

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
