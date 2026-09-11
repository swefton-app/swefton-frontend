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

The web development command runs Vite through Infisical using the `dev`
environment and `/` secret path. Authenticate with `infisical login` and run
`infisical init` from `apps/web` before starting it. The web project must define
`VITE_GOOGLE_CLIENT_ID`; Vite only reads this value when its process starts.

Start the mobile app:

```bash
npm run mobile
```
