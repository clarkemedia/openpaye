# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Optional settings (see .env.example)
ARG VITE_SITE_URL=
ARG VITE_REPO_URL=https://github.com/clarkemedia/openpaye
ARG VITE_DONATE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL VITE_REPO_URL=$VITE_REPO_URL VITE_DONATE_URL=$VITE_DONATE_URL
RUN npm test && npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
