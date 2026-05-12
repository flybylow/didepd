const TABULAS_ORIGIN = "https://tabulas.eu";

/**
 * Maps a did:web identifier (without fragment) to the HTTPS did.json URL
 * per did:web resolution (host + colon-separated path → URL path).
 */
export function didWebToDidJsonHttpsUrl(did: string): string {
  const noFrag = did.split("#")[0] ?? did;
  const rest = noFrag.replace(/^did:web:/, "");
  const colon = rest.indexOf(":");
  const host = colon === -1 ? rest : rest.slice(0, colon);
  const path =
    colon === -1 ? "" : rest.slice(colon + 1).replace(/:/g, "/");
  const pathSeg = path ? `${path}/` : "";
  return `https://${host}/${pathSeg}did.json`;
}

/** Rewrite production Tabulas URLs to the local dev origin when configured. */
export function rewriteTabulasHttpsUrl(url: string, resolutionOrigin: string): string {
  if (url.startsWith(TABULAS_ORIGIN)) {
    return `${resolutionOrigin.replace(/\/$/, "")}${url.slice(TABULAS_ORIGIN.length)}`;
  }
  return url;
}

/**
 * `@digitalbazaar/data-integrity` loads `proof.verificationMethod` URLs via the
 * document loader and expects the returned document to be the verification
 * method object. For `did:web:…#key-1` the fetched file is the full DID
 * document; extract the matching `verificationMethod` entry and carry over
 * `@context` so Multikey / eddsa-2022 verification can run.
 */
export function pickVerificationMethodFromDidDocument(
  requestedUrl: string,
  didDocument: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!requestedUrl.includes("#")) return null;

  const vms = didDocument.verificationMethod;
  if (!Array.isArray(vms)) return null;

  const match = vms.find((vm) => {
    if (!vm || typeof vm !== "object") return false;
    return (vm as { id?: string }).id === requestedUrl;
  });
  if (!match || typeof match !== "object") return null;

  const ctx = didDocument["@context"];
  return ctx !== undefined
    ? { ...(match as Record<string, unknown>), "@context": ctx }
    : { ...(match as Record<string, unknown>) };
}
