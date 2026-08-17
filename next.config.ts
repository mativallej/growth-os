import type { NextConfig } from "next";

// El dashboard lee .md del vault (tegu-docs/Brand/Content) con fs en build/RSC.
// Sin API ni DB. En deploy, apuntar VAULT_CONTENT_DIR al contenido disponible.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
