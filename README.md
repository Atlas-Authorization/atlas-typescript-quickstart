# atlas-typescript-quickstart

A framework-free, strictly typed TypeScript sign-in built on **`@atlasauth/js`** and bundled with Vite.

`@atlasauth/js` is the layer beneath the React widgets: a `FapiClient` plus the
flow / OAuth / session helpers. There is **no** vanilla `<SignIn>` / `<UserButton>`
widget — those render DOM via React and live in `@atlasauth/react`. This app
wires the primitives directly:

- **`FapiClient`** — talks to the Atlas Frontend API (cookies included).
- **`initialFlow` + `advance`** — drive an email + password (+ MFA code) sign-in
  one step at a time; a completed attempt yields a one-time `ticket` exchanged at
  `/v1/client/tickets/exchange` for session cookies.
- **`startOauthRedirect` / `readRedirectResult` / `stripRedirectParams`** — a
  full-page social (Google) sign-in and its callback.
- Reading the session: `GET /v1/client` returns `{ session, user, jwt }`.

## Run

```sh
npm install
cp .env.example .env     # set VITE_ATLAS_PUBLISHABLE_KEY + VITE_ATLAS_FRONTEND_API
npm run dev              # Vite dev server (TypeScript is compiled on the fly)
npm run typecheck        # tsc --noEmit (strict)
npm run build            # typecheck, then vite build -> dist/
```

Open the printed localhost URL.

## Packages

- `@atlasauth/js` — `FapiClient`, `initialFlow`, `advance`, `startOauthRedirect`,
  `readRedirectResult`, `stripRedirectParams`
