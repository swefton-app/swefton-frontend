# Swefton Frontend

Swefton's frontend monorepo contains the React web app and Expo mobile app.

## Setup

Install all workspace dependencies from the repository root:

```bash
npm install
```

Start the web app:

```bash
npm run web
```

The default web command starts Vite directly and uses Vite's local environment
files when present. The API defaults to `/api/v1`, which the development server
proxies to `http://localhost:8080`.

To load secrets through Infisical instead, authenticate with `infisical login`,
run `infisical init` from `apps/web`, and start the workspace with:

```bash
npm run dev:infisical --workspace=web
```

Google sign-in requires `VITE_GOOGLE_CLIENT_ID`; Vite only reads this value
when its process starts.

Start the mobile app:

```bash
npm run mobile
```
