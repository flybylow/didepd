# Tabulas DID + VC Demo

A working demonstration of W3C Decentralized Identifiers and Verifiable Credentials applied to construction product data. The first public artifact of Tabulas's material identity infrastructure.

**Live:** https://www.tabulas.eu/demo/did
**Status:** v1 shipped (May 2026). v2 planned for collaboration with the IOTA Foundation.

---

## What this demo proves

One material — a Wienerberger Porotherm 25 N+F clay masonry block — carries a single digital identity that resolves anywhere in the world. Four independently signed Verifiable Credentials describe that material: the product declaration, the environmental declaration, the third-party verification, and an installation record. Each credential is signed against a public key published as part of the identity. Any visitor can click "Verify" and run the cryptographic check in their own browser. No central authority is consulted, no database is trusted, no platform owns the data.

The result is a working answer to the question building owners will be asking for the next fifty years: *can I still verify what's in this wall, after the producer, the contractor, and the platform that recorded it are gone?*

For v1, the trust root lives at `tabulas.eu`. For v2, it moves to the IOTA ledger.

---

## v1: what's built

### The data

The product data comes from Wienerberger's published Environmental Product Declaration **EPD-IES-0024019**, registered with EPD International AB on 2025-06-17, verified by Dr.-Ing. Nikolay Minkov of greentability Ltd. The declaration covers eight Porotherm trade models manufactured at Wienerberger's Lukovit, Bulgaria facility. The demo uses one of them — Porotherm 25 N+F — installed in a fictional Bruges residential project for narrative purposes.

The four Verifiable Credentials carry the full EN 15804 impact data from the public EPD: GWP-total, GWP-fossil, GWP-biogenic, GWP-GHG, ODP, AP, EP-freshwater, EP-marine, EP-terrestrial, POCP, and supporting metadata (LCA software, database, declared unit, system boundary, reference service life).

### The cryptography

Signing suite: **`eddsa-jcs-2022`** — Ed25519 over JCS-canonicalized JSON-LD, per the W3C Data Integrity 1.0 specification. This is the same suite used by IOTA Identity's reference implementation, which means v2 requires no signature-suite change. Clean upgrade path.

DID method: **`did:web`** for v1. DIDs resolve via HTTPS to JSON documents on `tabulas.eu`. Switches to `did:iota` in v2.

Key management: four Ed25519 keypairs generated at build time, one per issuing party. Private keys are not committed to the repo. Public keys are published in DID Documents.

### The disclosure

The demo signs in the names of Wienerberger and greentability using Tabulas-generated keys. This is disclosed prominently on the page, both above the fold and in the footer. In production, each party would hold their own keys and issue their own signatures. No party shown in the demo has endorsed it.

### The architecture

Two repositories, one domain:

| Repo | Hosts | Path on tabulas.eu |
|---|---|---|
| `flybylow/3d-particles` | Main marketing site | Everything except below |
| `flybylow/didepd` | DID infrastructure + demo page | `/demo/did`, `/issuers/*`, `/materials/*`, `/credentials/*`, `/contexts/*` |

Path routing is handled by Vercel rewrites in the main site's `vercel.json`. The demo repo uses `output: "export"` (Next.js static export) with a conditional `assetPrefix` that activates only in production builds, so localhost development still works.

### Reserved paths (immutable)

The following paths on `tabulas.eu` are part of the cryptographic trust root and **cannot be moved or renamed** without invalidating every published signature:

```
/issuers/*
/materials/*
/credentials/*
/contexts/*
```

The `/demo/did` page itself can move or be removed without breaking anything.

---

## v2: anchoring to IOTA

The single change between v1 and v2: the DID method moves from `did:web` to `did:iota`. Everything else — the credential structure, the signing suite, the demo page, the verification logic — stays substantially the same.

### What this gives us that v1 doesn't

**Ledger independence from Tabulas.** The trust root no longer depends on `tabulas.eu` being reachable. If Tabulas disappears, the keys are still findable on the IOTA ledger. If IOTA disappears, the keys are still findable wherever the ledger state has been mirrored. The trust survives the platform.

**Tamper-evident timestamps.** A ledger entry proves a claim existed at a specific moment. No central timestamp authority. For 50-year building lifecycles, this matters more than it first appears: it answers "when exactly was this declared" without trusting a platform's clock.

**The credibility upgrade.** For producers, regulators, and partners evaluating Tabulas, "anchored on IOTA" is the difference between "looks like a platform" and "looks like infrastructure."

### Scope of the v2 build

Five concrete pieces of work, in dependency order:

**1. IOTA network decision.** Mainnet or testnet for the public demo. This is a partnership question, not a technical one — covered below.

**2. Generate IOTA-anchored DIDs.** Each issuing party (Wienerberger, greentability, the contractor, Tabulas) gets a DID written to the ledger via the IOTA Identity SDK. The DID Document containing the public key lives on-ledger.

**3. Re-sign the credentials.** The four VCs need their `issuer` fields updated to reference the new `did:iota:` identifiers, then re-signed. The signing keys themselves can stay the same — Ed25519 works for both methods.

**4. Swap the resolver in the demo page.** The current page resolves DIDs by HTTPS fetch. v2 resolves DIDs by querying the IOTA ledger. The IOTA Identity SDK provides a browser-compatible resolver. Verification logic is otherwise unchanged.

