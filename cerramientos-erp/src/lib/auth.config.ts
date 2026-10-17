import type { NextAuthConfig } from "next-auth";

// Config apta para Edge: sin providers ni código exclusivo de Node (fs,
// bcrypt), para poder importarla desde el proxy.
export const authConfig = {
  // Necesario detrás de un proxy que termina el HTTPS (Railway, Render, etc.):
  // sin esto, Auth.js rechaza las peticiones por venir con un host "no confiable".
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      if (request.nextUrl.pathname === "/login") return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
