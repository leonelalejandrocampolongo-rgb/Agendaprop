import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no providers or Node.js-only code here (no fs/bcrypt),
// so this can be imported from middleware, which runs on the Edge Runtime.
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isOnAdmin = request.nextUrl.pathname.startsWith("/admin");
      const isOnLogin = request.nextUrl.pathname === "/admin/login";
      if (!isOnAdmin || isOnLogin) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
