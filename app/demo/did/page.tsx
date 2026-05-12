import type { Metadata } from "next";
import { DemoDidClient } from "./DemoDidClient";

export const metadata: Metadata = {
  title: "DID + VC demo | Tabulas",
  description:
    "Scroll-driven demo: Wienerberger Porotherm 25 N+F with did:web identity and signed Verifiable Credentials.",
};

export default function DemoDidPage() {
  return <DemoDidClient />;
}
