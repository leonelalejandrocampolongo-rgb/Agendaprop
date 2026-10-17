import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esta app vive dentro de otro repo: sin esto Next toma la carpeta de
  // arriba como raíz del proyecto (por su package-lock.json).
  turbopack: {
    root: path.join(__dirname),
  },
  // Permite abrir el servidor de desarrollo (npm run dev) desde el celular
  // u otros dispositivos de la misma red local. Solo afecta a `next dev`.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
