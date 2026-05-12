# Knowledge base (`docs/`)

This folder holds **internal** project notes: how the demo is built, signing, deployment quirks, and vocabulary decisions.

## Rules

- Prefer **kebab-case** filenames (`topic-name.md`).
- When you add, remove, or rename a markdown file here, update **`INDEX.md`** in the same change.
- Do not park long internal guides at the repo root; keep the root to `README.md`, config, and source.

## Conventions

- **Product domain** in JSON is `https://tabulas.eu/...` so the static files match production URLs. Local dev rewrites that host to `NEXT_PUBLIC_DID_RESOLUTION_ORIGIN` or the browser origin (see `tabulas-did-vc-demo.md`).
