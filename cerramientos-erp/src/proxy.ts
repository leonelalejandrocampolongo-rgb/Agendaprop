import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  // Toda la app es privada salvo el login, la API de Auth.js y los estáticos.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
