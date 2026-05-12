# Tabulas DID + VC demo (this repo)

Developer-oriented notes for the Next.js app that implements the v1 spec for `tabulas.eu/demo/did` (static export, no backend).

## URL layout (mirrors production)

Static JSON and contexts live under `public/` so they are served from the site root:

| Path | Purpose |
|------|---------|
| `/demo/did/` | Next route: `app/demo/did/page.tsx` |
| `/materials/wienerberger/porotherm-25-nf/did.json` | Material DID document |
| `/issuers/<party>/did.json` | Issuer DID documents + `Multikey` in `verificationMethod` |
| `/credentials/.../*.json` | Signed VCs |
| `/contexts/.../v1.json` | JSON-LD term definitions (minimal v1) |

Credential `@context` entries use the **`.json` suffix** on context URLs (e.g. `.../construction-product/v1.json`) so a static file server can host them without rewrite rules. The written spec showed the same path without `.json`; behaviour is equivalent once the `@context` URL matches the file.

## Local `did:web` resolution

VCs and DID documents use the production host `https://tabulas.eu/...`. In development, set **`NEXT_PUBLIC_DID_RESOLUTION_ORIGIN`** (see `.env.example`) to `http://localhost:3000` so fetches rewrite to your dev server.

**Resolve (material DID):** When the env var is unset, the app rewrites `tabulas.eu` to **`window.location.origin` at fetch time** (not only after a `useEffect`), so **Resolve** works on the first click on `http://localhost:3000/demo/did` without waiting for React state to catch up. The `useResolutionOrigin` hook still syncs origin for link rewrites elsewhere after mount.

## Regenerating signed assets

```bash
npm run build:demo-assets
```

This runs `scripts/sign-demo-assets.mjs`, which:

1. Derives deterministic Ed25519 seeds with SHA-256 (demo-only; anyone can recompute — acceptable for a labelled demonstration).
2. Writes issuer and material `did.json` files.
3. Signs the four VCs with `@digitalbazaar/vc` + `DataIntegrityProof` + `eddsa-2022` cryptosuite.

**Private keys are never written to disk**; seeds are embedded only in the script. For a stricter workflow, replace the script with an offline signer and keep seeds outside the repo entirely.

## Cryptosuite label

Signed proofs use **`cryptosuite: "eddsa-2022"`** as emitted by `@digitalbazaar/eddsa-2022-cryptosuite`. The product brief references `eddsa-jcs-2022`; that identifier names the same JCS + Ed25519 approach in the W3C VC Data Integrity suite family. Verification in the browser uses the same Digital Bazaar stack.

## JSON-LD: installation `project.type`

JSON-LD reserves `type` for `@type`. The spec’s example used `"type": "Residential apartment building"` **inside** `project`, which is interpreted as a relative type token and breaks canonicalization.

The signed VC uses **`buildingCategory`** instead, defined in `public/contexts/installation-record/v1.json`. The on-page copy still describes a residential apartment building.

## Browser verification

`lib/demo-verify.ts` **dynamic-imports** VC libraries on first “Verify” to keep the initial route bundle smaller. The document loader tries `@digitalbazaar/vc`’s embedded contexts first, then fetches `https://` (and `did:web:` resolved to `https://`) after rewriting `tabulas.eu` to the resolution origin.

## Dependencies worth knowing

| Package | Role |
|---------|------|
| `@digitalbazaar/vc` | `verifyCredential` / `issue` |
| `@digitalbazaar/data-integrity` | `DataIntegrityProof` |
| `@digitalbazaar/eddsa-2022-cryptosuite` | Ed25519 + JCS cryptosuite |
| `@digitalbazaar/ed25519-multikey` | Key material for signing script |
| `@digitalbazaar/credentials-context` | VC v2 context map (Node signing + browser verify) |
| `@digitalbazaar/data-integrity-context` / `@digitalbazaar/multikey-context` | Required for signing; loaded via `createRequire` in the script |
| `jsonld-signatures` | `extendContextLoader` chain |

TypeScript has minimal **`types/digitalbazaar-shims.d.ts`** because upstream packages ship without `.d.ts` files.
