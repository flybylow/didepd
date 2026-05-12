import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: "https://didepd.vercel.app",
  images: { unoptimized: true },
  reactCompiler: true,
  transpilePackages: [
    "@digitalbazaar/vc",
    "@digitalbazaar/data-integrity",
    "@digitalbazaar/eddsa-2022-cryptosuite",
    "@digitalbazaar/ed25519-multikey",
    "@digitalbazaar/credentials-context",
    "jsonld-signatures",
    "jsonld",
  ],
};

export default nextConfig;