# Tabulas DID + VC demo (didepd)

Next.js static site for the **Tabulas DID + VC** walkthrough: Wienerberger Porotherm 25 N+F, `did:web` material identity, four signed Verifiable Credentials, and client-side verification.

## Commands

- `npm run dev` — local dev server
- `npm run build` — static export to `out/`
- `npm run build:demo-assets` — regenerate signed JSON under `public/` (deterministic demo keys; see `docs/tabulas-did-vc-demo.md`)

## Routes

- `/` redirects to `/demo/did`
- `/demo/did` — main demo page

## Configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_DID_RESOLUTION_ORIGIN` so `https://tabulas.eu/...` URLs resolve to your dev server (required for local `did:web` fetches).

Internal documentation lives in `docs/` (see `docs/INDEX.md`).
