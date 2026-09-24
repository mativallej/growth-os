import type { NextConfig } from "next";

// El dashboard lee los .md de los vaults con fs en build/RSC. Sin API ni DB.
// Las fuentes se declaran en src/lib/sources.ts sobre config/sources.json; si
// una raíz falta, el build rompe (regla dura 1). GROWTH_SOURCES recorta cuáles
// entran.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
