# Swefton frontend architecture

The monorepo follows one dependency rule:

```text
apps/web ------\
                > @swefton/shared
apps/mobile ---/
```

`shared` never imports Web, React DOM, React Native, browser APIs, native APIs, CSS, or `StyleSheet` objects.

## Shared package

`shared/src` contains platform-independent code:

- `auth/contracts.ts`: API request/response types and the auth API contract.
- `auth/endpoints.ts`: backend endpoint constants.
- `auth/roles.ts`: role values and shared role copy.
- `auth/validation.ts`: password and verification rules.
- `auth/postAuth.ts`: semantic post-auth destinations, independent of any router.
- `design`: colors, spacing, radius, and typography for Web and Mobile consumers.

## Web application

`apps/web/src` contains browser-specific code:

- `features/<feature>/api`: Web implementations of shared API contracts.
- `features/<feature>/hooks`: React orchestration and state.
- `features/<feature>/pages`: route-level React DOM UI.
- `features/<feature>/components`: feature UI, one component per folder.
- `core/http`: Axios and browser HTTP infrastructure.
- `core/storage`: `localStorage` and `sessionStorage` implementations.
- `components/ui`: reusable Web-only UI primitives.
- `styles`: Web tokens, reset, and global document rules only.

Every Web component stylesheet is a colocated CSS Module. Feature selectors do not belong in global CSS.

## Mobile application

`apps/mobile/src` owns React Native components, screens, Expo integrations, native navigation, `StyleSheet` definitions, and secure token storage. It may consume `@swefton/shared`, but it must not import anything from `apps/web`.

## Placement test

Code belongs in `shared` only if it can run unchanged in a browser, React Native, and a plain TypeScript test process. Otherwise it belongs to the relevant application.
