/**
 * Generates deterministic Ed25519 demo keys (SHA-256 seeds; demo-only),
 * writes issuer + material DID documents, and signs the four VCs.
 *
 * Run from repo root: node scripts/sign-demo-assets.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Ed25519Multikey from "@digitalbazaar/ed25519-multikey";
import { DataIntegrityProof } from "@digitalbazaar/data-integrity";
import { cryptosuite as eddsa2022CryptoSuite } from "@digitalbazaar/eddsa-2022-cryptosuite";
import jsigs from "jsonld-signatures";
import { createRequire } from "node:module";
import { defaultDocumentLoader, issue } from "@digitalbazaar/vc";

const require = createRequire(import.meta.url);
const dataIntegrityContextPkg = require("@digitalbazaar/data-integrity-context");
const multikeyContextPkg = require("@digitalbazaar/multikey-context");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const HOST = "https://tabulas.eu";

function seed(label) {
  return createHash("sha256").update(`tabulas-did-demo-seed:${label}`).digest();
}

function tabulasPathFromHttps(url) {
  const noFrag = url.split("#")[0];
  if (!noFrag.startsWith(HOST)) {
    return null;
  }
  return join(PUBLIC, noFrag.slice(HOST.length + 1));
}

/** DataIntegrityProof loads `proof.verificationMethod` via the loader; for `…#key-1` the file is the full DID doc. */
function pickVerificationMethodFromDidDocument(requestedUrl, didDocument) {
  if (!requestedUrl.includes("#") || !didDocument || typeof didDocument !== "object") {
    return didDocument;
  }
  const vms = didDocument.verificationMethod;
  if (!Array.isArray(vms)) {
    return didDocument;
  }
  const match = vms.find((vm) => vm && typeof vm === "object" && vm.id === requestedUrl);
  if (!match) {
    return didDocument;
  }
  const ctx = didDocument["@context"];
  return ctx !== undefined ? { ...match, "@context": ctx } : { ...match };
}

function makeDocumentLoader() {
  return jsigs.extendContextLoader(async (url) => {
    const mkDoc = multikeyContextPkg.contexts.get(url);
    if (mkDoc !== undefined) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: mkDoc,
      };
    }
    const diDoc = dataIntegrityContextPkg.contexts.get(url);
    if (diDoc !== undefined) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: diDoc,
      };
    }
    if (url.startsWith(HOST)) {
      const local = tabulasPathFromHttps(url);
      if (local) {
        const body = readFileSync(local, "utf8");
        const parsed = JSON.parse(body);
        return {
          contextUrl: null,
          documentUrl: url,
          document: pickVerificationMethodFromDidDocument(url, parsed),
        };
      }
    }
    return defaultDocumentLoader(url);
  });
}

async function generateIssuerKey(did, seedLabel) {
  return Ed25519Multikey.generate({
    seed: seed(seedLabel),
    controller: did,
    id: `${did}#key-1`,
  });
}