**5. Anchor credential content hashes to IOTA.** Beyond the DIDs themselves, the *content* of each VC gets hashed and committed to the ledger. This proves not just "the keys exist" but "this exact credential existed at this timestamp, immutably." For the IOTA narrative this is the headline feature.

### Effort estimate

For someone familiar with both the existing demo and the IOTA Identity SDK: **5–7 focused days.** Double that if the developer is learning IOTA Identity from scratch.

### What v2 explicitly does NOT change

- The credential structure (JSON-LD, EN 15804 fields, the four-VC chain)
- The signing suite (`eddsa-jcs-2022`)
- The demo page UX, narrative, or copy
- The trust-root paths on `tabulas.eu`
- The disclosure about Tabulas-generated keys

The demo's *story* is unchanged. The trust root simply gets stronger.

### Anti-patterns to avoid in v2

- Don't rebuild the demo page. The narrative works; only the resolver changes.
- Don't make v1 and v2 coexist as user-facing toggles. Pick one for the live demo. v2 replaces v1.
- Don't anchor more than is needed. Eight ledger writes (4 DIDs + 4 content hashes) is enough for the demonstration.
- Don't make IOTA token economics part of the manufacturer-facing story. The story is durability, not cost.

---

## The IOTA partnership conversation

The v2 build is a collaboration opportunity with the IOTA Foundation, not a unilateral spec to execute. The Foundation has offered partnership support, network access, and weekly accountability check-ins. v2 is the natural thing to scope jointly with them.

### Three questions to bring to the June meeting

**1. Testnet or mainnet for the public demo?**
Testnet is free and unlimited but won't read as "production" to outside observers. Mainnet costs small amounts and signals real commitment but ties the demo's continued function to ongoing token availability. The Foundation's preference here also tells us how publicly they want to be associated with the demo.

**2. Engineering involvement.**
Should the SDK integration be done by Tabulas (with Foundation support documentation), jointly by both teams, or contracted to a third party? The Foundation's answer reveals how much hands-on commitment they're prepared to invest beyond verbal partnership.

**3. GTM alignment.**
What's the story the Foundation wants this demo to support in their producer outreach? If the pitch is "future-proof material identity," v2 amplifies it directly. If the pitch is something else, the demo's framing can be tailored accordingly. Worth aligning before the build, not after.

### What to show in the meeting

The v1 live demo. Not slides, not a deck — the working URL. Click Verify on a credential. Let them see the pipeline. Then the v2 roadmap document (this one), with the three questions above as the agenda.

The order matters: working artifact first, plan second, questions third. The artifact earns the meeting; the plan earns the partnership; the questions earn the joint ownership.

### What NOT to bring to the meeting

- A finished v2 build. Building before the conversation is making decisions that should be jointly owned.
- A long deck. The demo IS the pitch.
- Detailed token economics or business model. Save for a separate conversation.
- A request for funding. The Foundation has offered partnership, not investment; conflating the two damages both.

---

## Tech stack reference

For anyone picking up this repo:

- **Framework:** Next.js 14+ with React, configured for static export (`output: "export"`)
- **Verification library:** `@digitalbazaar/vc` ecosystem (data-integrity, eddsa-2022-cryptosuite, ed25519-multikey, credentials-context, jsonld-signatures, jsonld)
- **Hosting:** Vercel, deployed as static site
- **Domain:** Served via rewrites from `tabulas.eu`; direct deploy URL `didepd.vercel.app`
- **DID method (v1):** `did:web`
- **DID method (v2):** `did:iota`
- **Signing suite:** `eddsa-jcs-2022` (W3C Data Integrity 1.0)
- **Credential format:** W3C VC Data Model 2.0, JSON-LD

### Local development

```bash
npm install
npm run dev
```

The `assetPrefix` in `next.config.ts` is conditional on `NODE_ENV`, so localhost serves with relative paths and works without the Vercel rewrite.

DID resolution in dev mode hits the live `tabulas.eu` URLs, which means verification works locally as soon as v1 is deployed. No resolver override needed.

### Key generation and signing

Private keys are generated at build time and not committed. Public keys are embedded in the DID Documents under `/issuers/*/did.json`. Signing scripts live in `/scripts/` (or wherever the dev placed them).

---

## Standards and references

- W3C Decentralized Identifiers (DIDs) v1.0 — https://www.w3.org/TR/did-core/
- W3C Verifiable Credentials Data Model v2.0 — https://www.w3.org/TR/vc-data-model-2.0/
- W3C Data Integrity 1.0 — https://www.w3.org/TR/vc-data-integrity/
- did:web Method Specification — https://w3c-ccg.github.io/did-method-web/
- did:iota Method Specification — https://github.com/iotaledger/identity/blob/main/docs/specs/did-method-iota.md
- eddsa-jcs-2022 Cryptosuite — https://www.w3.org/TR/vc-di-eddsa/
- RFC 8785 JSON Canonicalization Scheme — https://www.rfc-editor.org/rfc/rfc8785
- EN 15804:2012+A2:2019/AC:2021 — Sustainability of construction works, EPD core rules
- ISO 14025:2006 — Type III environmental declarations
- PCR 2019:14 Construction products v1.3.4
- Wienerberger Porotherm EPD (source data) — https://www.environdec.com/library/epd24019

---

## Contact

For questions about this demo, the v2 roadmap, or the broader Tabulas material identity infrastructure: Ward — Tabulas BV, Bruges, Belgium.