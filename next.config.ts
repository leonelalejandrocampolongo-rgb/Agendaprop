import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el servidor de desarrollo (npm run dev) desde otros
  // dispositivos de la misma red local (celular, tablet, etc.), no solo
  // desde localhost. Solo afecta a `next dev`, no a producción.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