function writeDidJson(relPath, doc) {
  const full = join(PUBLIC, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

async function signCredential(unsigned, keyPair, documentLoader) {
  const suite = new DataIntegrityProof({
    signer: keyPair.signer(),
    cryptosuite: eddsa2022CryptoSuite,
    date: "2026-05-12T14:30:00Z",
  });
  return issue({
    credential: unsigned,
    suite,
    documentLoader,
  });
}

const CTX = {
  cp: `${HOST}/contexts/construction-product/v1.json`,
  epd: `${HOST}/contexts/epd/v1.json`,
  ev: `${HOST}/contexts/epd-verification/v1.json`,
  inst: `${HOST}/contexts/installation-record/v1.json`,
};

/** DID docs that publish `Multikey` verification methods need this for eddsa-2022 verify. */
const DID_CONTEXT = [
  "https://www.w3.org/ns/did/v1",
  "https://w3id.org/security/multikey/v1",
];

const wienerbergerDid = "did:web:tabulas.eu:issuers:wienerberger-eood";
const greentabilityDid = "did:web:tabulas.eu:issuers:greentability";
const vandeveldeDid = "did:web:tabulas.eu:issuers:bouwwerken-vandevelde";
const tabulasDid = "did:web:tabulas.eu:issuers:tabulas";
const materialDid = "did:web:tabulas.eu:materials:wienerberger:porotherm-25-nf";

async function main() {
  const kpW = await generateIssuerKey(wienerbergerDid, "wienerberger-eood");
  const kpG = await generateIssuerKey(greentabilityDid, "greentability");
  const kpV = await generateIssuerKey(vandeveldeDid, "bouwwerken-vandevelde");
  const kpT = await generateIssuerKey(tabulasDid, "tabulas");

  const pub = (kp) => ({
    id: kp.id,
    type: "Multikey",
    controller: kp.controller,
    publicKeyMultibase: kp.publicKeyMultibase,
  });

  writeDidJson("issuers/wienerberger-eood/did.json", {
    "@context": DID_CONTEXT,
    id: wienerbergerDid,
    verificationMethod: [pub(kpW)],
    assertionMethod: [`${wienerbergerDid}#key-1`],
  });

  writeDidJson("issuers/greentability/did.json", {
    "@context": DID_CONTEXT,
    id: greentabilityDid,
    verificationMethod: [pub(kpG)],
    assertionMethod: [`${greentabilityDid}#key-1`],
  });

  writeDidJson("issuers/bouwwerken-vandevelde/did.json", {
    "@context": DID_CONTEXT,
    id: vandeveldeDid,
    verificationMethod: [pub(kpV)],
    assertionMethod: [`${vandeveldeDid}#key-1`],
  });

  writeDidJson("issuers/tabulas/did.json", {
    "@context": DID_CONTEXT,
    id: tabulasDid,
    verificationMethod: [pub(kpT)],
    assertionMethod: [`${tabulasDid}#key-1`],
  });

  writeDidJson("materials/wienerberger/porotherm-25-nf/did.json", {
    "@context": DID_CONTEXT,
    id: materialDid,
    controller: wienerbergerDid,
    alsoKnownAs: [`${HOST}/materials/wienerberger/porotherm-25-nf`],
  });

  const documentLoader = makeDocumentLoader();

  const UNDEF = "https://www.w3.org/ns/credentials/undefined-terms/v2";

  const vc1 = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      CTX.cp,
      UNDEF,
    ],
    id: `${HOST}/credentials/wienerberger/porotherm-25-nf/product-declaration`,
    type: ["VerifiableCredential", "ConstructionProductDeclaration"],
    issuer: {
      id: wienerbergerDid,
      name: "Wienerberger EOOD",
      address: "Lukovit, Bulgaria",
    },
    validFrom: "2025-06-17T00:00:00Z",
    validUntil: "2030-06-17T00:00:00Z",
    credentialSubject: {
      id: materialDid,
      type: "ClayMasonryBlock",
      productName: "Porotherm 25 N+F",
      productFamily: "Porotherm clay masonry blocks",
      manufacturer: {
        id: wienerbergerDid,
        name: "Wienerberger EOOD",
      },
      manufacturingSite: {
        name: "Ceramic factory Wienerberger",
        location: "Lukovit, Bulgaria",
      },
      unCpcCode: "3731",
      intendedUse:
        "Vertically perforated ceramic blocks for protected masonry of external and partition walls",
      physicalProperties: {
        compressiveStrength: { value: 10, unit: "MPa" },
        grossDensity: { min: 550, max: 750, unit: "kg/m3" },
        voidsPercentage: { min: 56, max: 68, unit: "%" },
        waterAbsorption: { value: 18, unit: "%" },
      },
      materialComposition: {
        primary: "Locally sourced clay",
        secondary: ["Sawdust", "Sunflower husks", "Rice husks"],
      },
      certifications: ["CE marking", "ISO 14001:2015"],
      reachCompliant: true,
    },
  };

  const vc2 = {
    "@context": ["https://www.w3.org/ns/credentials/v2", CTX.epd, UNDEF],
    id: `${HOST}/credentials/wienerberger/porotherm-25-nf/epd`,
    type: ["VerifiableCredential", "EnvironmentalProductDeclaration"],
    issuer: {
      id: wienerbergerDid,
      name: "Wienerberger EOOD",
    },
    validFrom: "2025-06-17T00:00:00Z",
    validUntil: "2030-06-17T00:00:00Z",
    credentialSubject: {
      id: materialDid,
      epdRegistrationNumber: "EPD-IES-0024019",
      epdProgramme: {
        name: "The International EPD System",
        operator: "EPD International AB",
        url: "https://www.environdec.com",
      },
      standardsCompliance: [
        "ISO 14025:2006",
        "EN 15804:2012+A2:2019/AC:2021",
      ],
      productCategoryRules: "PCR 2019:14 Construction products, version 1.3.4",
      lcaSoftware: "SimaPro 10.2.0",
      lcaDatabase: "Ecoinvent 3.11",
      impactAssessmentMethod: "EF 3.1",
      declaredUnit: { value: 1, unit: "ton of clay bricks" },
      systemBoundary: "A1-A3 + C1-C4 + D",
      referenceServiceLife: {
        value: 150,
        unit: "years",
        source: "2020 TBE Guidance",
      },
      impacts: {
        "GWP-total": {
          "A1-A3": { value: 1.82e2, unit: "kg CO2 eq" },
          C1: { value: 3.61e0, unit: "kg CO2 eq" },
          C2: { value: 9.52e0, unit: "kg CO2 eq" },
          C3: { value: 1.8e-1, unit: "kg CO2 eq" },
          C4: { value: 3.28e0, unit: "kg CO2 eq" },
          D: { value: -6.78e0, unit: "kg CO2 eq" },
        },
        "GWP-fossil": { "A1-A3": { value: 1.82e2, unit: "kg CO2 eq" } },
        "GWP-biogenic": { "A1-A3": { value: -2.75e-2, unit: "kg CO2 eq" } },
        "GWP-GHG": { "A1-A3": { value: 1.03e2, unit: "kg CO2 eq" } },
        ODP: { "A1-A3": { value: 4.38e-6, unit: "kg CFC-11 eq" } },
        AP: { "A1-A3": { value: 4.07e-1, unit: "mol H+ eq" } },
        "EP-freshwater": { "A1-A3": { value: 1.86e-2, unit: "kg P eq" } },
        "EP-marine": { "A1-A3": { value: 1.24e-1, unit: "kg N eq" } },
        "EP-terrestrial": { "A1-A3": { value: 1.36e0, unit: "mol N eq" } },
        POCP: { "A1-A3": { value: 4.56e-1, unit: "kg NMVOC eq" } },
      },
      biogenicCarbonInPackaging: { value: 12.44, unit: "kg C per declared unit" },
      recyclabilityAssumption: { value: 70, unit: "%", source: "2020 TBE Guidance" },
      timeRepresentativeness: "January 2023 to December 2023",
      geographicalScope: {
        rawMaterialsSupply: "Bulgaria and European Union",
        production: "Bulgaria",
        endOfLife: "Europe",
      },
    },
    evidence: [
      {
        type: "PublishedEPD",
        url: "https://www.environdec.com/library/epd24019",
        registrationNumber: "EPD-IES-0024019",
        publicationDate: "2025-06-17",
      },
    ],
  };

  const vc3 = {
    "@context": ["https://www.w3.org/ns/credentials/v2", CTX.ev, UNDEF],
    id: `${HOST}/credentials/wienerberger/porotherm-25-nf/verification`,
    type: ["VerifiableCredential", "EPDVerification"],
    issuer: {
      id: greentabilityDid,
      name: "greentability Ltd.",
      verifier: "Dr.-Ing. Nikolay Minkov",
      accreditedBy: "EPD International AB",
    },
    validFrom: "2025-06-17T00:00:00Z",
    credentialSubject: {
      id: `${HOST}/credentials/wienerberger/porotherm-25-nf/epd`,
      verifiedClaim: "EPD-IES-0024019",
      verificationStandard: "ISO 14025:2006",
      verificationMethod: "EPD verification by individual verifier",
      productCategoryRules: "PCR 2019:14 Construction products, version 1.3.4",
      approvedBy: "The International EPD System",
      followUpProcedure: false,
      verificationStatement:
        "The EPD and underlying LCA data have been independently verified in accordance with ISO 14025:2006 and the applicable PCR.",
    },
  };

  const vc4 = {
    "@context": ["https://www.w3.org/ns/credentials/v2", CTX.inst, UNDEF],
    id: `${HOST}/credentials/bouwwerken-vandevelde/sint-andries-2026/porotherm-25-nf-batch-001`,
    type: ["VerifiableCredential", "InstallationRecord"],
    issuer: {
      id: vandeveldeDid,
      name: "Bouwwerken Vandevelde BV",
      address: "Sint-Andries, Brugge, Belgium",
      note: "Fictional contractor for demonstration purposes",
    },
    validFrom: "2026-03-15T00:00:00Z",
    credentialSubject: {
      id: "did:web:tabulas.eu:installations:sint-andries-2026:wall-segment-load-bearing-east",
      installedProduct: materialDid,
      quantity: { value: 2400, unit: "kg" },
      project: {
        name: "Residentie De Lindeboom",
        location: "Sint-Andries, Brugge, Belgium",
        buildingCategory: "Residential apartment building",
        units: 12,
      },
      installationContext:
        "Load-bearing partition walls, east wing, ground floor through second floor",
      installationDate: "2026-03-15",
      supplyChain: {
        deliveryNote: "LEV-2026-0312-WB",
        deliveredFrom: "Wienerberger distributor Belgium (illustrative)",
        deliveryDate: "2026-03-12",
      },
    },
  };

  const signed1 = await signCredential(vc1, kpW, documentLoader);
  const signed2 = await signCredential(vc2, kpW, documentLoader);
  const signed3 = await signCredential(vc3, kpG, documentLoader);
  const signed4 = await signCredential(vc4, kpV, documentLoader);

  function writeVc(rel, obj) {
    const full = join(PUBLIC, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, JSON.stringify(obj, null, 2) + "\n", "utf8");
  }

  writeVc(
    "credentials/wienerberger/porotherm-25-nf/product-declaration.json",
    signed1,
  );
  writeVc("credentials/wienerberger/porotherm-25-nf/epd.json", signed2);
  writeVc(
    "credentials/wienerberger/porotherm-25-nf/verification.json",
    signed3,
  );
  writeVc(
    "credentials/bouwwerken-vandevelde/sint-andries-2026/porotherm-25-nf-batch-001.json",
    signed4,
  );

  console.log("Wrote signed DID documents and VCs under public/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
