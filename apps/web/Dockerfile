FROM node:22.19.0-bookworm-slim AS build
WORKDIR /app
# Match the existing packageManager/engines; this installs only inside the image.
RUN npm install --global npm@11.6.2
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build -- --configuration production --output-path=dist/web

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html
EXPOSE 8080
