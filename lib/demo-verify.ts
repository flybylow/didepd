import {
  didWebToDidJsonHttpsUrl,
  pickVerificationMethodFromDidDocument,
  rewriteTabulasHttpsUrl,
} from "./did-web";

function formatVerifyCredentialError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name: string }).name === "VerificationError" &&
    "errors" in error &&
    Array.isArray((error as { errors: unknown }).errors)
  ) {
    const parts = (error as { errors: unknown[] }).errors.map((e) =>
      e instanceof Error ? e.message : String(e),
    );
    if (parts.length) return parts.join("; ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * JSON-LD document loader for browser verification: resolves did:web, rewrites
 * tabulas.eu to the demo origin, and fetches remote contexts (w3.org, w3id.org).
 */
export function createBrowserDocumentLoader(resolutionOrigin: string) {
  return async (url: string) => {
    let fetchUrl = url;
    if (url.startsWith("did:web:")) {
      fetchUrl = didWebToDidJsonHttpsUrl(url);
    }
    fetchUrl = rewriteTabulasHttpsUrl(fetchUrl, resolutionOrigin);
    console.log("[DID demo verify/loader]", { requestedUrl: url, fetchUrl });
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.error("[DID demo verify/loader] fetch failed", {
        fetchUrl,
        status: res.status,
      });
      throw new Error(`Document loader: ${fetchUrl} returned ${res.status}`);
    }
    const raw = await res.json();
    const document =
      typeof raw === "object" &&
      raw !== null &&
      !Array.isArray(raw) &&
      url.includes("#")
        ? pickVerificationMethodFromDidDocument(url, raw as Record<string, unknown>) ??
          (raw as Record<string, unknown>)
        : (raw as Record<string, unknown>);
    console.log("[DID demo verify/loader] ok", {
      fetchUrl,
      documentKeys:
        document && typeof document === "object"
          ? Object.keys(document as object).slice(0, 12)
          : typeof document,
    });
    return {
      contextUrl: null as string | null,
      documentUrl: url,
      document,
    };
  };
}

export type VerifyDemoCredentialResult = {
  verified: boolean;
  error?: string;
};

/**
 * Lazy-loads VC + Data Integrity suites, then verifies a credential in the browser.
 */
export async function verifyDemoCredential(
  credential: Record<string, unknown>,
  resolutionOrigin: string,
): Promise<VerifyDemoCredentialResult> {
  const proof = credential.proof as Record<string, unknown> | undefined;
  console.log("[DID demo verify/crypto] start", {
    resolutionOrigin,
    credentialId: credential.id,
    issuer: credential.issuer,
    proofVerificationMethod: proof?.verificationMethod,
    proofCryptosuite: proof?.cryptosuite,
    proofType: proof?.type,
  });

  console.log("[DID demo verify/crypto] loading VC libraries…");
  const [
    vcMod,
    { DataIntegrityProof },
    { cryptosuite: eddsa2022CryptoSuite },
    jsigs,
  ] = await Promise.all([
    import("@digitalbazaar/vc"),
    import("@digitalbazaar/data-integrity"),
    import("@digitalbazaar/eddsa-2022-cryptosuite"),
    import("jsonld-signatures"),
  ]);
  console.log("[DID demo verify/crypto] libraries loaded");

  const { verifyCredential, defaultDocumentLoader } = vcMod;

  const browserLoader = createBrowserDocumentLoader(resolutionOrigin);
  const documentLoader = jsigs.extendContextLoader(async (url: string) => {
    try {
      const doc = await defaultDocumentLoader(url);
      console.log("[DID demo verify/loader] served from embedded map", {
        url,
      });
      return doc;
    } catch (e) {
      console.log("[DID demo verify/loader] defaultDocumentLoader miss, fetching", {
        url,
        reason: e instanceof Error ? e.message : String(e),
      });
      return browserLoader(url);
    }
  });

  const suite = new DataIntegrityProof({ cryptosuite: eddsa2022CryptoSuite });

  console.log("[DID demo verify/crypto] calling verifyCredential…");
  const result = await verifyCredential({
    credential,
    suite,
    documentLoader,
  });

  const summarizeResult = () => {
    const top = result.error as
      | (Error & { errors?: unknown[] })
      | undefined;
    const nested =
      top?.name === "VerificationError" && Array.isArray(top.errors)
        ? top.errors.map((e) =>
            e instanceof Error
              ? { name: e.name, message: e.message }
              : { value: e },
          )
        : null;
    const rows = Array.isArray(result.results)
      ? result.results.map((r: unknown, i: number) => {
          const row = r as {
            verified?: boolean;
            error?: Error & { details?: unknown };
          };
          return {
            index: i,
            verified: row.verified,
            errorName: row.error?.name,
            errorMessage: row.error?.message,
            errorDetails: row.error?.details,
          };
        })
      : result.results;
    console.log("[DID demo verify/crypto] verifyCredential returned", {
      verified: result.verified,
      topLevelError: result.error
        ? { name: result.error.name, message: result.error.message }
        : null,
      verificationErrorDetails: nested,
      results: rows,
    });
  };

  if (result.verified) {
    summarizeResult();
    console.log("[DID demo verify/crypto] success");
    return { verified: true };
  }
  summarizeResult();
  const err =
    (result.error ? formatVerifyCredentialError(result.error) : null) ??
    (result.results?.[0] as { error?: Error } | undefined)?.error?.message ??
    "Verification failed";
  console.warn("[DID demo verify/crypto] failed", { message: err });
  return { verified: false, error: err };
}
